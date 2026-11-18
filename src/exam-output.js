import {
  compressCanvasToTarget,
  draw,
  encodeCanvas,
  loadImage,
  whitenPaper,
} from "./image-processing.js";
import { pdfRenderer } from "./processing.js";
import { inspectFiles, throwIfCancelled } from "./file-validation.js";
import { validateFiles } from "./tool-settings.js";
import {
  jpegSampling,
  padJpegToBytes,
  setImageDensity,
} from "./image-metadata.js";

const wideRange = (doc) => doc.minKB > 0 && doc.maxKB >= doc.minKB * 5;

export function examFrame(doc, width, height) {
  if (doc.widthPx && doc.heightPx)
    return { width: doc.widthPx, height: doc.heightPx };
  if (doc.widthMm && doc.heightMm && doc.dpi) {
    return {
      width: Math.round((doc.widthMm * doc.dpi) / 25.4),
      height: Math.round((doc.heightMm * doc.dpi) / 25.4),
    };
  }
  if (doc.cropAspect) {
    width = Math.min(width, height * doc.cropAspect);
    height = width / doc.cropAspect;
  }
  const scale = Math.min(
    Math.max(1, (doc.minWidthPx || 1) / width, (doc.minHeightPx || 1) / height),
    (doc.maxWidthPx || 12000) / width,
    (doc.maxHeightPx || 12000) / height,
    Math.sqrt(25000000 / (width * height)),
    wideRange(doc)
      ? Math.max(1200, doc.minWidthPx || 0, doc.minHeightPx || 0) /
          Math.max(width, height)
      : Infinity,
  );
  return {
    width:
      doc.widthPx || Math.max(doc.minWidthPx || 1, Math.round(width * scale)),
    height:
      doc.heightPx ||
      Math.max(doc.minHeightPx || 1, Math.round(height * scale)),
  };
}

export async function inspectExamInput(file) {
  validateFiles([file], [], { pdf: false, multi: false, replace: true });
  await inspectFiles([file], false);
}

export async function inspectCertificate(file, doc, signal) {
  validateFiles([file], [], { pdf: true, multi: false, replace: true });
  await inspectFiles([file], true);
  const pdf = await pdfRenderer(file, signal);
  try {
    const limit = doc.maxKB == null ? Infinity : doc.maxKB * 1000;
    const fits = doc.maxExclusive ? file.size < limit : file.size <= limit;
    return { bytes: file.size, pages: pdf.numPages, fits };
  } finally {
    await pdf.destroy();
  }
}

function borderBrightness(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const edges = [
    context.getImageData(0, 0, canvas.width, 1).data,
    context.getImageData(0, canvas.height - 1, canvas.width, 1).data,
    context.getImageData(0, 0, 1, canvas.height).data,
    context.getImageData(canvas.width - 1, 0, 1, canvas.height).data,
  ];
  let light = 0;
  let count = 0;
  for (const edge of edges)
    for (let i = 0; i < edge.length; i += 4) {
      light += 0.299 * edge[i] + 0.587 * edge[i + 1] + 0.114 * edge[i + 2];
      count++;
    }
  return light / count;
}

async function fullQualityJpeg(canvas, signal) {
  const native = await encodeCanvas(canvas, "image/jpeg", 1);
  if ((await jpegSampling(native)) === "4:4:4") return native;
  throwIfCancelled(signal);
  // Canvas has no portable sampling control. Only load the fallback encoder
  // when the browser's quality-100 output still subsamples chroma.
  const { default: encode } = await import("jpeg-js/lib/encoder.js");
  const pixels = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height);
  const result = encode(pixels, 100);
  throwIfCancelled(signal);
  return new Blob([result.data], { type: "image/jpeg" });
}

export async function processExamDocument(
  file,
  doc,
  { fit = "contain", whitePaper = doc.type !== "photo" } = {},
  signal,
) {
  throwIfCancelled(signal);
  const source = await loadImage(file);
  const frame = examFrame(doc, source.width, source.height);
  const rendered = draw(source, frame.width, frame.height, fit);
  if (whitePaper)
    whitenPaper(
      rendered,
      Math.max(135, Math.min(225, borderBrightness(rendered) - 16)),
    );
  let encoded = await encodeCanvas(rendered);
  const minimum = (doc.minKB || 0) * 1000;
  const maximum = doc.maxKB ? doc.maxKB * 1000 : Infinity;
  const safeMaximum = Math.max(minimum, Math.floor(maximum * 0.97));
  const target = Math.min(
    safeMaximum,
    Math.max(minimum, maximum * (wideRange(doc) ? 0.55 : 0.97)),
  );
  if (minimum && encoded.size < minimum)
    encoded = await fullQualityJpeg(rendered, signal);
  const physical = !!(doc.widthMm && doc.heightMm);
  if (encoded.size > target - 18) {
    const fixed = !!(doc.widthPx || doc.heightPx || physical);
    encoded = await compressCanvasToTarget(rendered, (target - 18) / 1000, {
      preserveDimensions: fixed,
      signal,
      maxQuality: 1,
      headroom: 1,
    });
  }
  // Release the drawing buffer before decoding the actual downloadable file.
  rendered.width = rendered.height = 1;
  if (doc.dpi) encoded = await setImageDensity(encoded, doc.dpi);
  let paddedBytes = 0;
  if (encoded.size < minimum) {
    const padded = await padJpegToBytes(
      encoded,
      Math.min(minimum + 1000, safeMaximum),
    );
    paddedBytes = padded.size - encoded.size;
    encoded = padded;
  }
  throwIfCancelled(signal);
  const image = await loadImage(encoded);
  const { width, height } = image;
  const issues = [];
  if (doc.minKB && encoded.size < minimum)
    issues.push(
      `Below the ${doc.minKB} KB minimum even at full JPG quality. Choose a sharper original scan with more detail.`,
    );
  if (doc.maxKB && encoded.size > safeMaximum)
    issues.push(`Above the ${doc.maxKB} KB limit. Try a tighter crop.`);
  if (
    (doc.widthPx && width !== doc.widthPx) ||
    (doc.heightPx && height !== doc.heightPx) ||
    (doc.minWidthPx && width < doc.minWidthPx) ||
    (doc.minHeightPx && height < doc.minHeightPx) ||
    (doc.maxWidthPx && width > doc.maxWidthPx) ||
    (doc.maxHeightPx && height > doc.maxHeightPx) ||
    (physical && (width !== frame.width || height !== frame.height))
  )
    issues.push(
      "The exported dimensions fall outside this preset. Choose a clearer scan with the requested proportions.",
    );
  if (encoded.type !== "image/jpeg")
    issues.push("This browser could not produce a JPG.");
  let backgroundAverage = null;
  if (doc.type !== "photo") {
    const check = draw(image);
    backgroundAverage = borderBrightness(check);
    check.width = check.height = 1;
    if (backgroundAverage < 235)
      issues.push(
        "The paper background is not near-white. Check for shadows, enable Whiten paper, or use a brighter scan before submitting.",
      );
  }
  throwIfCancelled(signal);
  return {
    blob: encoded,
    width,
    height,
    issues,
    paddedBytes,
    backgroundAverage,
  };
}
