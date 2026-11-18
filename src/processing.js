import { throwIfCancelled } from "./file-validation.js";
export { pageIndices } from "./page-indices.js";
export {
  processImage,
  adjustImage,
  loadImage,
  normalizeImageFile,
  isHeif,
  draw,
  compress,
  compressCanvasToTarget,
  encodeCanvas,
  whitenPaper,
  byteBudget,
} from "./image-processing.js";
export { processPdf } from "./pdf-processing.js";

export async function pdfRenderer(f, signal) {
  const pdfjs = await import("pdfjs-dist");
  // Some hosts serve .mjs as text/plain. Keep module contents under a .js URL,
  // versioned with PDF.js so an older cache cannot supply a mismatched worker.
  const worker = `/pdf.worker-${pdfjs.version}.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  throwIfCancelled(signal);
  const loading = pdfjs.getDocument({
    data: await f.arrayBuffer(),
    isEvalSupported: false,
  });
  const abort = () => {
    loading.destroy().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  let doc;
  try {
    doc = await loading.promise;
    throwIfCancelled(signal);
  } catch (e) {
    throwIfCancelled(signal);
    if (e.name === "PasswordException")
      throw Error(
        "This PDF is password-protected. Unlock it in your PDF app, save an unprotected copy, then try again.",
      );
    throw Error(
      "This PDF could not be opened. It may be damaged; export a fresh copy and try again.",
    );
  } finally {
    signal?.removeEventListener("abort", abort);
  }
  if (doc.numPages > 300) {
    await doc.destroy();
    throw Error("Please use PDFs with at most 300 pages.");
  }
  return doc;
}
