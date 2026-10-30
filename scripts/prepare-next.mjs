import { copyFile, readFile, rm } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("node_modules/pdfjs-dist/package.json", root), "utf8"),
);
await copyFile(
  new URL("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", root),
  new URL(`public/pdf.worker-${version}.js`, root),
);
// Remove the obsolete generated file so the offline installer never fetches it.
await rm(new URL("public/pdf.worker.min.mjs", root), { force: true });
