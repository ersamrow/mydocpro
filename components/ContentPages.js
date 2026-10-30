import Link from "next/link";
import ContactForm from "./ContactForm.js";
export const pageBodies = {
  about: function Content() {
    return (
      <>
        <p>
          {
            "MyDocPro provides free image and PDF tools for everyday paperwork: preparing a photo, cleaning a signature scan, arranging pages and creating a document from images. You can use the tools without an account."
          }
        </p>
        <h2>{"How the tools work"}</h2>
        <p>
          {
            "Selected files are processed in your browser using image drawing and PDF libraries. They are not uploaded to an application server. This also means your device’s memory and browser capabilities affect the size of jobs you can complete."
          }
        </p>
        <h2>{"What we can and cannot check"}</h2>
        <p>
          {
            "MyDocPro changes file size, dimensions, layout or format. It cannot certify a document’s authenticity or guarantee that a photo meets an organisation’s application rules. Photo presets are generic. Read the current requirements from the receiving organisation and inspect every download before submitting it."
          }
        </p>
        <h2>{"Maintaining the tools"}</h2>
        <p>
          {
            "Each tool has guidance describing its current behaviour and limitations. The "
          }
          <Link href={"/updates"}>{"update log"}</Link>
          {
            " records published changes. Report a reproducible problem or outdated instruction through "
          }
          <Link href={"/contact"}>{"Contact"}</Link>
          {", without sending private documents."}
        </p>
        <h2>{"Who to contact"}</h2>
        <p>
          {"Site name: MyDocPro. For support and content corrections, email "}
          <a href={"mailto:info@mydocpro.co.in"}>{"info@mydocpro.co.in"}</a>
          {"."}
        </p>
      </>
    );
  },
  privacy: function Content() {
    return (
      <>
        <p>
          {
            "Updated 28 October 2026. This notice describes the application included in this release."
          }
        </p>
        <h2>{"Your selected files"}</h2>
        <p>
          {
            "Images and PDFs are processed locally in your browser. The tools do not upload selected files or their contents to an application server. Generated downloads are created on your device. Avoid using shared devices for sensitive paperwork."
          }
        </p>
        <h2>{"Web requests and hosting"}</h2>
        <p>
          {
            "Opening the site downloads its code, icons and processing libraries. The public site is hosted on Hostinger. Hosting requests expose ordinary connection information, including your IP address and browser information, to the host. Local document processing does not make browsing the website anonymous."
          }
        </p>
        <h2>{"Browser storage"}</h2>
        <p>
          {
            "The offline feature caches application code and icons. It does not deliberately cache your selected documents. Files and results are held in browser memory during use. Close the tab to end the session. Downloaded files remain on your device until you delete them; clear site data in browser settings to remove the offline cache."
          }
        </p>
        <h2>{"Advertising and analytics"}</h2>
        <p>
          {
            "This site includes Google AdSense to display advertisements. Google and its partners may use cookies and collect information such as your IP address, browser information and activity on this site to serve and measure ads. The document tools continue to process your selected files locally. Learn more about "
          }
          <a
            href={"https://policies.google.com/technologies/partner-sites"}
            target={"_blank"}
            rel={"noopener noreferrer"}
          >
            {"how Google uses information from sites that use its services"}
          </a>
          {" and manage advertising preferences in "}
          <a
            href={"https://myadcenter.google.com/"}
            target={"_blank"}
            rel={"noopener noreferrer"}
          >
            {"Google My Ad Center"}
          </a>
          {
            ". Hosting-level services configured separately are outside the application code."
          }
        </p>
        <h2>{"Contact form and support email"}</h2>
        <p>
          {
            "When you submit the contact form, your name, email address, subject and message are sent to our server and email provider for support. A confirmation is sent to your email address. Hashed IP and email identifiers and submission times are temporarily retained for rate limiting, with a one-hour window. Contact submissions require an internet connection and are not stored in the offline cache."
          }
        </p>
        <p>
          {"If you email "}
          <a href={"mailto:info@mydocpro.co.in"}>{"info@mydocpro.co.in"}</a>
          {
            ", your message and email address are sent through email providers and are not covered by local file processing. Describe the issue without attaching identity documents, signatures or other sensitive files. You may use this address for privacy questions or requests concerning a support message."
          }
        </p>
      </>
    );
  },
  contact: function Content() {
    return (
      <>
        <ContactForm />
        <p>
          {
            "For tool problems, content corrections or privacy questions, email "
          }
          <a href={"mailto:info@mydocpro.co.in"}>{"info@mydocpro.co.in"}</a>
          {"."}
        </p>
        <h2>{"Help us reproduce the problem"}</h2>
        <p>
          {
            "Include the tool name, browser and device, the settings you selected, the exact error message and approximate file size or page count. Explain what you expected and what happened. A small sample containing no personal information can be useful, but do not send private documents or signatures."
          }
        </p>
        <h2>{"Before contacting support"}</h2>
        <p>
          {"Try the steps in "}
          <Link href={"/help"}>{"Help and troubleshooting"}</Link>
          {
            ". If an application portal rejects your file, include its published size and format requirements as text. MyDocPro cannot override the portal’s requirements or guarantee acceptance."
          }
        </p>
        <p>
          {"Support is provided by MyDocPro. No response time is guaranteed."}
        </p>
      </>
    );
  },
  help: function Content() {
    return (
      <>
        <h2>{"File size and dimensions are different"}</h2>
        <p>
          {
            "A form may require both a pixel size and a maximum file size. Resize first, then compress and check the final dimensions again. General image compression can reduce dimensions to meet a low target. Photo presets preserve their calculated dimensions and report an error when the target is unattainable."
          }
        </p>
        <h2>{"My PDF is too large or processing stopped"}</h2>
        <p>
          {
            "PDF inputs are limited to 100 MB total and 300 pages. Mobile devices may run out of memory below those limits. Try fewer pages or a lower rendering DPI, close other tabs and keep the browser open while processing. For protected or damaged PDFs, obtain a valid unlocked copy from its source."
          }
        </p>
        <h2>{"The download is missing"}</h2>
        <p>
          {
            "Wait for the result link and select it. Check your browser’s Downloads list or the Files app. Some mobile browsers open a preview first; use its Save or Share action to save a copy. Multiple page exports have separate download links. Your original file is unchanged."
          }
        </p>
        <h2>{"The output is unreadable or larger"}</h2>
        <p>
          {
            "Compare it with the original before deleting anything. Lower JPEG quality and DPI reduce detail; PNG may be larger than JPG. PDF compression creates image-only pages and can enlarge a text-based document. Keep the original when searchable text, forms, accessibility or signatures matter."
          }
        </p>
        <h2>{"Offline use and updates"}</h2>
        <p>
          {
            "Open the site online and wait for “Ready offline” before disconnecting. Browser storage eviction can remove the cache. Updates wait until all MyDocPro windows close to avoid interrupting work. Reopen online to receive a new version. If problems persist, save your downloads before clearing the site’s browser storage."
          }
        </p>
        <h2>{"Still stuck?"}</h2>
        <p>
          <Link href={"/contact"}>{"Contact MyDocPro"}</Link>
          {
            " with the tool name and error message. Do not send personal documents."
          }
        </p>
      </>
    );
  },
  updates: function Content() {
    return (
      <>
        <h2>{"27 October 2026 — Tool guidance and navigation"}</h2>
        <p>
          {
            "Added instructions, worked examples and troubleshooting for all 16 tools, including the effects of PDF raster compression, photo sizing, brightness thresholds and print-sheet scaling."
          }
        </p>
        <p>
          {
            "Added help and contact pages, expanded the privacy and About information, and provided static HTML for tool guidance. Added page-specific metadata, a sitemap and a missing-page response for static hosting."
          }
        </p>
        <h2>{"Reporting an issue"}</h2>
        <p>
          {"If a tool behaves differently from its guidance, "}
          <Link href={"/contact"}>{"send a correction"}</Link>
          {
            " with the tool name and a non-sensitive description. This log records shipped changes; it is not a promise of a particular update schedule."
          }
        </p>
      </>
    );
  },
};
