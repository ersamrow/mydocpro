function canvas(w, h) {
  w = Math.round(w);
  h = Math.round(h);
  if (w < 1 || h < 1 || w * h > 25000000 || w > 12000 || h > 12000)
    throw Error(
      "Output dimensions are too large or too small. Use at most 25 megapixels and 12,000 pixels per side.",
    );
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
const blob = (c, type = "image/jpeg", q = 0.92) =>
  new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(Error("This browser could not encode the image.")),
      type,
      q,
    ),
  );
async function loadImage(f) {
  const url = URL.createObjectURL(f);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    if (im.width * im.height > 50000000)
      throw Error("Please use an image under 50 megapixels.");
    return im;
  } finally {
    URL.revokeObjectURL(url);
  }
}
function draw(im, w = im.width, h = im.height, fit = "contain") {
  const c = canvas(w, h),
    x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  if (fit === "stretch") x.drawImage(im, 0, 0, c.width, c.height);
  else {
    const s = Math[fit === "cover" ? "max" : "min"](
      c.width / im.width,
      c.height / im.height,
    );
    x.drawImage(
      im,
      (c.width - im.width * s) / 2,
      (c.height - im.height * s) / 2,
      im.width * s,
      im.height * s,
    );
  }
  return c;
}
async function compress(c, kb, preserveDimensions = false) {
  const max = kb * 1024;
  for (let attempt = 0; attempt < 24; attempt++) {
    let low = 0.03,
      high = 0.98,
      best = null;
    for (let i = 0; i < 11; i++) {
      const q = (low + high) / 2,
        b = await blob(c, "image/jpeg", q);
      if (b.size <= max) {
        best = b;
        low = q;
      } else high = q;
    }
    if (best) return best;
    if (preserveDimensions)
      throw Error(
        "Cannot reach this file size at the requested dimensions. Increase the size limit or lower the DPI.",
      );
    c = draw(c, Math.max(1, c.width * 0.85), Math.max(1, c.height * 0.85));
  }
  throw Error("Cannot reach the requested size. Try a larger limit.");
}
export function pageIndices(spec, count) {
  if (spec.trim().toLowerCase() === "all")
    return Array.from({ length: count }, (_, i) => i);
  const result = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw Error("Use page numbers like 1-3, 5, 8.");
    const start = +m[1],
      end = +(m[2] || m[1]);
    if (start < 1 || end > count || end < start)
      throw Error(`Page range must be between 1 and ${count}.`);
    for (let i = start; i <= end; i++) result.push(i - 1);
  }
  if (result.length > 300) throw Error("Select at most 300 pages.");
  return result;
}
export async function pdfRenderer(f) {
  const pdfjs = await import("pdfjs-dist");
  const worker = "/pdf.worker.min.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({
    data: await f.arrayBuffer(),
    isEvalSupported: false,
  }).promise;
  if (doc.numPages > 300) {
    await doc.destroy();
    throw Error("Please use PDFs with at most 300 pages.");
  }
  return doc;
}
async function renderPage(doc, n, dpi) {
  const page = await doc.getPage(n),
    view = page.getViewport({ scale: dpi / 72 }),
    c = canvas(view.width, view.height);
  await page.render({
    canvasContext: c.getContext("2d"),
    viewport: view,
    background: "#ffffff",
  }).promise;
  page.cleanup();
  return c;
}
export async function processImage(id, files, values, preview = false) {
  const val = (id) => values[id];
  const num = (id, min, max) => {
    const n = Number(val(id));
    if (!Number.isFinite(n) || n < min || n > max)
      throw Error(`Enter a valid ${id} between ${min} and ${max}.`);
    return n;
  };
  const im = await loadImage(files[0]);
  let c, b;
  const type = val("format") || "image/jpeg";
  if (id === "compress-image") {
    const w = Math.min(im.width, num("maxWidth", 1, 10000));
    c = draw(im, w, (im.height * w) / im.width);
    if (!preview) b = await compress(c, num("target", 1, 25000));
  } else if (id === "resize-image") {
    const dpi = num("dpi", 1, 1200),
      factor = { px: 1, cm: dpi / 2.54, mm: dpi / 25.4, in: dpi }[val("unit")];
    c = draw(
      im,
      num("width", 0.1, 12000) * factor,
      num("height", 0.1, 12000) * factor,
      val("fit"),
    );
  } else if (id === "exam-photo") {
    let [w, h] = val("preset").split(",").map(Number);
    if (w === 51) w = h = 50.8;
    const dpi = num("dpi", 72, 600);
    c = draw(im, (w * dpi) / 25.4, (h * dpi) / 25.4, "cover");
    if (!preview) b = await compress(c, num("target", 1, 25000), true);
  } else if (id === "crop-image") {
    const rotation = +val("rotation"),
      swap = rotation % 180 !== 0;
    const rotated = canvas(
        swap ? im.height : im.width,
        swap ? im.width : im.height,
      ),
      ctx = rotated.getContext("2d");
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(im, -im.width / 2, -im.height / 2);
    const ratio = ["original", "free"].includes(val("ratio"))
      ? rotated.width / rotated.height
      : +val("ratio");
    let w = rotated.width,
      h = w / ratio;
    if (h > rotated.height) {
      h = rotated.height;
      w = h * ratio;
    }
    const zoom = num("zoom", 100, 500) / 100;
    w /= zoom;
    h /= zoom;
    let sx = (rotated.width - w) / 2,
      sy = (rotated.height - h) / 2;
    if (Number(val("crop-w")) > 0 && Number(val("crop-h")) > 0) {
      sx = Number(val("crop-x")) * rotated.width;
      sy = Number(val("crop-y")) * rotated.height;
      w = Number(val("crop-w")) * rotated.width;
      h = Number(val("crop-h")) * rotated.height;
    }
    c = canvas(w, h);
    c.getContext("2d").fillStyle = "#fff";
    c.getContext("2d").fillRect(0, 0, c.width, c.height);
    c.getContext("2d").drawImage(
      rotated,
      sx,
      sy,
      w,
      h,
      0,
      0,
      c.width,
      c.height,
    );
  } else if (id === "signature" || id === "white-background") {
    c = draw(im);
    const x = c.getContext("2d"),
      pixels = x.getImageData(0, 0, c.width, c.height),
      threshold = num("threshold", 0, 255);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const light =
        0.299 * pixels.data[i] +
        0.587 * pixels.data[i + 1] +
        0.114 * pixels.data[i + 2];
      if (light >= threshold)
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      else if (id === "signature")
        pixels.data[i] =
          pixels.data[i + 1] =
          pixels.data[i + 2] =
            Math.max(0, light * 0.5);
    }
    x.putImageData(pixels, 0, 0);
  } else if (id === "passport-sheet") {
    c = canvas(1200, 1800);
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, 1200, 1800);
    const n = +val("copies"),
      pw = 413,
      ph = 531,
      cols = 2,
      rows = Math.ceil(n / cols),
      gap = 25;
    const photo = draw(im, pw, ph, "cover");
    for (let i = 0; i < n; i++) {
      const scale = Math.min(1, (1800 - 100 - (rows - 1) * gap) / (rows * ph));
      const w = pw * scale,
        h = ph * scale;
      x.drawImage(
        photo,
        (1200 - 2 * w - gap) / 2 + (i % 2) * (w + gap),
        (1800 - rows * h - (rows - 1) * gap) / 2 +
          Math.floor(i / 2) * (h + gap),
        w,
        h,
      );
    }
  } else if (id === "name-date") {
    if (!val("name").trim()) throw Error("Enter a name for the text strip.");
    const w = Math.max(im.width, 600),
      h = (im.height * w) / im.width,
      strip = Math.round(w * 0.16);
    c = canvas(w, h + strip);
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0, w, h);
    x.fillStyle = "#171717";
    x.textAlign = "center";
    x.font = `${Math.round(w * 0.045)}px sans-serif`;
    x.fillText(val("name").trim(), w / 2, h + strip * 0.42, w * 0.9);
    x.font = `${Math.round(w * 0.032)}px sans-serif`;
    x.fillText(val("date"), w / 2, h + strip * 0.78, w * 0.9);
  } else if (id === "join-images") {
    if (files.length !== 2)
      throw Error("Choose exactly two images: photo and signature.");
    const second = await loadImage(files[1]);
    const vertical = val("layout") === "vertical";
    if (vertical) {
      const w = Math.min(Math.max(im.width, second.width), 2000),
        h1 = (im.height * w) / im.width,
        h2 = (second.height * w) / second.width;
      c = canvas(w, h1 + h2);
      const x = c.getContext("2d");
      x.fillStyle = "white";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, w, h1);
      x.drawImage(second, 0, h1, w, h2);
    } else {
      const h = Math.min(Math.max(im.height, second.height), 2000),
        w1 = (im.width * h) / im.height,
        w2 = (second.width * h) / second.height;
      c = canvas(w1 + w2, h);
      const x = c.getContext("2d");
      x.fillStyle = "white";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, w1, h);
      x.drawImage(second, w1, 0, w2, h);
    }
  } else c = draw(im);
  b =
    b ||
    (await blob(
      c,
      type,
      id === "convert-image" ? num("quality", 1, 100) / 100 : 0.94,
    ));
  return b;
}
export async function processPdf(
  id,
  files,
  values,
  { onOutput, order = [], onStatus = () => {} },
) {
  const val = (id) => values[id];
  const num = (id, min, max) => {
    const n = Number(val(id));
    if (!Number.isFinite(n) || n < min || n > max)
      throw Error(
        "Enter a valid " + id + " between " + min + " and " + max + ".",
      );
    return n;
  };
  const setStatus = onStatus;
  const output = onOutput;
  if (id === "pdf-to-image" || id === "compress-pdf") {
    const dpi = num("dpi", 36, id === "compress-pdf" ? 200 : 300),
      doc = await pdfRenderer(files[0]);
    try {
      if (id === "pdf-to-image") {
        const selected = pageIndices(val("pages"), doc.numPages);
        let total = 0;
        for (const i of selected) {
          setStatus(`Rendering page ${i + 1} of ${doc.numPages}…`);
          const c = await renderPage(doc, i + 1, dpi),
            b = await blob(c, val("format"));
          total += b.size;
          if (total > 150 * 1048576)
            throw Error(
              "Output is too large. Download the available pages, then process a smaller range.",
            );
          output(
            b,
            `page-${i + 1}.${b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg"}`,
          );
          c.width = c.height = 1;
        }
      } else {
        const { PDFDocument } = await import("pdf-lib"),
          out = await PDFDocument.create(),
          quality = num("quality", 1, 100) / 100;
        for (let i = 1; i <= doc.numPages; i++) {
          setStatus(`Compressing page ${i} of ${doc.numPages}…`);
          const page = await doc.getPage(i),
            view = page.getViewport({ scale: 1 }),
            c = await renderPage(doc, i, dpi),
            b = await blob(c, "image/jpeg", quality),
            img = await out.embedJpg(await b.arrayBuffer());
          out
            .addPage([view.width, view.height])
            .drawImage(img, {
              x: 0,
              y: 0,
              width: view.width,
              height: view.height,
            });
          c.width = c.height = 1;
        }
        const b = new Blob([await out.save()], { type: "application/pdf" });
        output(b, "mydocpro-compressed.pdf");
        if (b.size >= files[0].size) {
          onStatus(
            "This PDF did not get smaller. Keep your original, or try a lower resolution and quality.",
          );
        }
      }
    } finally {
      await doc.destroy();
    }
    return;
  }
  const { PDFDocument, degrees } = await import("pdf-lib"),
    out = await PDFDocument.create();
  if (id === "merge-pdf") {
    if (files.length < 2) throw Error("Choose at least two PDFs to merge.");
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
    for (const { file, index } of order) {
      const [page] = await out.copyPages(docs.get(file), [index]);
      out.addPage(page);
    }
    output(
      new Blob([await out.save()], { type: "application/pdf" }),
      "mydocpro-merge-pdf.pdf",
    );
    return;
  }
  if (id === "jpg-to-pdf") {
    for (const f of files) {
      const im = await loadImage(f),
        c = draw(im),
        b = await blob(c),
        img = await out.embedJpg(await b.arrayBuffer());
      let dims =
        val("pageSize") === "fit"
          ? [im.width * 0.75, im.height * 0.75]
          : val("pageSize") === "letter"
            ? [612, 792]
            : [595.28, 841.89];
      if (val("orientation") === "landscape" && dims[1] > dims[0])
        dims.reverse();
      const p = out.addPage(dims),
        margin = val("pageSize") === "fit" ? 0 : 24,
        s = Math.min(
          (dims[0] - 2 * margin) / img.width,
          (dims[1] - 2 * margin) / img.height,
        );
      p.drawImage(img, {
        x: (dims[0] - img.width * s) / 2,
        y: (dims[1] - img.height * s) / 2,
        width: img.width * s,
        height: img.height * s,
      });
      c.width = c.height = 1;
    }
  } else {
    let total = 0;
    if (id === "merge-pdf" && files.length < 2)
      throw Error("Choose at least two PDFs to merge.");
    for (const f of files) {
      const src = await PDFDocument.load(await f.arrayBuffer());
      total += src.getPageCount();
      if (total > 300) throw Error("Please use at most 300 pages in total.");
      const indices =
        id === "merge-pdf"
          ? src.getPageIndices()
          : pageIndices(val("pages"), src.getPageCount());
      if (id === "split-pdf" && val("mode") === "each") {
        for (const i of indices) {
          const part = await PDFDocument.create();
          const [p] = await part.copyPages(src, [i]);
          part.addPage(p);
          output(
            new Blob([await part.save()], { type: "application/pdf" }),
            `page-${i + 1}.pdf`,
          );
        }
        return;
      }
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => {
        if (id === "organize-pdf")
          p.setRotation(
            degrees((p.getRotation().angle + Number(val("rotation"))) % 360),
          );
        out.addPage(p);
      });
    }
  }
  output(
    new Blob([await out.save()], { type: "application/pdf" }),
    `mydocpro-${id}.pdf`,
  );
}
