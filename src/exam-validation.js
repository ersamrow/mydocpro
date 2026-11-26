import { formatExamFileRange } from "./exam-requirements.js";

// Compares a file you already have with one document preset from exams.js.
// Statuses: "pass", "warn" (advisory or borderline) and "fail" (will be refused).
const NEAR = 0.03;

const KINDS = {
  jpeg: { name: "JPG", format: "JPG" },
  png: { name: "PNG", format: "PNG" },
  webp: { name: "WebP", format: "WEBP" },
  pdf: { name: "PDF", format: "PDF" },
};

export function sniffKind(bytes) {
  const text = (from, to) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (bytes[0] === 137 && text(1, 4) === "PNG") return "png";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "webp";
  if (text(0, 1024).includes("%PDF-")) return "pdf";
  return null;
}

// Pixel density stored in the file, in dots per inch, or null.
export function readDensity(bytes, kind) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (kind === "jpeg") {
    let offset = 2;
    while (offset + 4 < bytes.length && bytes[offset] === 255) {
      const marker = bytes[offset + 1],
        length = view.getUint16(offset + 2);
      if (marker === 224 && length >= 16) {
        const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 9));
        if (id === "JFIF\0") {
          const units = bytes[offset + 11],
            x = view.getUint16(offset + 12);
          if (units === 1 && x > 1) return x;
          if (units === 2 && x > 1) return Math.round(x * 2.54);
        }
      }
      if (marker === 218) break;
      offset += 2 + length;
    }
  } else if (kind === "png") {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset),
        name = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (name === "pHYs" && bytes[offset + 16] === 1)
        return Math.round(view.getUint32(offset + 8) * 0.0254);
      if (name === "IDAT") break;
      offset += 12 + length;
    }
  }
  return null;
}

export async function inspectForExam(file) {
  if (!file.size) throw Error("This file is empty.");
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const kind = sniffKind(head);
  const info = { kind, size: file.size, name: file.name };
  if (kind && kind !== "pdf") {
    info.dpi = readDensity(head, kind);
    try {
      const bitmap = await createImageBitmap(file);
      info.width = bitmap.width;
      info.height = bitmap.height;
      bitmap.close?.();
    } catch {
      throw Error("This image is damaged or cannot be opened.");
    }
  }
  return info;
}

const item = (id, status, label, detail) => ({ id, status, label, detail });

export function checkDocument(doc, info) {
  const checks = [];
  const wanted = doc.format === "PDF" ? "pdf" : "jpeg";
  const wantedName = KINDS[wanted].name;
  const actual = info.kind ? KINDS[info.kind].name : "unknown type";
  checks.push(
    info.kind === wanted
      ? item("format", "pass", "File type", `${wantedName}, as required.`)
      : item(
          "format",
          "fail",
          "File type",
          `This file is ${actual === "unknown type" ? "not a supported file" : "a " + actual}. This field needs a ${wantedName}.`,
        ),
  );
  const kb = info.size / 1024;
  const { minKB, maxKB, maxExclusive } = doc;
  const expected = formatExamFileRange(doc);
  const shown = `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  if (minKB != null || maxKB != null) {
    const tooSmall = minKB != null && kb < minKB,
      tooBig =
        maxKB != null && (maxExclusive ? kb >= maxKB : kb > maxKB);
    const close =
      (minKB != null && kb < minKB * (1 + NEAR)) ||
      (maxKB != null && kb > maxKB * (1 - NEAR));
    checks.push(
      tooSmall
        ? item("size", "fail", "File size", `${shown} is too small. Allowed: ${expected}.`)
        : tooBig
          ? item("size", "fail", "File size", `${shown} is too large. Allowed: ${expected}.`)
          : close
            ? item(
                "size",
                "warn",
                "File size",
                `${shown} is very close to the limit (${expected}). Portals may count KB differently; leave some margin.`,
              )
            : item("size", "pass", "File size", `${shown} is within ${expected}.`),
    );
  }
  if (info.width) {
    const { width: w, height: h } = info;
    const advisory = Boolean(doc.dimensionsNote);
    const miss = advisory ? "warn" : "fail";
    const problems = [];
    if (doc.widthPx && doc.heightPx && (w !== doc.widthPx || h !== doc.heightPx))
      problems.push(`should be ${doc.widthPx} × ${doc.heightPx} px`);
    if (doc.minWidthPx && w < doc.minWidthPx)
      problems.push(`width should be at least ${doc.minWidthPx} px`);
    if (doc.minHeightPx && h < doc.minHeightPx)
      problems.push(`height should be at least ${doc.minHeightPx} px`);
    if (doc.maxWidthPx && w > doc.maxWidthPx)
      problems.push(`width should be at most ${doc.maxWidthPx} px`);
    if (doc.maxHeightPx && h > doc.maxHeightPx)
      problems.push(`height should be at most ${doc.maxHeightPx} px`);
    const constrained =
      (doc.widthPx && doc.heightPx) ||
      doc.minWidthPx ||
      doc.minHeightPx ||
      doc.maxWidthPx ||
      doc.maxHeightPx;
    if (constrained)
      checks.push(
        problems.length
          ? item(
              "dimensions",
              miss,
              "Dimensions",
              `${w} × ${h} px: ${problems.join("; ")}.${advisory ? " The notice gives this as a preferred size." : ""}`,
            )
          : item("dimensions", "pass", "Dimensions", `${w} × ${h} px meets the stated size.`),
      );
    if (doc.dpi)
      checks.push(
        info.dpi == null
          ? item(
              "dpi",
              "warn",
              "Resolution",
              `No DPI is stored in the file. The notice mentions ${doc.dpi} dpi; some portals only check size.`,
            )
          : info.dpi < doc.dpi
            ? item(
                "dpi",
                "warn",
                "Resolution",
                `${info.dpi} dpi is below the ${doc.dpi} dpi in the notice.`,
              )
            : item("dpi", "pass", "Resolution", `${info.dpi} dpi.`),
      );
  }
  return checks;
}

export function verdict(checks) {
  if (checks.some((check) => check.status === "fail")) return "fail";
  return checks.some((check) => check.status === "warn") ? "warn" : "pass";
}
