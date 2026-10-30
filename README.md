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
composer install --no-dev
npm run check
npm run build
```

Deploy the contents of `dist/` to the domain's web root. For Hostinger Apache/LiteSpeed hosting, include the generated `.htaccess`: it serves the static HTML for each known route and returns HTTP 404 for unknown routes. Do not add a catch-all SPA rewrite ahead of these rules. PDF dependencies are lazy loaded. The tools require no backend or user account. AdSense setup is described below.

## Hostinger publication

Back up the existing web root before updating. Extract the Hostinger ZIP into the `public_html` directory for mydocpro.co.in, with `index.html`, `.htaccess`, `assets/`, `robots.txt` and `sitemap.xml` directly in that directory (not inside another `dist/` folder). Preserve unrelated host configuration and verify any existing redirects before replacing `.htaccess`.

After uploading, check `/`, `/compress-image`, `/contact`, `/privacy`, `/sitemap.xml` and `/robots.txt`. Disable JavaScript and confirm that tool guidance remains readable. A made-up URL must return HTTP 404. Close all open MyDocPro tabs and reopen online to refresh the offline version. Verify that info@mydocpro.co.in receives mail; it intentionally differs from the website's .in domain.

Submit `https://mydocpro.co.in/sitemap.xml` to Search Console and inspect representative tool URLs after publication. Request AdSense review only after verifying the public deployment. This release includes the AdSense loading script; it does not guarantee approval, indexing or traffic. Ongoing maintenance and genuine user engagement require continued work outside the codebase.

## Search metadata and performance

`src/seo.js` is the shared source for static and client-side titles, descriptions, canonical URLs, social cards and JSON-LD. It describes the actual site through Organization, WebSite, WebPage and BreadcrumbList data; no review scores, fake authors or unsupported rich-result promises are included. New routes must be added to the sitemap builder, routing and offline route allowlist as well as the metadata source.

Hostinger rules redirect www and HTTP production URLs to `https://mydocpro.co.in`, preserve query parameters used by the tools and canonicalize variants to the clean path. Confirm redirects on the real host, especially when a CDN or host-level HTTPS redirect is enabled. Query parameters such as `?kb=20` remain usable but share the tool's canonical URL. Do not block these variants in robots.txt: crawlers need access to read the canonical.

Hashed assets receive long-lived cache headers; HTML and the service worker revalidate. Apache configuration files are excluded from the offline cache. Check the deployed pages with Search Console URL Inspection, Google Rich Results Test (breadcrumbs) and PageSpeed Insights on mobile. No Search Console verification token has been invented or added. Submit the sitemap only for the public Hostinger domain, not the private Sites copy.

Run `node --test tests/content.test.mjs tests/pwa.test.mjs tests/download-name.test.mjs` after building. The content checks validate static output, internal links, canonical URLs, sitemap coverage and missing-page metadata. Apache routing and public DNS still require checks on the real host.

## Initial release

Image compression with a maximum KB target, resizing with physical units and DPI, format conversion, centre crop/rotation, threshold signature cleanup, threshold background whitening, generic photo presets, print sheets, name/date strips, photo/signature joining. PDF merge, extraction, page reordering/rotation, raster compression, image-to-PDF and PDF-to-image.

Generic photo presets are not official exam specifications. Compression produces image-only PDFs and removes interactive/document semantics. Print sheets are 1200×1800 pixels: print at 4×6 inches (300 DPI), with scaling disabled. Eight-photo sheets reduce photo dimensions to fit. Individual image/PDF limits are checked, but maximum-size mobile workloads remain unverified.

## Remaining specification work

Official-source verification and dated exam presets; HEIC input; interactive crop handles; Web Worker orchestration for image and PDF editing; structured data; Hindi/localization; AdSense account approval and Auto ads configuration. No claims are made that these are implemented. Static tool pages and tool-specific guidance are generated from shared source content during the build.

## Mobile and offline app

All tool layouts support narrow screens, touch-sized controls, safe areas, and reduced motion. PDF thumbnails support selection and page ordering.

The production build generates `sw.js` with a content-versioned list of all bundled assets, including PDF rendering workers. Use `npm run build` then `npm run preview` to test PWA behavior; development mode deliberately does not register a service worker. HTTPS or localhost is required. The manifest provides home-screen icons and tool shortcuts; use **Install app** for browser-specific guidance.

Wait for **Ready offline** before disconnecting. All 16 tools then load from the local app cache, including those not previously opened. The service worker handles only known app routes and built application assets; user files, blob downloads, authentication routes, and third-party requests are excluded. Fonts use local system fallbacks so there are no external font requests. Browser storage eviction can remove offline availability; reopen online to restore it.

Updates wait for all open MyDocPro windows to close. The current version is never forcibly reloaded while processing files. On private hosting, first sign-in/setup needs internet; the cached local tools remain usable offline after setup. Installation and private-host routing should also be tested on physical Android/iOS browsers before public launch.

## Google AdSense

The shared HTML head loads AdSense asynchronously for publisher `ca-pub-4905030687832208`. The build includes this script on every generated page and publishes `public/ads.txt` at `/ads.txt`.

Deploy `dist/`, verify `/ads.txt` on the public domain, then complete site approval and enable Auto ads in your AdSense account. Configure applicable consent messages in AdSense Privacy & messaging before serving ads to audiences that require them. Manual ad units require real slot IDs from AdSense; none are fabricated here.

## Contact form email delivery

`/contact` submits to `public/api/contact.php`, copied to `dist/api/contact.php` by the build. Deploy to PHP-enabled Hostinger hosting (PHP 8.1+). Vite and static-only previews do not execute PHP. The form also works without JavaScript on PHP hosting.

Email uses PHPMailer with authenticated SMTP. Set `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `CONTACT_FROM_EMAIL`, and `CONTACT_ADMIN_EMAIL` in the PHP server environment. Set `SMTP_ENCRYPTION=tls` with `SMTP_PORT=587` for STARTTLS, or `SMTP_ENCRYPTION=ssl` with `SMTP_PORT=465` for implicit TLS, as required by your provider. TLS certificate verification remains enabled. Missing or invalid settings fail safely; there is no fallback to PHP mail().

See `.env.example` for sample values. It is a reference only: PHP does not automatically load `.env`. Configure these values through your hosting environment/PHP process configuration. Never use `VITE_` prefixes or put passwords in `public/`, `dist/`, or Git. Use an authorized sender and configure the domain's SPF/DKIM.

`npm run build` automatically runs `composer install` using `composer.lock` before packaging mail dependencies. The build environment needs PHP 8.1+ and Composer 2 on PATH in addition to Node.js. Keep the hosting build command as `npm run build` and output directory as `dist`. If the hosting builder only provides Node.js, build locally with PHP and Composer installed and upload `dist/` to PHP-enabled hosting. A static-only or Node-only runtime cannot execute the contact PHP endpoint; build-time environment variables alone do not configure the PHP runtime. The build packages the locked PHP dependencies into `dist/api/vendor/` and blocks direct HTTP access with `.htaccess`. Upload the complete `dist/` directory contents, including those dependencies. SMTP traffic requires outbound access from the PHP host.

The admin notification includes the submitted details and uses the user's address as Reply-To. The user receives a fixed acknowledgement. If admin submission fails, the form reports an error; if only acknowledgement fails, it tells the user not to resubmit. Mail transport acceptance does not guarantee inbox delivery. After deployment, submit a test using an inbox you control and check both inboxes and spam folders.

Server validation, a hidden spam field, and locked per-IP/per-recipient limits (5 per hour, plus 100 total per hour) protect the endpoint. Hashed identifiers and timestamps are kept in the host's temporary directory; expired entries are removed on the next submission. The PHP process must be able to write there. Contact data is transmitted for support; image/PDF tool files still stay local. The endpoint is excluded from offline caching.
