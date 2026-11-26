import { checkpoint, throwIfCancelled } from "./file-validation.js";

// Items are stored in points on the page as it is DISPLAYED (top-left origin,
// y down, after the page's /Rotate). x/y/w/h describe the item's box.
//   text:      { type, page, x, y, size, text }       (w/h derived from size)
//   check:     { type, page, x, y, w, h }
//   signature: { type, page, x, y, w, h, png }        (png = data URL)
export const TEXT_LINE = 1.3;
export const BASELINE = 1.0;
const MAX_ITEMS = 200;

export function todayLabel(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Displayed point (u right, v down) -> PDF user space (x right, y up) for an
// unrotated page of w0 × h0 points that is shown rotated clockwise by `r`.
export function displayToUser(r, w0, h0, u, v) {
  switch (((r % 360) + 360) % 360) {
    case 90:
      return [v, u];
    case 180:
      return [w0 - u, v];
    case 270:
      return [w0 - v, h0 - u];
    default:
      return [u, h0 - v];
  }
}

export function displayedSize(r, w0, h0) {
  return r % 180 ? [h0, w0] : [w0, h0];
}

export function itemBox(item) {
  if (item.type === "text")
    return { w: item.size * 0.6 * Math.max(1, item.text.length), h: item.size * TEXT_LINE };
  return { w: item.w, h: item.h };
}

// Pure placement for one item: where pdf-lib should draw it.
export function placement(item, rotation, w0, h0) {
  const { w, h } = itemBox(item);
  if (item.type === "text") {
    const [x, y] = displayToUser(
      rotation,
      w0,
      h0,
      item.x,
      item.y + item.size * BASELINE,
    );
    return { x, y, rotate: rotation, size: item.size };
  }
  const [x, y] = displayToUser(rotation, w0, h0, item.x, item.y + h);
  return { x, y, width: w, height: h, rotate: rotation };
}

export function checkPoints(item, rotation, w0, h0) {
  return [
    [0.15, 0.55],
    [0.4, 0.82],
    [0.88, 0.18],
  ].map(([fx, fy]) =>
    displayToUser(rotation, w0, h0, item.x + fx * item.w, item.y + fy * item.h),
  );
}

export async function exportSignedPdf(file, items, signal) {
  throwIfCancelled(signal);
  if (!items.length) throw Error("Add a signature, text or check mark first.");
  if (items.length > MAX_ITEMS)
    throw Error(`Please place at most ${MAX_ITEMS} items.`);
  const { PDFDocument, StandardFonts, degrees, rgb } =
    await import("pdf-lib");
  let pdf;
  try {
    pdf = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: false,
    });
  } catch {
    throw Error(
      "This PDF could not be edited. If it is password-protected, save an unprotected copy first.",
    );
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const images = new Map();
  const ink = rgb(0.05, 0.1, 0.35);
  for (const item of items) {
    await checkpoint(signal);
    const page = pages[item.page];
    if (!page) throw Error("An item refers to a page that no longer exists.");
    // PDF.js displays the CropBox, so measure and offset from it.
    const box = page.getCropBox();
    const r = page.getRotation().angle;
    const w0 = box.width,
      h0 = box.height,
      ox = box.x,
      oy = box.y;
    if (item.type === "text") {
      const text = item.text.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const at = placement({ ...item, text }, r, w0, h0);
      try {
        font.encodeText(text);
      } catch {
        throw Error(
          "Text can use English and Western European letters only. Remove other characters or add them as a signature drawing.",
        );
      }
      page.drawText(text, {
        x: at.x + ox,
        y: at.y + oy,
        size: at.size,
        font,
        color: rgb(0.05, 0.05, 0.05),
        rotate: degrees(at.rotate),
      });
    } else if (item.type === "check") {
      const points = checkPoints(item, r, w0, h0);
      const thickness = Math.max(1, item.h * 0.1);
      for (let i = 0; i < points.length - 1; i++)
        page.drawLine({
          start: { x: points[i][0] + ox, y: points[i][1] + oy },
          end: { x: points[i + 1][0] + ox, y: points[i + 1][1] + oy },
          thickness,
          color: ink,
          lineCap: 1,
        });
    } else if (item.type === "signature") {
      let image = images.get(item.png);
      if (!image) {
        const bytes = Uint8Array.from(
          atob(item.png.slice(item.png.indexOf(",") + 1)),
          (c) => c.charCodeAt(0),
        );
        image = await pdf.embedPng(bytes);
        images.set(item.png, image);
      }
      const at = placement(item, r, w0, h0);
      page.drawImage(image, {
        x: at.x + ox,
        y: at.y + oy,
        width: at.width,
        height: at.height,
        rotate: degrees(at.rotate),
      });
    }
  }
  throwIfCancelled(signal);
  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

// Turns a light background of an uploaded signature photo transparent and
// tints ink to dark blue. Operates on ImageData in place.
export function keyOutPaper(data, threshold = 200) {
  for (let i = 0; i < data.length; i += 4) {
    const light = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (data[i + 3] === 0) continue;
    if (light >= threshold) data[i + 3] = 0;
    else {
      // Fade near-threshold pixels for a smoother edge.
      const fade = Math.min(1, (threshold - light) / 40);
      data[i] = 12;
      data[i + 1] = 25;
      data[i + 2] = 90;
      data[i + 3] = Math.round(data[i + 3] * fade);
    }
  }
}
