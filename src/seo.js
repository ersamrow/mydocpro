import { tools } from "./tools.js";
import { sitePages } from "./site-content.js";
import { organizationProfiles } from "./organization-profiles.js";
import { faqSchema } from "./photo-sizes.js";
import { homeFaqs, calculatorFaqs, toolFaqs } from "./tool-faqs.js";

export const siteOrigin = "https://mydocpro.co.in";
// Descriptions explain real functionality; no invented ratings or acceptance claims.
export const toolSearch = {
  "image-editor": [
    "Free Online Photo Editor, No Sign-up",
    "Crop, rotate and resize photos for free. Adjust brightness and contrast in your browser, then download the edited image without a watermark or upload.",
  ],
  "pdf-toolkit": [
    "Free PDF Tools Online – Merge, Split, Compress",
    "Merge, split, compress and organize PDFs free in your browser. Convert photos to PDFs or export pages as images, without uploads, sign-ups or watermarks.",
  ],
  "compress-image": [
    "Image Compressor to 20 KB, 50 KB & 100 KB Free",
    "Compress an image to 20 KB, 50 KB or 100 KB free. Preview JPG output and check its dimensions before submitting. No upload, account or watermark required.",
  ],
  "resize-image": [
    "Resize Image in CM, MM & Pixels Online Free",
    "Resize image width and height in cm, mm or pixels. Choose DPI and an optional KB limit, preview the result and download free. No upload or sign-up needed.",
  ],
  "convert-image": [
    "Convert JPG, PNG and WebP Images Online Free",
    "Convert JPG to PNG, PNG to JPG, or images to and from WebP for free. Choose your output format and download without uploading your image. No sign-up needed.",
  ],
  "crop-image": [
    "Crop Image Online Free – Crop & Rotate Photos",
    "Crop an image online free with square, passport or custom ratios. Rotate your photo, adjust the selection and preview before downloading. No upload needed.",
  ],
  "merge-pdf": [
    "Merge PDF Online Free – No Upload",
    "Merge PDF online free without uploading your files. Combine PDFs and images, reorder pages and download one document. No account or watermark on downloads.",
  ],
  "split-pdf": [
    "Split PDF Online Free – Separate PDF Pages",
    "Split PDF pages online free. Extract page ranges, separate each page or split every N pages. Download PDFs or a ZIP with no upload, sign-up or watermark.",
  ],
  "compress-pdf": [
    "PDF Compressor to 100 KB, 200 KB & 500 KB Free",
    "Try compressing PDF to 100 KB, 200 KB or 500 KB free. Reduce supported images locally and check readability. Targets depend on the file; no upload needed.",
  ],
  "jpg-to-pdf": [
    "JPG to PDF Converter Online Free",
    "Convert JPG to PDF online free. Merge photos into one PDF, arrange their order and choose A4, Letter or image-sized pages. No upload, sign-up or watermark.",
  ],
  "exam-photo": [
    "Free Exam Photo Resizer for Application Forms",
    "Resize application photos to standard sizes for free in your browser. Choose DPI and maximum KB, then check your form’s requirements before downloading.",
  ],
  signature: [
    "Free Signature Cleaner for Online Forms",
    "Clean a scanned signature on white paper free. Adjust the threshold, preview faint strokes and save JPG, PNG or WebP locally, without an upload or account.",
  ],
  "passport-sheet": [
    "Passport Size Photo Maker Free – A4 Print Sheet",
    "Make passport size photo sheets free on A4 or 4 × 6 inch paper. Choose dimensions, DPI, copies and cut guides. Print at 100% and check the form’s rules.",
  ],
  "pdf-to-image": [
    "PDF to JPG Converter Online Free",
    "Convert PDF to JPG online free. Select pages and DPI, preview the results and download separate images or a ZIP. PNG and WebP available; no upload needed.",
  ],
  "organize-pdf": [
    "Organize PDF Free – Reorder, Rotate, Delete",
    "Rearrange, rotate or remove pages from a PDF online for free. Check the new page order in the preview and download the document without an upload or account.",
  ],
  "name-date": [
    "Add Name and Date on Photo Free for Exam Forms",
    "Add your name and date below a photo for application forms. Preview the text strip and download the finished image for free, without uploads or an account.",
  ],
  "join-images": [
    "Join Images Online Free – JPG or A4 PDF",
    "Join 2–6 images free in a row, column or grid. Arrange Aadhaar front and back with white space for A4 printing. Download JPG or PDF without uploading.",
  ],
  "scan-pdf": [
    "Scan Documents to PDF Online Free – Camera Scanner",
    "Scan paper documents to PDF free: photograph pages, straighten and clean them, then download one PDF. Works on your phone and never uploads your photos.",
  ],
  "sign-pdf": [
    "Sign PDF Online Free – Add Signature, Text & Date",
    "Sign and fill a PDF free: draw, type or upload your signature, add text, today's date and check marks, then download the result. Files stay on your device.",
  ],
  "remove-background": [
    "Remove Photo Background Online Free – On Device",
    "Remove the background from a portrait free online and replace it with white, blue or transparent. AI runs in your browser, so your photo is never uploaded.",
  ],
  "white-background": [
    "Whiten a Light Photo Background Online Free",
    "Make a plain photo background white free using edge-connected colour matching. Adjust tolerance and preview before downloading. Files stay on your device.",
  ],
};
export function pageSeo(id = "") {
  const tool = tools.find((t) => t[0] === id);
  const page =
    id === "cm-to-pixels"
      ? {
          title: "CM to Pixels Converter – Free",
          description:
            "Convert cm, mm or inches to pixels and pixels to physical sizes at your chosen DPI. Check common photo size tables and open a pre-filled image resizer free.",
        }
      : Object.hasOwn(sitePages, id)
        ? sitePages[id]
        : null;
  const known = id === "" || Boolean(tool || page);
  const name = tool
    ? toolSearch[id][0]
    : page
      ? page.title
      : known
        ? "Free Image & PDF Tools Online, No Upload"
        : "Page not found";
  const description = tool
    ? toolSearch[id][1]
    : page
      ? page.description
      : known
        ? "Compress, resize and convert images, merge and split PDFs, and prepare application photos for free. Files stay on your device while you use the tools."
        : "This address does not match a MyDocPro page. Browse the image and PDF tools to find what you need.";
  const url = siteOrigin + "/" + id;
  const graph = known
    ? [
        {
          "@type": "Organization",
          "@id": siteOrigin + "/#organization",
          name: "MyDocPro",
          url: siteOrigin + "/",
          logo: siteOrigin + "/brand/mydocpro-1024.png",
          sameAs: Object.values(organizationProfiles).filter((url) =>
            /^https:\/\//.test(url),
          ),
          telephone: "+919781843043",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Near primary school",
            addressLocality: "Village Arakwas",
            postalCode: "148031",
            addressCountry: "IN",
          },
          email: "info@mydocpro.co.in",
        },
        {
          "@type": "WebSite",
          "@id": siteOrigin + "/#website",
          name: "MyDocPro",
          url: siteOrigin + "/",
          publisher: { "@id": siteOrigin + "/#organization" },
          inLanguage: "en",
        },
        {
          "@type":
            id === "about"
              ? "AboutPage"
              : id === "contact"
                ? "ContactPage"
                : "WebPage",
          "@id": url + "#webpage",
          url,
          name,
          description,
          inLanguage: "en",
          isPartOf: { "@id": siteOrigin + "/#website" },
          ...(id ? { breadcrumb: { "@id": url + "#breadcrumb" } } : {}),
        },
        ...(tool
          ? [
              {
                "@type": "WebApplication",
                name,
                url,
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Any",
                offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              },
            ]
          : []),
        ...(id === "" || tool || id === "cm-to-pixels"
          ? [
              faqSchema(
                id === ""
                  ? homeFaqs
                  : id === "cm-to-pixels"
                    ? calculatorFaqs
                    : toolFaqs(id),
              ),
            ]
          : []),
        ...(id
          ? [
              {
                "@type": "BreadcrumbList",
                "@id": url + "#breadcrumb",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "MyDocPro",
                    item: siteOrigin + "/",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: tool ? tool[1] : page.title,
                    item: url,
                  },
                ],
              },
            ]
          : []),
      ]
    : [];
  return {
    name,
    title:
      id === ""
        ? "MyDocPro – Free Image & PDF Tools, No Upload"
        : id === "resize-image" || name.includes("MyDocPro")
          ? name
          : name + " | MyDocPro",
    description,
    url,
    known,
    robots: known ? "index,follow,max-image-preview:large" : "noindex,follow",
    schema: { "@context": "https://schema.org", "@graph": graph },
  };
}
