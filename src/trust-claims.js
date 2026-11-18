import { pdfTools } from "./tool-settings.js";
// Every route uses validateFiles; file-size caps replace the daily-limit claim.
export function trustForTool(id) {
  if (id === undefined) return {};
  const combined = id === "pdf-toolkit" || id === "";
  return {
    limit: combined ? "25–100 MB/file" : pdfTools.includes(id) ? "100 MB/file" : "25 MB/file",
    limitDetails: "Images: 25 MB/file, 50 megapixels. PDFs: 100 MB/file. Maximum 50 files and 100 MB total. Single-file tasks use one file; join-images uses two. PDF operations: 300 pages.",
  };
}
