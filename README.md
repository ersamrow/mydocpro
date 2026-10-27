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

Official-source verification and dated exam presets; HEIC input; interactive crop handles; Web Worker orchestration for image and PDF editing; per-tool static SEO pages and structured data; Hindi/localization; AdSense approval and configuration. No claims are made that these are implemented.

## Mobile and offline app

All tool layouts support narrow screens, touch-sized controls, safe areas, and reduced motion. PDF thumbnails support selection and page ordering.

The production build generates `sw.js` with a content-versioned list of all bundled assets, including PDF rendering workers. Use `npm run build` then `npm run preview` to test PWA behavior; development mode deliberately does not register a service worker. HTTPS or localhost is required. The manifest provides home-screen icons and tool shortcuts; use **Install app** for browser-specific guidance.

Wait for **Ready offline** before disconnecting. All 16 tools then load from the local app cache, including those not previously opened. The service worker handles only known app routes and built application assets; user files, blob downloads, authentication routes, and third-party requests are excluded. Fonts use local system fallbacks so there are no external font requests. Browser storage eviction can remove offline availability; reopen online to restore it.

Updates wait for all open MyDocPro windows to close. The current version is never forcibly reloaded while processing files. On private hosting, first sign-in/setup needs internet; the cached local tools remain usable offline after setup. Installation and private-host routing should also be tested on physical Android/iOS browsers before public launch.
