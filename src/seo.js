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
    "Merge, split, compress or organize PDFs for free in your browser. Turn photos into PDFs or export pages as images, with no upload or sign-up.",
  ],
  "compress-image": [
    "Free Image Compressor – 20 KB, 50 KB or 100 KB",
    "Compress photos free to 20 KB, 50 KB, 100 KB or a custom target. Use JPG, PNG or WebP images and download the result as a JPG.",
  ],
  "resize-image": [
    "Resize Image in CM, MM & Pixels Online Free – Photo Size Changer",
    "Resize images in cm, mm or pixels with an optional KB limit. Set 3.5 × 4.5 cm at 300 DPI, preview the crop and download free. Files stay on your device.",
  ],
  "convert-image": [
    "Convert JPG, PNG and WebP Images Online Free",
    "Convert JPG to PNG, PNG to JPG, or images to and from WebP for free. Choose your output format and download without uploading your image.",
  ],
  "crop-image": [
    "Crop & Rotate Images Online Free",
    "Crop photos online free with square, passport or custom ratios. Rotate, drag the crop area and preview before downloading. No sign-up; files stay local.",
  ],
  "merge-pdf": [
    "Merge PDF Free – Combine Files, No Upload",
    "Merge PDF files and images into one document free, without uploading. Reorder page thumbnails, check the preview and download with no sign-up or watermark.",
  ],
  "split-pdf": [
    "Split PDF Online Free – Extract PDF Pages",
    "Split PDFs free by selecting pages or page ranges. Download one document or save each page as a separate PDF without uploading your file.",
  ],
  "compress-pdf": [
    "Compress PDF to 100 KB, 200 KB or 500 KB Free",
    "Compress PDFs free with a size target or custom quality. Supported embedded images are recompressed while preserving text. Processing stays in your browser.",
  ],
  "jpg-to-pdf": [
    "JPG to PDF Converter Online Free",
    "Convert JPG, PNG or WebP images to PDF free. Arrange photos, choose A4, Letter or image-sized pages, and download without an upload.",
  ],
  "exam-photo": [
    "Free Exam Photo Resizer for Application Forms",
    "Resize application photos to standard sizes for free. Choose DPI and maximum KB, then check your form’s requirements before downloading.",
  ],
  signature: [
    "Free Signature Cleaner for Online Forms",
    "Clean a scanned signature free on white paper. Adjust the threshold to keep faint pen strokes, preview and download as JPG, PNG or WebP.",
  ],
  "passport-sheet": [
    "Free Passport Photo Maker – 4 × 6 Inch or A4 Sheet",
    "Make a printable passport photo sheet on 4 × 6 inch or A4 paper. Choose photo size, DPI, copy count and optional cut guides, free in your browser.",
  ],
  "pdf-to-image": [
    "PDF to JPG Converter Online Free",
    "Convert PDF pages to JPG, PNG or WebP free. Choose pages and resolution, then download one image per page in your browser.",
  ],
  "organize-pdf": [
    "Organize PDF Free – Reorder, Rotate, Delete",
    "Rearrange, rotate or remove pages from a PDF online for free. Check the new page order in the preview and download the document without an upload.",
  ],
  "name-date": [
    "Add Name and Date on Photo Free for Exam Forms",
    "Add a name and date below your photo free for application forms. Preview the text strip and download the finished photo without an upload.",
  ],
  "join-images": [
    "Join Images Online Free – JPG or A4 PDF",
    "Join 2–6 images in a row, column or grid. Combine Aadhaar front and back on one page, adjust spacing and download a JPG or A4 PDF locally.",
  ],
  "white-background": [
    "Whiten a Light Photo Background Online Free",
    "Whiten a plain photo background online free. Adjust edge-connected colour matching, preview and download an image or A4 PDF. Files stay on your device.",
  ],
};
export function pageSeo(id = "") {
  const tool = tools.find((t) => t[0] === id);
  const page =
    id === "cm-to-pixels"
      ? {
          title: "CM to Pixels Converter – Free",
          description:
            "Convert cm, mm or inches to pixels and pixels to physical sizes at your chosen DPI. Check photo size tables and open a pre-filled image resizer free.",
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
