import { conversionFormats } from "./image-formats.js";
const number = (id, label, value, min, max, step) => ({
  id,
  label,
  value,
  type: "number",
  min,
  max,
  step,
});
const select = (id, label, options) => ({
  id,
  label,
  value: options[0][0],
  options,
});
const text = (id, label, value = "", placeholder = "", maxLength) => ({
  id,
  label,
  value,
  type: "text",
  placeholder,
  maxLength,
});
const format = () =>
  select("format", "Output format", [
    ["image/jpeg", "JPG"],
    ["image/png", "PNG"],
    ["image/webp", "WebP"],
  ]);
const rotation = () =>
  select("rotation", "Rotation", [
    ["0", "0°"],
    ["90", "90° clockwise"],
    ["180", "180°"],
    ["270", "270° clockwise"],
  ]);
export function fields(id) {
  const configs = {
    "compress-image": [
      number("target", "Maximum size (KB)", 50, 1, 25000),
      number("maxWidth", "Maximum width (px)", 2000, 1, 10000),
    ],
    "resize-image": [
      number("width", "Width", 3.5, 0.1, 12000, 0.1),
      number("height", "Height", 4.5, 0.1, 12000, 0.1),
      select("unit", "Unit", [
        ["cm", "Centimetres"],
        ["px", "Pixels"],
        ["mm", "Millimetres"],
        ["in", "Inches"],
      ]),
      number("dpi", "DPI", 300, 1, 1200),
      select("fit", "Fit", [
        ["contain", "Fit inside (white padding)"],
        ["cover", "Fill (centre crop)"],
        ["stretch", "Stretch"],
      ]),
      format(),
      number("maxKB", "Max size (KB, optional)", "", 1, 25000),
    ],
    "convert-image": [
      select("format", "Output format", conversionFormats.map(([mime, label]) => [mime, label])),
      number("quality", "Quality (1–100)", 92, 1, 100),
    ],
    "crop-image": [
      select("ratio", "Crop ratio", [
        ["free", "Freeform (unlocked)"],
        ["original", "Original ratio"],
        ["1", "Square"],
        ["0.7777778", "Passport 35:45"],
        ["1.3333333", "4:3"],
        ["1.7777778", "16:9"],
        ["0.75", "3:4"],
        ["0.8", "4:5"],
        ["0.5625", "9:16"],
        ["0.8695652174", "Exam photo 200 × 230"],
        ["2.3333333333", "Signature 140 × 60"],
      ]),
      rotation(),
      number("zoom", "Crop zoom (%)", 100, 100, 500),
    ],
    "exam-photo": [
      select("preset", "Standard photo size", [
        ["35,45", "35 × 45 mm"],
        ["51,51", "2 × 2 inches (50.8 mm)"],
        ["25,35", "25 × 35 mm"],
      ]),
      number("target", "Maximum size (KB)", 50, 1, 25000),
      number("dpi", "DPI", 300, 72, 600),
    ],
    signature: [
      {
        ...number("threshold", "White threshold (0–255)", 170, 0, 255, 1),
        type: "range",
      },
      format(),
    ],
    "white-background": [
      {
        ...number("threshold", "Background tolerance (0–255)", 35, 0, 255, 1),
        type: "range",
      },
      format(),
    ],
    "passport-sheet": [
      select("photoSize", "Photo size", [
        ["35,45", "35 × 45 mm"],
        ["50.8,50.8", "2 × 2 inches"],
        ["25,35", "25 × 35 mm"],
        ["20,25", "20 × 25 mm stamp"],
      ]),
      select("paper", "Paper", [
        ["4x6", "4 × 6 inches"],
        ["a4", "A4"],
      ]),
      number("dpi", "DPI", 300, 72, 600),
      select("cutGuides", "Cut guides", [
        ["no", "Off"],
        ["yes", "On"],
      ]),
      select("copies", "Photos per sheet", [
        ["6", "6 photos"],
        ["4", "4 photos"],
        ["8", "8 photos"],
      ]),
    ],
    "name-date": [
      text("name", "Name", "", "Your name", 60),
      { id: "date", label: "Date", value: "", type: "date" },
      select("dateFormat", "Date format", [
        ["DD-MM-YYYY", "DD-MM-YYYY"],
        ["DD/MM/YYYY", "DD/MM/YYYY"],
        ["YYYY-MM-DD", "YYYY-MM-DD"],
      ]),
      number("maxKB", "Max size (KB, optional)", "", 1, 25000),
    ],
    "join-images": [
      select("preset", "Preset", [
        ["custom", "Custom"],
        ["aadhaar", "Aadhaar front + back"],
      ]),
      select("layout", "Arrangement", [
        ["vertical", "Vertical"],
        ["horizontal", "Side by side"],
        ["grid", "Grid"],
      ]),
      number("spacing", "Spacing (px)", 16, 0, 500),
      select("format", "Output format", [
        ["image/jpeg", "JPG"],
        ["application/pdf", "A4 PDF"],
      ]),
    ],
    "split-pdf": [
      text("pages", "Pages to extract", "1", "e.g. 1-3, 5, 8"),
      select("mode", "Download as", [
        ["one", "One PDF"],
        ["each", "Separate PDF per page"],
        ["every", "Split every N pages"],
      ]),
      number("every", "Pages per PDF", 2, 1, 300),
    ],
    "organize-pdf": [
      text(
        "pages",
        "Pages in output order",
        "all",
        "e.g. 3, 1, 2 (omit pages to delete)",
      ),
      rotation(),
    ],
    "compress-pdf": [
      number("target", "Max PDF size (KB, optional)", "", 1, 100000),
      number("dpi", "Render resolution (DPI)", 110, 36, 200),
      number("quality", "JPEG quality (1–100)", 65, 1, 100),
    ],
    "jpg-to-pdf": [
      select("pageSize", "Page size", [
        ["a4", "A4"],
        ["letter", "Letter"],
        ["fit", "Fit to image"],
      ]),
      select("orientation", "Orientation", [
        ["auto", "Auto — per image"],
        ["portrait", "Portrait"],
        ["landscape", "Landscape"],
      ]),
      number("quality", "Image quality (1–100)", 92, 1, 100),
      number("target", "Max PDF size (KB, optional)", "", 1, 100000),
      number("margin", "Margin (mm)", 8.5, 0, 50, 0.5),
    ],
    "pdf-to-image": [
      format(),
      number("target", "Max size per image (KB, optional)", "", 1, 25000),
      number("dpi", "Render resolution (DPI)", 150, 36, 300),
      text("pages", "Pages", "all", "all or 1-3, 5"),
    ],
  };
  return [
    ...(configs[id] || []),
    text(
      "output-name",
      "Output filename",
      "",
      "Optional — use the default name",
      120,
    ),
  ];
}
export const defaults = (id) =>
  Object.fromEntries(fields(id).map((f) => [f.id, String(f.value)]));
export const pdfTools = [
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "pdf-to-image",
  "organize-pdf",
];
export const batchTools = ["compress-image", "resize-image", "convert-image"];
export const multiTools = [
  "merge-pdf",
  "jpg-to-pdf",
  "join-images",
  ...batchTools,
];
export function validateFiles(
  incoming,
  current,
  { pdf, multi, replace, allowImages = false },
) {
  for (const f of incoming) {
    const isPdf = /\.pdf$/i.test(f.name);
    const isImage =
      /^image\/(jpeg|png|webp|heic|heif|avif|bmp|x-icon|vnd.microsoft.icon|gif)$/.test(f.type) ||
      /\.(avif|bmp|ico|gif)$/i.test(f.name) ||
      /\.hei[cf]$/i.test(f.name);
    if (pdf ? !(isPdf || (allowImages && isImage)) : !isImage)
      throw Error(
        pdf
          ? allowImages
            ? "Please choose PDFs or JPG, PNG, WebP, HEIC or HEIF images."
            : "Please choose PDF files."
          : "Please choose JPG, PNG, WebP, AVIF, BMP, ICO, GIF, HEIC or HEIF images.",
      );
    if (!f.size) throw Error(f.name + " is empty. Choose a file with content.");
    if (f.size > (pdf && isPdf ? 100 : 25) * 1048576)
      throw Error(f.name + " exceeds the file-size limit.");
  }
  const next = multi
    ? replace
      ? incoming
      : [...current, ...incoming]
    : incoming.slice(0, 1);
  if (next.length > 50)
    throw Error("Please process at most 50 files at a time.");
  if (next.reduce((n, f) => n + f.size, 0) > 100 * 1048576)
    throw Error("Please keep the total input under 100 MB.");
  return next;
}
export const size = (n) =>
  n >= 1000000
    ? (n / 1000000).toFixed(2) + " MB"
    : (n / 1000).toFixed(1) + " KB";
