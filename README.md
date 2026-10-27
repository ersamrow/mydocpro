# MyDocPro

A browser-only image and PDF toolkit. Files are never sent to an application server.

## Run

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

## Build

```sh
npm run check
npm run build
```

Deploy `dist/` to a static host with SPA fallback to index.html. PDF and PDF-rendering dependencies are lazy loaded. No backend, account, analytics or advertising configuration is required.

## Initial release

Image compression with a maximum KB target, resizing with physical units and DPI, format conversion, centre crop/rotation, threshold signature cleanup, threshold background whitening, generic photo presets, print sheets, name/date strips, photo/signature joining. PDF merge, extraction, page reordering/rotation, raster compression, image-to-PDF and PDF-to-image.

Generic photo presets are not official exam specifications. Compression produces image-only PDFs and removes interactive/document semantics. Print sheets are 1200×1800 pixels: print at 4×6 inches (300 DPI), with scaling disabled. Eight-photo sheets reduce photo dimensions to fit. Individual image/PDF limits are checked, but maximum-size mobile workloads remain unverified.

## Remaining specification work

Official-source verification and dated exam presets; HEIC input; interactive crop handles and PDF thumbnail editor; Web Worker orchestration for image and PDF editing; installable offline PWA; per-tool static SEO pages and structured data; Hindi/localization; AdSense approval and configuration. No claims are made that these are implemented.
