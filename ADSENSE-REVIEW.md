# MyDocPro AdSense review — 25 November 2026

The rejection shown in the supplied screenshot is **Low value content**. It does not identify individual pages or prove a specific code defect. These changes improve useful content and the download experience; they do not guarantee approval.

## Changes

| Finding | Correction | Evidence |
| --- | --- | --- |
| Every download opened a blocking WhatsApp suggestion | Removed the global prompt from the application; the optional footer channel link remains | `pages/_app.js`; previous listener in `components/DownloadFollowPrompt.js` |
| Most standalone instructions were initially collapsed | Open standalone tool guidance by default; retain collapsed help within combined workspaces; remove repeated generic three-step copy | `components/Workspace.jsx` |
| Eight size pages largely repeated the same instructions | Add distinct framing advice, calculated crop examples, output dimensions and physical-print checks | `src/photo-sizes.js`, `pages/resize-image/[slug].js` |
| AdSense ran on localhost and preview hosts | Restrict advertising and analytics loaders to the existing production hostname allowlist | `components/SiteScripts.js` |
| Maintenance log described only October changes | Record the current photo-size, calculator and download improvements | `components/ContentPages.js` |
| Privacy notice did not explicitly explain advertising based on visits to other websites | Explain personalised advertising cookies and link to advertising choices; retain the distinction between local file processing and ordinary website requests | `components/ContentPages.js` |

No dependencies, third-party scripts, URLs, canonical tags, robots directives or processing algorithms were added or changed. Tool-selected files remain processed locally. The contact form intentionally sends support messages to the server.

## Verification

- Live site: all 39 public URLs returned HTTP 200 with titles matching source. This confirms the earlier deployment, not deployment of this audit's edits.
- Live `ads.txt`: HTTP 200; publisher `pub-4905030687832208` matches the AdSense loader. Live robots file allows crawling and references the sitemap.
- Production build and syntax checks passed; all 52 existing unit checks passed.
- Existing browser checks passed for all 16 standalone tools and both combined workspaces, image/PDF output generation, hydration, search, offline navigation and 404 handling.
- All 39 routes checked at 360 px and 1280 px: no horizontal page overflow or JavaScript exceptions. Guidance is open on standalone pages, localhost has no ad loader, and an actual download completes without opening a dialog.
- Eight size-page downloads matched requested 300-DPI pixel dimensions and stayed below the tested 50 KB limit. Calculator conversions, preset controls and saved-setting isolation passed.
- Screenshots: `ui-audit/adsense-360.png`, `ui-audit/adsense-1280.png` (ignored local artifacts).

Local mobile Lighthouse measurements on the production build:

| Page | Performance | Accessibility | SEO | CLS |
| --- | ---: | ---: | ---: | ---: |
| `/` | 100 | 96 | 100 | 0 |
| `/compress-image` | 99 | 100 | 100 | 0 |
| `/resize-image` | 96 | 100 | 100 | 0 |
| `/exam-photo` | 99 | 100 | 100 | 0 |
| `/merge-pdf` | 100 | 100 | 100 | 0 |

These are single local runs, not live field measurements or an assurance about future advertising impact. The final privacy-only copy update was rebuilt and included in the subsequent all-route browser checks.

## Before requesting another review

1. Deploy these changes through Hostinger Git deployment, then check the live download experience, size pages and privacy notice.
2. In AdSense, check **Privacy & messaging**. No certified consent platform integration was found in application code; account-served messages were not inspected. Google requires a certified CMP for personalised ads in the EEA, UK and Switzerland. Configure the applicable message and verify it before serving those ads. This audit does not certify legal compliance.
3. Keep ads visually separate from upload, process and download controls. Actual Auto ads placement is an account setting and was not inspected or changed.
4. After the fixes are live, use the site's AdSense **Request review** action. No review was requested by this audit. Do not interpret passing Lighthouse or adding FAQs as proof that Google will approve the site.

References: [Site not ready for ads](https://support.google.com/adsense/answer/12176698?hl=en), [required privacy content](https://support.google.com/adsense/answer/1348695?hl=en), [regional consent management requirements](https://support.google.com/adsense/answer/13554116?hl=en).

Skills used: code-optimization, react-expert and code-reviewer. A bounded helper reviewed content and implemented the eight size-page explanations; the primary agent integrated and verified the result.
