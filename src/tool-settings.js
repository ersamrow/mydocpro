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
    ],
    "convert-image": [
      format(),
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
        ...number("threshold", "White threshold (0–255)", 225, 0, 255, 1),
        type: "range",
      },
      format(),
    ],
    "passport-sheet": [
      select("copies", "Photos per sheet", [
        ["6", "6 photos"],
        ["4", "4 photos"],
        ["8", "8 photos"],
      ]),
    ],
    "name-date": [
      text("name", "Name", "", "Your name", 60),
      { id: "date", label: "Date", value: "", type: "date" },
    ],
    "join-images": [
      select("layout", "Arrangement", [
        ["vertical", "Photo above signature"],
        ["horizontal", "Side by side"],
      ]),
    ],
    "split-pdf": [
      text("pages", "Pages to extract", "1", "e.g. 1-3, 5, 8"),
      select("mode", "Download as", [
        ["one", "One PDF"],
        ["each", "Separate PDF per page"],
      ]),
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
        ["portrait", "Portrait"],
        ["landscape", "Landscape"],
      ]),
    ],
    "pdf-to-image": [
      format(),
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
export const multiTools = ["merge-pdf", "jpg-to-pdf", "join-images"];
export function validateFiles(incoming, current, { pdf, multi, replace }) {
  for (const f of incoming) {
    if (
      pdf ? !/\.pdf$/i.test(f.name) : !/^image\/(jpeg|png|webp)$/.test(f.type)
    )
      throw Error(
        pdf
          ? "Please choose PDF files."
          : "Please choose JPG, PNG or WebP images.",
      );
    if (f.size > (pdf ? 100 : 25) * 1048576)
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
  n >= 1048576
    ? (n / 1048576).toFixed(2) + " MB"
    : (n / 1024).toFixed(1) + " KB";
