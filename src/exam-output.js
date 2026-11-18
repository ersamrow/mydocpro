import {
  compress,
  draw,
  encodeCanvas,
  loadImage,
  pdfRenderer,
  whitenPaper,
} from "./processing.js";
import { inspectFiles, throwIfCancelled } from "./file-validation.js";
import { validateFiles } from "./tool-settings.js";

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
    const limit = doc.maxKB == null ? Infinity : doc.maxKB * 1024;
    const fits = doc.maxExclusive ? file.size < limit : file.size <= limit;
    return { bytes: file.size, pages: pdf.numPages, fits };
  } finally {
    await pdf.destroy();
  }
}

// The JFIF header records output density. The quality of the original paper
// scan still needs to be checked by its owner.
async function setJpegDensity(blob, pixelsPerInch) {
  const header = new Uint8Array(await blob.slice(0, 18).arrayBuffer());
  if (header[0] !== 255 || header[1] !== 216)
    throw Error("Could not encode a JPG.");
  const hasJfif =
    header[2] === 255 &&
    header[3] === 224 &&
    String.fromCharCode(...header.slice(6, 11)) === "JFIF\0";
  const density = Uint8Array.of(
    1,
    pixelsPerInch >> 8,
    pixelsPerInch & 255,
    pixelsPerInch >> 8,
    pixelsPerInch & 255,
  );
  if (hasJfif) {
    return new Blob([blob.slice(0, 13), density, blob.slice(18)], {
      type: "image/jpeg",
    });
  }
  const marker = Uint8Array.of(
    255,
    224,
    0,
    16,
    74,
    70,
    73,
    70,
    0,
    1,
    1,
    ...density,
    0,
    0,
  );
  return new Blob([blob.slice(0, 2), marker, blob.slice(2)], {
    type: "image/jpeg",
  });
}

export async function processExamDocument(
  file,
  doc,
  { fit = "contain", whitePaper = false } = {},
  signal,
) {
  throwIfCancelled(signal);
  const source = await loadImage(file);
  const frame = examFrame(doc, source.width, source.height);
  const rendered = draw(source, frame.width, frame.height, fit);
  if (whitePaper) whitenPaper(rendered, 225);
  let encoded = await encodeCanvas(rendered);
  if (doc.minKB && encoded.size < doc.minKB * 1024)
    encoded = await encodeCanvas(rendered, "image/jpeg", 1);
  const physical = !!(doc.widthMm && doc.heightMm);
  if (doc.maxKB && encoded.size > doc.maxKB * 1024) {
    const fixed = !!(doc.widthPx || doc.heightPx || physical);
    encoded = await compress(rendered, doc.maxKB, fixed, signal, 1);
  }
  // Release the drawing buffer before decoding the actual downloadable file.
  rendered.width = rendered.height = 1;
  if (doc.dpi) encoded = await setJpegDensity(encoded, doc.dpi);
  throwIfCancelled(signal);
  const image = await loadImage(encoded);
  const { width, height } = image;
  const issues = [];
  if (doc.minKB && encoded.size < doc.minKB * 1024)
    issues.push(
      `Below the ${doc.minKB} KB minimum even at full JPG quality. Choose a sharper original scan with more detail.`,
    );
  if (doc.maxKB && encoded.size > doc.maxKB * 1024)
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
  throwIfCancelled(signal);
  return { blob: encoded, width, height, issues };
}
