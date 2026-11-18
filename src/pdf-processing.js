import { checkpoint, throwIfCancelled } from "./file-validation.js";
import { pageIndices } from "./page-indices.js";
import { pdfRenderer } from "./processing.js";
import {
  loadImage,
  draw,
  encodeCanvas,
  compressCanvasToTarget,
} from "./image-processing.js";

const pdfBlob = (bytes) => new Blob([bytes], { type: "application/pdf" });
const stem = (file) => file.name.replace(/\.[^.]+$/, "") || "document";

function numeric(values, key, min, max, fallback) {
  const value =
    values[key] === undefined || values[key] === ""
      ? fallback
      : Number(values[key]);
  if (!Number.isFinite(value) || value < min || value > max)
    throw Error(`Enter a valid ${key} between ${min} and ${max}.`);
  return value;
}

async function renderPage(doc, number, dpi, signal) {
  const page = await doc.getPage(number);
  const viewport = page.getViewport({ scale: dpi / 72 });
  if (
    viewport.width * viewport.height > 25000000 ||
    Math.max(viewport.width, viewport.height) > 12000
  )
    throw Error("This page is too large at this DPI. Lower the resolution.");
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  throwIfCancelled(signal);
  const task = page.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
    background: "#fff",
  });
  const abort = () => task.cancel();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    await task.promise;
    throwIfCancelled(signal);
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 1;
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    page.cleanup();
  }
}

// Only ordinary RGB/gray images are recompressed. Masks, custom color spaces,
// decode arrays and predictor streams stay intact so text and artwork survive.
async function recompressImages(input, dpi, quality, signal, onStatus) {
  const { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } =
    await import("pdf-lib");
  const pdf = await PDFDocument.load(input, { updateMetadata: false });
  let changed = 0;
  let seen = 0;
  for (const [ref, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const read = (key) => object.dict.lookup(PDFName.of(key));
    if (read("Subtype") !== PDFName.of("Image")) continue;
    seen++;
    if (
      read("SMask") ||
      read("Mask") ||
      read("ImageMask") ||
      read("Decode") ||
      read("DecodeParms")
    )
      continue;
    const space = read("ColorSpace");
    if (space !== PDFName.of("DeviceRGB") && space !== PDFName.of("DeviceGray"))
      continue;
    if (read("BitsPerComponent")?.asNumber?.() !== 8) continue;
    const width = read("Width")?.asNumber?.(),
      height = read("Height")?.asNumber?.();
    if (
      !width ||
      !height ||
      width * height > 25000000 ||
      Math.max(width, height) > 12000
    )
      continue;
    const filter = read("Filter");
    if (
      filter !== PDFName.of("DCTDecode") &&
      filter !== PDFName.of("FlateDecode")
    )
      continue;
    await checkpoint(signal);
    onStatus(
      `Optimizing embedded image ${seen} (keeping text and page layout)…`,
    );
    let canvas;
    try {
      if (filter === PDFName.of("DCTDecode")) {
        const image = await loadImage(
          new Blob([object.contents], { type: "image/jpeg" }),
        );
        const scale = Math.min(
          1,
          (dpi * 11.7) / Math.max(image.width, image.height),
        );
        canvas = draw(
          image,
          Math.max(1, Math.round(image.width * scale)),
          Math.max(1, Math.round(image.height * scale)),
        );
      } else {
        const pixels = decodePDFRawStream(object).decode();
        const channels = space === PDFName.of("DeviceRGB") ? 3 : 1;
        if (pixels.length !== width * height * channels) continue;
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        const rgba = context.createImageData(width, height);
        for (let i = 0; i < width * height; i++) {
          const offset = i * channels;
          rgba.data[i * 4] = pixels[offset];
          rgba.data[i * 4 + 1] = pixels[offset + (channels === 3 ? 1 : 0)];
          rgba.data[i * 4 + 2] = pixels[offset + (channels === 3 ? 2 : 0)];
          rgba.data[i * 4 + 3] = 255;
        }
        context.putImageData(rgba, 0, 0);
        const scale = Math.min(1, (dpi * 11.7) / Math.max(width, height));
        if (scale < 1) {
          const smaller = draw(
            canvas,
            Math.max(1, Math.round(width * scale)),
            Math.max(1, Math.round(height * scale)),
          );
          canvas.width = canvas.height = 1;
          canvas = smaller;
        }
      }
      const encoded = await encodeCanvas(canvas, "image/jpeg", quality);
      if (encoded.size >= object.contents.length) continue;
      const dict = object.dict.clone(pdf.context);
      dict.set(PDFName.of("Width"), pdf.context.obj(canvas.width));
      dict.set(PDFName.of("Height"), pdf.context.obj(canvas.height));
      dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      dict.set(PDFName.of("Length"), pdf.context.obj(encoded.size));
      pdf.context.assign(
        ref,
        PDFRawStream.of(dict, new Uint8Array(await encoded.arrayBuffer())),
      );
      changed++;
    } catch (error) {
      throwIfCancelled(signal);
      // Unsupported embedded image data is retained verbatim.
    } finally {
      if (canvas) canvas.width = canvas.height = 1;
    }
  }
  return { blob: pdfBlob(await pdf.save({ useObjectStreams: true })), changed };
}

async function containsText(doc, signal) {
  for (let n = 1; n <= doc.numPages; n++) {
    await checkpoint(signal);
    const page = await doc.getPage(n);
    try {
      const content = await page.getTextContent();
      if (content.items.some((item) => item.str?.trim())) return true;
    } finally {
      page.cleanup();
    }
  }
  return false;
}

async function rasterPdf(doc, dpi, quality, signal, onStatus) {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    await checkpoint(signal);
    onStatus(`Compressing scanned page ${i} of ${doc.numPages}…`);
    const page = await doc.getPage(i),
      view = page.getViewport({ scale: 1 });
    const canvas = await renderPage(doc, i, dpi, signal);
    try {
      const encoded = await encodeCanvas(canvas, "image/jpeg", quality);
      const image = await out.embedJpg(await encoded.arrayBuffer());
      out
        .addPage([view.width, view.height])
        .drawImage(image, {
          x: 0,
          y: 0,
          width: view.width,
          height: view.height,
        });
    } finally {
      canvas.width = canvas.height = 1;
    }
  }
  return pdfBlob(await out.save());
}

async function compressPdf(file, values, { signal, onStatus, onOutput }) {
  const target = numeric(values, "target", 0, 100000, 0);
  const limit = target ? Math.floor(target * 1000 * 0.97) : 0;
  if (limit && file.size <= limit)
    return {
      skipped: true,
      message: "Your PDF is already small — it is below the selected target.",
    };
  const startDpi = numeric(values, "dpi", 36, 200, 110);
  const startQuality = numeric(values, "quality", 1, 100, 65) / 100;
  const input = new Uint8Array(await file.arrayBuffer());
  let best = null;
  const attempts = target
    ? [
        [180, 0.88],
        [140, 0.72],
        [110, 0.55],
        [80, 0.38],
        [60, 0.25],
        [36, 0.15],
      ]
    : [[startDpi, startQuality]];
  for (const [dpi, quality] of attempts) {
    const candidate = await recompressImages(
      input,
      dpi,
      quality,
      signal,
      onStatus,
    );
    if (!best || candidate.blob.size < best.size) best = candidate.blob;
    if (limit && best.size <= limit) break;
  }
  let textPreserved = true;
  // Rasterization is only a fallback for image-only documents; real text is
  // never flattened just to reach a size promise.
  if ((!limit && best.size >= file.size) || (limit && best.size > limit)) {
    const doc = await pdfRenderer(file, signal);
    try {
      const hasText = await containsText(doc, signal);
      if (!hasText) {
        textPreserved = false;
        for (const [dpi, quality] of attempts) {
          const candidate = await rasterPdf(
            doc,
            dpi,
            quality,
            signal,
            onStatus,
          );
          if (candidate.size < best.size) best = candidate;
          if (limit && best.size <= limit) break;
        }
      }
    } finally {
      await doc.destroy();
    }
  }
  throwIfCancelled(signal);
  if (best.size >= file.size)
    return {
      skipped: true,
      message:
        "Your PDF is already small. No smaller version was produced; keep the original.",
    };
  const warnings =
    limit && best.size > limit
      ? [
          `The smallest result is ${(best.size / 1000).toFixed(1)} KB, above the ${target} KB target.${textPreserved ? " Text and page layout were preserved." : " Try fewer pages if your upload limit is strict."}`,
        ]
      : [];
  onOutput(best, `${stem(file)}_compressed.pdf`, { warnings });
  return {
    warnings,
    message:
      warnings[0] ||
      "Done! Download the smaller PDF and check it before submitting.",
  };
}

async function imagesToPdf(files, values, signal, onStatus) {
  const { PDFDocument } = await import("pdf-lib");
  const quality = numeric(values, "quality", 1, 100, 92) / 100;
  const target = numeric(values, "target", 0, 100000, 0);
  const limit = target ? Math.floor(target * 1000 * 0.97) : 0;
  const margin = (numeric(values, "margin", 0, 50, 8.5) * 72) / 25.4;
  const attempts = target
    ? [
        [1, quality],
        [1, Math.min(quality, 0.72)],
        [0.8, Math.min(quality, 0.5)],
        [0.6, Math.min(quality, 0.32)],
        [0.4, Math.min(quality, 0.2)],
      ]
    : [[1, quality]];
  let best;
  for (const [scale, q] of attempts) {
    const pdf = await PDFDocument.create();
    for (const [index, file] of files.entries()) {
      await checkpoint(signal);
      onStatus(`Converting image ${index + 1} of ${files.length}…`);
      const original = await loadImage(file);
      const canvas = draw(
        original,
        Math.max(1, Math.round(original.width * scale)),
        Math.max(1, Math.round(original.height * scale)),
      );
      try {
        const encoded = await encodeCanvas(canvas, "image/jpeg", q);
        const image = await pdf.embedJpg(await encoded.arrayBuffer());
        let dims =
          values.pageSize === "fit"
            ? [
                original.width * 0.75 + 2 * margin,
                original.height * 0.75 + 2 * margin,
              ]
            : values.pageSize === "letter"
              ? [612, 792]
              : [595.28, 841.89];
        const landscape =
          values.orientation === "landscape" ||
          (values.orientation === "auto" && original.width > original.height);
        if (
          (landscape && dims[0] < dims[1]) ||
          (values.orientation === "portrait" && dims[0] > dims[1])
        )
          dims.reverse();
        const factor = Math.min(
          (dims[0] - 2 * margin) / image.width,
          (dims[1] - 2 * margin) / image.height,
        );
        if (factor <= 0)
          throw Error(
            "The margins leave no room for this image. Choose a smaller margin.",
          );
        pdf
          .addPage(dims)
          .drawImage(image, {
            x: (dims[0] - image.width * factor) / 2,
            y: (dims[1] - image.height * factor) / 2,
            width: image.width * factor,
            height: image.height * factor,
          });
      } finally {
        canvas.width = canvas.height = 1;
      }
    }
    const candidate = pdfBlob(await pdf.save());
    if (!best || candidate.size < best.size) best = candidate;
    if (limit && best.size <= limit) break;
  }
  return {
    blob: best,
    warnings:
      limit && best.size > limit
        ? [
            `The result is ${(best.size / 1000).toFixed(1)} KB, above the ${target} KB target. Try fewer images or a larger limit.`,
          ]
        : [],
  };
}

// Normalize an image once at upload time so merged image pages use the same
// previews, reordering and PDF export path as the other source documents.
export async function imageFileToPdf(file, signal) {
  const { blob } = await imagesToPdf(
    [file],
    { pageSize: "a4", orientation: "auto", quality: "92", margin: "8.5" },
    signal,
    () => {},
  );
  throwIfCancelled(signal);
  return new File([blob], `${stem(file)}.pdf`, {
    type: "application/pdf",
    lastModified: file.lastModified,
  });
}

export async function processPdf(
  id,
  files,
  values,
  { onOutput, order = [], onStatus = () => {}, signal },
) {
  const status = (text) => {
    throwIfCancelled(signal);
    onStatus(text);
  };
  const output = (...args) => {
    throwIfCancelled(signal);
    onOutput(...args);
  };
  await checkpoint(signal);
  if (id === "compress-pdf")
    return compressPdf(files[0], values, {
      signal,
      onStatus: status,
      onOutput: output,
    });
  if (id === "pdf-to-image") {
    const dpi = numeric(values, "dpi", 36, 300, 150);
    const target = numeric(values, "target", 0, 25000, 0);
    const doc = await pdfRenderer(files[0], signal);
    try {
      const selected = pageIndices(values.pages, doc.numPages);
      let total = 0;
      for (const [completed, index] of selected.entries()) {
        status(
          `Rendering page ${completed + 1} of ${selected.length} (source page ${index + 1})…`,
        );
        const canvas = await renderPage(doc, index + 1, dpi, signal);
        try {
          const encoded = target
            ? await compressCanvasToTarget(canvas, target, {
                type: values.format,
                signal,
                maxQuality: 0.94,
              })
            : await encodeCanvas(canvas, values.format);
          total += encoded.size;
          if (total > 150 * 1048576)
            throw Error(
              "Output is too large. Download the available pages, then process a smaller range.",
            );
          output(
            encoded,
            `${stem(files[0])}_page-${index + 1}.${encoded.type === "image/png" ? "png" : encoded.type === "image/webp" ? "webp" : "jpg"}`,
          );
        } finally {
          canvas.width = canvas.height = 1;
        }
      }
    } finally {
      await doc.destroy();
    }
    return {};
  }
  if (id === "jpg-to-pdf") {
    const result = await imagesToPdf(files, values, signal, status);
    output(result.blob, `${stem(files[0])}_images.pdf`, {
      warnings: result.warnings,
    });
    return { warnings: result.warnings, message: result.warnings[0] };
  }
  const { PDFDocument, degrees } = await import("pdf-lib");
  const out = await PDFDocument.create();
  if (id === "merge-pdf" || id === "pdf-workbench") {
    if (id === "merge-pdf" && files.length < 2)
      throw Error("Choose at least two PDFs to merge.");
    const docs = new Map();
    let pageCount = 0;
    for (const file of files) {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      pageCount += doc.getPageCount();
      if (pageCount > 300)
        throw Error("Please use at most 300 pages in total.");
      docs.set(file, doc);
    }
    if (!order.length) throw Error("Wait for page previews before merging.");
    for (const [completed, { file, index, rotation = 0 }] of order.entries()) {
      status(`Merging page ${completed + 1} of ${order.length}…`);
      await checkpoint(signal);
      const [page] = await out.copyPages(docs.get(file), [index]);
      if (id === "pdf-workbench")
        page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
      out.addPage(page);
    }
    output(pdfBlob(await out.save()), `${stem(files[0])}_merged.pdf`);
    return {};
  }
  const source = await PDFDocument.load(await files[0].arrayBuffer());
  if (source.getPageCount() > 300)
    throw Error("Please use at most 300 pages in total.");
  const indices = pageIndices(values.pages, source.getPageCount());
  if (
    id === "split-pdf" &&
    (values.mode === "each" || values.mode === "every")
  ) {
    const group =
      values.mode === "each" ? 1 : numeric(values, "every", 1, 300, 2);
    if (!Number.isInteger(group))
      throw Error("Enter a whole number of pages per file.");
    for (let offset = 0; offset < indices.length; offset += group) {
      await checkpoint(signal);
      const slice = indices.slice(offset, offset + group);
      status(`Extracting part ${Math.floor(offset / group) + 1}…`);
      const part = await PDFDocument.create();
      for (const page of await part.copyPages(source, slice))
        part.addPage(page);
      output(
        pdfBlob(await part.save()),
        `${stem(files[0])}_${group === 1 ? `page-${slice[0] + 1}` : `part-${Math.floor(offset / group) + 1}`}.pdf`,
      );
    }
    return {};
  }
  status(`Copying ${indices.length} selected pages…`);
  await checkpoint(signal);
  const pages = await out.copyPages(source, indices);
  pages.forEach((page, index) => {
    if (id === "organize-pdf") {
      const rotation =
        Number(values.rotation || 0) +
        Number(values.pageRotations?.[indices[index]] || 0);
      if (!Number.isFinite(rotation) || rotation % 90 !== 0)
        throw Error("Page rotations must be multiples of 90°.");
      page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
    }
    out.addPage(page);
  });
  output(pdfBlob(await out.save()), `${stem(files[0])}_${id}.pdf`);
  return {};
}
