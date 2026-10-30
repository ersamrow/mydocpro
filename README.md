# MyDocPro — Next.js

All 22 public pages and the 404 page render as React components. The home page, navigation, information pages, tool settings, upload controls, image previews, crop/resize editor, PDF editor, download controls and install dialog use React state and effects. There is no legacy HTML-string application or PHP backend.

## Run

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

## Structure

- `pages/[[...slug]].js`: statically generated public routes and Next.js client navigation.
- `components/`: native React pages, shared layout, editors, settings, PWA and contact form.
- `src/processing.js`: browser canvas and PDF operations, taking files/settings explicitly; no DOM form queries or UI rendering.
- `src/tool-settings.js`, `src/tools.js`, `src/tool-guides.js`: tool definitions and guidance.
- `components/ContentPages.js`: information page content written as JSX.
- `src/seo.js`: shared titles, canonical URLs and structured metadata.
- `pages/api/contact.js` and `server/contact.js`: server-only SMTP contact API.

Images and PDFs remain on the user's device. Preview effects cancel/discard stale work and release PDF documents, canvas resources and object URLs when files or routes change. Generic photo sizes are not official exam requirements. PDF compression creates image-only pages and does not preserve text, forms, links or digital signatures.

## Contact delivery

Copy `.env.example` to `.env.local` for development or configure its variables on the Node.js host. Next.js loads local environment files. Use `SMTP_ENCRYPTION=tls` / port 587 for STARTTLS or `ssl` / port 465 for implicit TLS as required by the provider. Certificate verification stays enabled. Configure authorized senders and SPF/DKIM with the mail provider.

`POST /api/contact` accepts JSON or a standard URL-encoded form and rejects attachments. It validates submissions, uses a honeypot, limits body size to 32 KB, and limits an IP/email to five submissions per hour and the host to 100 per hour. A file-backed atomic lock coordinates Node workers on one host. Only hashed identifiers and timestamps are retained, with expired data pruned on submission. Set `CONTACT_RATE_DIR` to writable persistent storage for limits to survive host restarts. Multiple hosts/serverless instances require a shared rate-limit implementation or gateway before scaling. The endpoint uses the socket peer IP; configure an appropriate trusted-proxy IP policy if the proxy makes all requests share one address.

Support receives the submitted message with the user's Reply-To address; the user receives a fixed acknowledgement. Acknowledgement failure tells the user not to resubmit. Tests use a fake transport and send no real email. SMTP credentials and live inbox delivery must be configured/verified on the deployment host.

## Offline and PWA

The production build precaches route HTML, Next.js page data, static chunks, icons and the PDF worker. Wait for **Ready offline** before disconnecting. Contact submissions and advertising require internet and are never cached. Updates wait for existing app windows to close, so active processing is not interrupted. Browser storage eviction may remove offline availability.

AdSense publisher configuration is preserved. Complete applicable consent configuration and publisher approval in AdSense before serving ads where required.

## Verification

```sh
npm run check
npm run build
npm test
```

Browser regression scripts `tests/pdf-previews.browser.cjs`, `tests/next.browser.cjs`, and `tests/all-tools.browser.cjs` use Playwright against `TEST_URL` (default port 4173). Run `npx playwright install chromium` once, or set `CHROME_PATH` to an installed Chrome executable. Run `npm run test:browser` with the preview server running. They cover hydration/navigation, image and PDF outputs, crop/resize interactions, PDF controls, offline routes and 404 behavior.

PDF rendering uses a versioned `pdf.worker-<PDF.js version>.js` module generated during the build. The `.js` suffix avoids hosts that serve `.mjs` as `text/plain`. Deploy the generated `public/` directory along with `.next/`; both must come from the same build. If upgrading from the old worker URL, close all app tabs after deployment and reopen online so the service worker can update.
