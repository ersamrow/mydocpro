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

Deploy the contents of `dist/` to the domain's web root. For Hostinger Apache/LiteSpeed hosting, include the generated `.htaccess`: it serves the static HTML for each known route and returns HTTP 404 for unknown routes. Do not add a catch-all SPA rewrite ahead of these rules. PDF dependencies are lazy loaded. No backend, account, analytics or advertising configuration is required.

## Hostinger publication

Back up the existing web root before updating. Extract the Hostinger ZIP into the `public_html` directory for mydocpro.in, with `index.html`, `.htaccess`, `assets/`, `robots.txt` and `sitemap.xml` directly in that directory (not inside another `dist/` folder). Preserve unrelated host configuration and verify any existing redirects before replacing `.htaccess`.

After uploading, check `/`, `/compress-image`, `/contact`, `/privacy`, `/sitemap.xml` and `/robots.txt`. Disable JavaScript and confirm that tool guidance remains readable. A made-up URL must return HTTP 404. Close all open MyDocPro tabs and reopen online to refresh the offline version. Verify that support@mydocpro.pro receives mail; it intentionally differs from the website's .in domain.

Submit `https://mydocpro.in/sitemap.xml` to Search Console and inspect representative tool URLs after publication. Request AdSense review only after verifying the public deployment. This release does not add advertising scripts or guarantee approval, indexing or traffic. Ongoing maintenance and genuine user engagement require continued work outside the codebase.

## Search metadata and performance

`src/seo.js` is the shared source for static and client-side titles, descriptions, canonical URLs, social cards and JSON-LD. It describes the actual site through Organization, WebSite, WebPage and BreadcrumbList data; no review scores, fake authors or unsupported rich-result promises are included. New routes must be added to the sitemap builder, routing and offline route allowlist as well as the metadata source.

Hostinger rules redirect www and HTTP production URLs to `https://mydocpro.in`, preserve query parameters used by the tools and canonicalize variants to the clean path. Confirm redirects on the real host, especially when a CDN or host-level HTTPS redirect is enabled. Query parameters such as `?kb=20` remain usable but share the tool's canonical URL. Do not block these variants in robots.txt: crawlers need access to read the canonical.

Hashed assets receive long-lived cache headers; HTML and the service worker revalidate. Apache configuration files are excluded from the offline cache. Check the deployed pages with Search Console URL Inspection, Google Rich Results Test (breadcrumbs) and PageSpeed Insights on mobile. No Search Console verification token has been invented or added. Submit the sitemap only for the public Hostinger domain, not the private Sites copy.

Run `node --test tests/content.test.mjs tests/pwa.test.mjs tests/download-name.test.mjs` after building. The content checks validate static output, internal links, canonical URLs, sitemap coverage and missing-page metadata. Apache routing and public DNS still require checks on the real host.

## Initial release

Image compression with a maximum KB target, resizing with physical units and DPI, format conversion, centre crop/rotation, threshold signature cleanup, threshold background whitening, generic photo presets, print sheets, name/date strips, photo/signature joining. PDF merge, extraction, page reordering/rotation, raster compression, image-to-PDF and PDF-to-image.

Generic photo presets are not official exam specifications. Compression produces image-only PDFs and removes interactive/document semantics. Print sheets are 1200×1800 pixels: print at 4×6 inches (300 DPI), with scaling disabled. Eight-photo sheets reduce photo dimensions to fit. Individual image/PDF limits are checked, but maximum-size mobile workloads remain unverified.

## Remaining specification work

Official-source verification and dated exam presets; HEIC input; interactive crop handles; Web Worker orchestration for image and PDF editing; structured data; Hindi/localization; AdSense approval and configuration. No claims are made that these are implemented. Static tool pages and tool-specific guidance are generated from shared source content during the build.

## Mobile and offline app

All tool layouts support narrow screens, touch-sized controls, safe areas, and reduced motion. PDF thumbnails support selection and page ordering.

The production build generates `sw.js` with a content-versioned list of all bundled assets, including PDF rendering workers. Use `npm run build` then `npm run preview` to test PWA behavior; development mode deliberately does not register a service worker. HTTPS or localhost is required. The manifest provides home-screen icons and tool shortcuts; use **Install app** for browser-specific guidance.

Wait for **Ready offline** before disconnecting. All 16 tools then load from the local app cache, including those not previously opened. The service worker handles only known app routes and built application assets; user files, blob downloads, authentication routes, and third-party requests are excluded. Fonts use local system fallbacks so there are no external font requests. Browser storage eviction can remove offline availability; reopen online to restore it.

Updates wait for all open MyDocPro windows to close. The current version is never forcibly reloaded while processing files. On private hosting, first sign-in/setup needs internet; the cached local tools remain usable offline after setup. Installation and private-host routing should also be tested on physical Android/iOS browsers before public launch.
