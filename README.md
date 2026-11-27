# MyDocPro — Next.js

## Shared interface

Use `components/ui.js` for `Button`, `Card`, `ToolLayout`, `ActionBar` and
`FileRow`. Their styles live in `src/ui.css`, using `src/theme-tokens.css`.
Page CSS should describe unique controls and geometry, such as crop handles or
PDF thumbnails, rather than redefine shared buttons, cards or floating bars.

`Button` defaults to `type="button"`; use `type="submit"` explicitly for form
submission, `as="a"` for downloads, and `as={Link}` for navigation. Render an
`ActionBar` only after selecting a file. Keep editing preferences outside it so
the floating status and download controls remain compact on mobile.

All 24 public pages and the 404 page render as React components. The home page, navigation, information pages, tool settings, upload controls, image previews, crop/resize editor, PDF editor, download controls and install dialog use React state and effects. There is no legacy HTML-string application or PHP backend.

## Combined workspaces

Open `/image-editor` for a single-screen image studio: crop, color adjustments, and resize are shown first, with extra operations under More tools and advanced controls available on demand. Upload once, apply successive edits, undo/redo or reset, then download the current image. No operation dropdown or intermediate re-upload is needed. Undo retains up to ten recent images within 100 MB; files and edits remain in memory only.

Open `/pdf-toolkit` for all existing PDF operations. Choose an operation, upload files, adjust settings, and download. Compatible source uploads carry over when switching; single-file operations keep the first file. Settings and results reset on switching, so download first.

The image tools accept JPG, PNG, WebP and HEIC/HEIF. HEIC decoding loads a self-hosted WASM decoder only when needed and uses the first image/frame. Background cleanup uses a feathered, edge-connected colour tolerance; signature paper cleanup has its own threshold. The PDF Toolkit includes merge, split, compression, image conversion, and page organization; it does not provide OCR, PDF text editing, or password management.

## Run

Run `npm run test:all` for a fresh production build, syntax checks, unit tests,
all browser suites and desktop/mobile screenshot comparisons. The runner starts
and stops its own local server and writes results to `ui-audit/checks/results.json`.
Set `CHROME_PATH` if Chrome is installed outside the default Windows location.
Visual baselines are updated deliberately with `npm run test:visual -- --update-snapshots`
against a running production server (`TEST_URL`), after reviewing the screenshots.

Requires Node.js 20.9+; Node.js 22 LTS is recommended.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Development does not install an offline service worker.

## Production

```sh
npm run build
npm start
```

Deploy the project to a **Node.js-capable host** using those build and start commands. A PHP/static-only Hostinger plan cannot run this version. Do not upload the old `dist/` or `out/` directories: they are obsolete exports. No PHP or Composer installation is required. The build generates `.next/`, the versioned service worker, sitemap and PDF worker in `public/`. Run the production server with both `.next/` and `public/` present. Set `PORT` as required by the host; the start script binds to localhost for a reverse proxy. For direct container access run `npx next start --hostname 0.0.0.0`.

`npm run preview` starts the same production server on port 4173. The contact endpoint runs in development and production. Keep SMTP settings server-only. Host HTTPS at the reverse proxy, redirect the production domain to `https://mydocpro.co.in`, and check direct tool URLs, unknown-page HTTP 404, sitemap and ads.txt after deployment.

## Notify search engines with IndexNow

The root verification file `public/mydocpro-indexnow.txt` and `npm run indexnow`
support IndexNow without adding browser scripts or changing page URLs. The key
is an IndexNow ownership-verification value, not a Bing account password. Keep
this file stable across deployments.

Deploy the application and `public/` before submitting. Preview the initial list
of canonical, indexable pages with `npm run indexnow`; this makes no network
requests. After deployment, send the initial list once:

```sh
npm run indexnow -- --all --submit
```

For later releases, preview only the pages whose content changed, then submit:

```sh
npm run indexnow -- /contact /help /updates
npm run indexnow -- --submit /contact /help /updates
```

The command verifies the matching key at
`https://mydocpro.co.in/mydocpro-indexnow.txt` before sending anything. A missing,
redirected or mismatched key stops submission. HTTP 200 confirms receipt; HTTP
202 means key validation is pending. Neither response guarantees indexing. The
command rejects unknown pages, external domains, assets and query-string URLs.
It runs only when invoked, not during builds or visitor sessions. Do not send
unchanged URLs repeatedly; run the changed-URL command after meaningful updates.
See the [official protocol](https://www.indexnow.org/documentation).

## Structure

- `pages/[[...slug]].js`: statically generated public routes and Next.js client navigation.
- `components/`: native React pages, shared layout, editors, settings, PWA and contact form.
- `src/processing.js`: browser canvas and PDF operations, taking files/settings explicitly; no DOM form queries or UI rendering.
- `src/tool-settings.js`, `src/tools.js`, `src/tool-guides.js`: tool definitions and guidance.
- `components/ContentPages.js`: information page content written as JSX.
- `src/seo.js`: shared titles, canonical URLs and structured metadata.
- `pages/api/contact.js` and `server/contact.js`: server-only SMTP contact API.

Images and PDFs remain on the user's device. Preview effects cancel/discard stale work and release PDF documents, canvas resources and object URLs when files or routes change. Generic photo sizes are not official exam requirements. PDF compression first recompresses supported embedded images while preserving text and page content. Rasterization is a fallback for image-only PDFs; unsupported image streams stay unchanged. Size targets are not guaranteed, and edited PDFs must not be treated as retaining valid digital signatures.

## Contact delivery

Copy `.env.example` to `.env.local` for development or configure its variables on the Node.js host. Next.js loads local environment files. Use `SMTP_ENCRYPTION=tls` / port 587 for STARTTLS or `ssl` / port 465 for implicit TLS as required by the provider. Certificate verification stays enabled. Configure authorized senders and SPF/DKIM with the mail provider.

`POST /api/contact` accepts JSON or a standard URL-encoded form and rejects attachments. It validates submissions, uses a honeypot, limits body size to 32 KB, and limits an IP/email to five submissions per hour and the host to 100 per hour. A file-backed atomic lock coordinates Node workers on one host. Only hashed identifiers and timestamps are retained, with expired data pruned on submission. Set `CONTACT_RATE_DIR` to writable persistent storage for limits to survive host restarts. Multiple hosts/serverless instances require a shared rate-limit implementation or gateway before scaling. The endpoint uses the socket peer IP; configure an appropriate trusted-proxy IP policy if the proxy makes all requests share one address.

Support receives the submitted message with the user's Reply-To address; the user receives a fixed acknowledgement. Acknowledgement failure tells the user not to resubmit. Tests use a fake transport and send no real email. SMTP credentials and live inbox delivery must be configured/verified on the deployment host.

## Offline and PWA

The production build precaches route HTML, Next.js page data, static chunks, icons, the PDF worker and HEIC decoder. Wait for **✓ Works offline** before disconnecting. Contact submissions and advertising require internet and are never cached. Updates wait for existing app windows to close, so active processing is not interrupted. Activation removes caches other than the current version. Browser storage eviction may remove offline availability.

AdSense publisher configuration is preserved. Complete applicable consent configuration and publisher approval in AdSense before serving ads where required.

## Visitor analytics

Google Analytics uses Measurement ID `G-YZZFKYVDF4` through `components/SiteScripts.js`. On the two production hostnames, the tag starts after page load in an idle callback. The build copies Partytown into `public/~partytown/` to run the tag in a worker. The main page retains the data layer for consent updates. Browsers without worker support use the existing Google tag directly. The offline app cache excludes the analytics runtime.

In the Analytics web stream, keep Enhanced measurement → Page views → Page changes based on browser history events enabled to measure Next.js navigation. The app relies on that automatic tracking and does not send additional route-change events. Do not install the `GTM-KBDMDM48` snippet alongside this direct integration if that container also sends Analytics events to the same property, as that can duplicate visits. Review Realtime after deployment to confirm receipt in your account.

Microsoft Clarity uses project `zk587fqpuf` in the same production-only, online, post-load scheduler. It loads once on the main thread because it needs access to the page DOM. The existing exclusion for direct visits to exam pages still applies. The app root has `data-clarity-mask="true"` so page text, filenames and document previews are masked from recordings. Keep sensitive content inside that root and out of CSS, which Clarity masking does not cover. The loader queues Consent V2 with both `ad_Storage` and `analytics_Storage` denied before loading Clarity, enabling limited tracking without Clarity cookies. Full tracking across sessions is not enabled; any future consent integration must pass the visitor's actual choice. See Microsoft's [masking guide](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking) and [Consent V2 documentation](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2). The privacy page discloses this integration. After deployment, confirm incoming visits in the Clarity dashboard.

## Verification

```sh
npm run check
npm run build
npm test
```

Browser regression scripts `tests/pdf-previews.browser.cjs`, `tests/next.browser.cjs`, and `tests/all-tools.browser.cjs` use Playwright against `TEST_URL` (default port 4173). Run `npx playwright install chromium` once, or set `CHROME_PATH` to an installed Chrome executable. Run `npm run test:browser` with the preview server running. They cover hydration/navigation, image and PDF outputs, crop/resize interactions, PDF controls, offline routes and 404 behavior.

PDF rendering uses a versioned `pdf.worker-<PDF.js version>.js` module generated during the build. The `.js` suffix avoids hosts that serve `.mjs` as `text/plain`. Deploy the generated `public/` directory along with `.next/`; both must come from the same build. If upgrading from the old worker URL, close all app tabs after deployment and reopen online so the service worker can update.

## Productivity and visual checks

Resize, convert and compress image tools support batches (up to 50 files / 100 MB total). Previews show the first image. Completed files can be packaged in a ZIP locally; ZIP packaging is limited to 200 MB. Cancel interrupts PDF rendering or stops at the next processing checkpoint; a browser image-encoding step already in progress may finish first.

“Remember settings on this device” is opt-in per tool. It saves numeric and dropdown settings only. Names, dates, page selections, output filenames and uploaded files are excluded. Reset settings restores defaults and deletes that tool’s saved preferences. Undo keeps up to 30 recent setting groups in memory.

With the local server running, use `npm run test:productivity` for batch/ZIP/cancellation/preferences checks. `npm run test:visual` compares desktop and mobile pages against committed screenshot baselines (Windows Chrome). Set `TEST_URL` and `CHROME_PATH` as needed. Review intentional changes before running `npm run test:visual -- --update-snapshots`; failed comparisons are written to `ui-audit/visual-results`. Run `npm run test:ui` alongside screenshots for all-route overflow, focus and touch-target checks.
