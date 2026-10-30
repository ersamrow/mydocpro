import { tools } from "./tools.js";
import { sitePages } from "./site-content.js";

export const siteOrigin = "https://mydocpro.co.in";
// Descriptions explain real functionality; no invented ratings or acceptance claims.
export const toolSearch = {
  "compress-image": [
    "Compress Image to a KB Limit Online",
    "Compress JPG, PNG or WebP images to a target KB size. Download a JPG, check the final dimensions and keep your photo processing on your device.",
  ],
  "resize-image": [
    "Resize Image in Pixels, CM, MM or Inches",
    "Resize photos in pixels, centimetres, millimetres or inches. Choose DPI, crop or white padding, and save JPG, PNG or WebP locally in your browser.",
  ],
  "convert-image": [
    "Convert JPG, PNG and WebP Images Online",
    "Convert images between JPG, PNG and WebP in your browser. Choose output quality and learn how conversion handles transparency and existing image detail.",
  ],
  "crop-image": [
    "Crop and Rotate Images Online",
    "Crop photos to square, portrait or widescreen ratios, rotate and adjust centre zoom. Process images locally and check framing before resizing.",
  ],
  "merge-pdf": [
    "Merge PDF Files Online for Free",
    "Combine PDFs and arrange pages in your browser without uploading documents. Preview page order, download the merged PDF and check document limitations.",
  ],
  "split-pdf": [
    "Split PDF and Extract Selected Pages",
    "Extract PDF pages using ranges such as 1-3, 8. Save a combined selection or separate files, with local processing and guidance on page numbering.",
  ],
  "compress-pdf": [
    "Compress Scanned PDF Files Online",
    "Reduce scanned PDFs using adjustable DPI and JPEG quality. Processing stays local; the result is image-only and does not retain searchable text or forms.",
  ],
  "jpg-to-pdf": [
    "Convert JPG, PNG and WebP to PDF",
    "Create a PDF from images in your browser. Arrange photos, choose A4, Letter or image-sized pages, and check readability before sharing your document.",
  ],
  "exam-photo": [
    "Resize Application Photos to Standard Sizes",
    "Prepare photos at generic 35 × 45 mm, 2 × 2 inch or 25 × 35 mm sizes. Set DPI and a KB limit, then check the receiving form’s actual requirements.",
  ],
  signature: [
    "Clean a Signature Image Background",
    "Clean a signature scan on white paper with an adjustable brightness threshold. Keep processing local and check faint strokes before using the image.",
  ],
  "passport-sheet": [
    "Create a 4 × 6 Inch Passport Photo Sheet",
    "Arrange four, six or eight photos on a 4 × 6 inch print sheet. Learn actual-size print settings and why eight-photo layouts use smaller photo areas.",
  ],
  "pdf-to-image": [
    "Convert PDF Pages to JPG, PNG or WebP",
    "Export selected PDF pages as JPG, PNG or WebP images. Choose rendering DPI, download each page and process smaller ranges to manage device memory.",
  ],
  "organize-pdf": [
    "Reorder, Rotate and Remove PDF Pages",
    "Organize PDF pages with previews and page-order controls. Reorder, rotate or remove pages locally, then inspect the downloaded document before submitting.",
  ],
  "name-date": [
    "Add a Name and Date Below a Photo",
    "Add a readable name and date strip below a photo in your browser. Check final dimensions and the receiving form’s rules before uploading the result.",
  ],
  "join-images": [
    "Combine a Photo and Signature Image",
    "Join a photo and signature vertically or side by side. Keep their proportions, process locally and download one image for forms that request it.",
  ],
  "white-background": [
    "Whiten a Light Image Background",
    "Whiten plain, light backgrounds with an adjustable brightness threshold. See the limits of this method and protect bright details in your subject.",
  ],
};
export function pageSeo(id = "") {
  const tool = tools.find((t) => t[0] === id);
  const page = Object.hasOwn(sitePages, id) ? sitePages[id] : null;
  const known = id === "" || Boolean(tool || page);
  const name = tool
    ? toolSearch[id][0]
    : page
      ? page.title
      : known
        ? "Free Image and PDF Tools"
        : "Page not found";
  const description = tool
    ? toolSearch[id][1]
    : page
      ? page.description
      : known
        ? "Free image and PDF tools that process files in your browser. Resize photos, compress images, merge PDFs and prepare signatures without uploading documents."
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
    title: name + " | MyDocPro",
    description,
    url,
    known,
    robots: known ? "index,follow,max-image-preview:large" : "noindex,follow",
    schema: { "@context": "https://schema.org", "@graph": graph },
  };
}
