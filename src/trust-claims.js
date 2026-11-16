import { pdfTools } from "./tool-settings.js";
// Every route uses validateFiles; file-size caps replace the daily-limit claim.
export function trustForTool(id) {
  if (id === undefined) return {};
  const combined = id === "pdf-toolkit" || id === "";
  return {
    limit: combined ? "25–100 MiB/file" : pdfTools.includes(id) ? "100 MiB/file" : "25 MiB/file",
    limitDetails: "Images: 25 MiB/file, 50 megapixels. PDFs: 100 MiB/file. Maximum 50 files and 100 MiB total. Single-file tasks use one file; join-images uses two. PDF operations: 300 pages.",
  };
}
