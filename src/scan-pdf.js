import { throwIfCancelled, checkpoint } from "./file-validation.js";

export const MAX_SCAN_PAGES = 20;
const A4 = [595.28, 841.89];

// pages: [{ blob (image/jpeg), width, height }] in display order.
export async function buildScanPdf(pages, { pageSize = "a4" } = {}, signal) {
  if (!pages.length) throw Error("Add at least one page first.");
  if (pages.length > MAX_SCAN_PAGES)
    throw Error(`Please scan at most ${MAX_SCAN_PAGES} pages at a time.`);
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setProducer("MyDocPro");
  for (const { blob, width, height } of pages) {
    await checkpoint(signal);
    const image = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    let size, margin;
    if (pageSize === "fit") {
      // 150 dpi keeps text a readable size without a huge page.
      size = [(width * 72) / 150, (height * 72) / 150];
      margin = 0;
    } else {
      size = width > height ? [A4[1], A4[0]] : A4;
      margin = 18;
    }
    const page = pdf.addPage(size);
    const scale = Math.min(
      (size[0] - margin * 2) / width,
      (size[1] - margin * 2) / height,
    );
    const w = width * scale,
      h = height * scale;
    page.drawImage(image, {
      x: (size[0] - w) / 2,
      y: (size[1] - h) / 2,
      width: w,
      height: h,
    });
  }
  throwIfCancelled(signal);
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
