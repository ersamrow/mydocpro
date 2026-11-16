import { tools } from "./tools.js";
import { sitePages } from "./site-content.js";

export const siteOrigin = "https://mydocpro.co.in";
// Descriptions explain real functionality; no invented ratings or acceptance claims.
export const toolSearch = {
  "image-editor": [
    "Free Online Photo Editor, No Sign-up",
    "Crop, rotate and resize photos, or adjust brightness and contrast. Edit in your browser on your phone or computer and download without a watermark.",
  ],
  "pdf-toolkit": [
    "Free PDF Tools Online – Merge, Split, Compress",
    "Merge, split, compress or organize PDFs in your browser. Turn photos into a PDF or export PDF pages as images, with no upload or sign-up.",
  ],
  "compress-image": [
    "Compress Images for 20 KB, 50 KB or 100 KB Limits",
    "Choose a 20 KB, 50 KB, 100 KB or custom limit for JPG, PNG or WebP images. Compress photos in your browser and download the result as a JPG.",
  ],
  "resize-image": [
    "Resize an Image in CM, MM, Inches or Pixels",
    "Set photo dimensions in pixels, cm, mm or inches. Choose DPI and a crop or white padding, then save the resized image as JPG, PNG or WebP.",
  ],
  "convert-image": [
    "Convert JPG, PNG and WebP Images Online Free",
    "Convert JPG to PNG, PNG to JPG, or images to and from WebP. Choose your output format and download the converted image without uploading it.",
  ],
  "crop-image": [
    "Crop Images Online Free – Custom Aspect Ratios",
    "Set a custom crop or choose a square, 4:3, 16:9 or 35:45 frame. Rotate the photo, check the framing and download it in your browser.",
  ],
  "merge-pdf": [
    "Merge PDF Files Online Free – Combine PDFs",
    "Combine multiple PDFs into one file, arrange pages in the order you need and download the merged document. Your files stay on your device.",
  ],
  "split-pdf": [
    "Split PDF Online Free – Extract PDF Pages",
    "Extract selected pages or page ranges from a PDF. Download the selection as one document or save each page as a separate PDF without uploading it.",
  ],
  "compress-pdf": [
    "Compress Scanned PDFs Online Free",
    "Adjust resolution and JPEG quality to compress scanned PDFs in your browser. The output contains page images, so searchable text and forms are lost.",
  ],
  "jpg-to-pdf": [
    "JPG to PDF Converter Online Free",
    "Convert JPG, PNG or WebP images into a single PDF. Arrange photos in order, choose A4, Letter or image-sized pages, and download without an upload.",
  ],
  "exam-photo": [
    "Exam Photo Resizer for Application Forms",
    "Choose a 35 × 45 mm, 25 × 35 mm or 2 × 2 inch photo preset, DPI and maximum KB. Match the settings to the requirements on your application form.",
  ],
  signature: [
    "Clean a Signature Background for Online Forms",
    "Clean a scanned signature on white paper. Adjust the threshold to keep faint pen strokes, preview the result and download it as JPG, PNG or WebP.",
  ],
  "passport-sheet": [
    "Passport Photo Maker – Printable 4 × 6 Inch Sheet",
    "Arrange four, six or eight copies on a printable 4 × 6 inch sheet. Four or six give roughly 35 × 45 mm photos at actual size. Eight gives smaller prints.",
  ],
  "pdf-to-image": [
    "PDF to JPG Converter Online Free",
    "Convert all or selected PDF pages to JPG, PNG or WebP images. Choose a resolution and download one image per page in your browser.",
  ],
  "organize-pdf": [
    "Organize PDF Pages – Reorder, Rotate, Delete",
    "Rearrange, rotate or remove pages from a PDF online for free. Check the new page order in the preview and download the document without an upload.",
  ],
  "name-date": [
    "Add Name and Date on Photo for Exam Forms",
    "Add a name and date below your photo when an application form asks for them. Preview the text strip and download the finished photo without an upload.",
  ],
  "join-images": [
    "Join Two Images Online – Photo and Signature",
    "Combine a photo and signature into one image. Place them side by side or stack the photo above the signature, then download the result without an upload.",
  ],
  "white-background": [
    "Whiten a Light Photo Background Online",
    "Brighten a plain, light background to white. Adjust the brightness threshold and preview pale details in your photo before downloading it.",
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
    title: name.includes("MyDocPro") ? name : name + " | MyDocPro",
    description,
    url,
    known,
    robots: known ? "index,follow,max-image-preview:large" : "noindex,follow",
    schema: { "@context": "https://schema.org", "@graph": graph },
  };
}
