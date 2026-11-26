import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { copyLibFiles } from "@qwik.dev/partytown/utils";
import "./build-agent-assets.mjs";
const root = new URL("../", import.meta.url);
await copyLibFiles(fileURLToPath(new URL("public/~partytown/", root)), {
  debugDir: false,
});
const { version } = JSON.parse(
  await readFile(new URL("node_modules/pdfjs-dist/package.json", root), "utf8"),
);
await copyFile(
  new URL("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", root),
  new URL(`public/pdf.worker-${version}.js`, root),
);
// Remove the obsolete generated file so the offline installer never fetches it.
await rm(new URL("public/pdf.worker.min.mjs", root), { force: true });
// MediaPipe runtime for on-device background removal (SIMD build only).
await mkdir(new URL("public/mediapipe/", root), { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"])
  await copyFile(
    new URL(`node_modules/@mediapipe/tasks-vision/wasm/${file}`, root),
    new URL(`public/mediapipe/${file}`, root),
  );
// Serve libheif's unmodified browser/WASM bundle directly. Its universal
// require shim is not intended to be transformed by a second bundler.
// build-pwa includes these local files in the versioned offline cache.
const { version: heifVersion } = JSON.parse(
  await readFile(new URL("node_modules/libheif-js/package.json", root), "utf8"),
);
await copyFile(
  new URL("node_modules/libheif-js/libheif-wasm/libheif-bundle.mjs", root),
  new URL(`public/heic-decoder-${heifVersion}.js`, root),
);
await copyFile(
  new URL("node_modules/libheif-js/LICENSE", root),
  new URL("public/heic-decoder-LICENSE.txt", root),
);
