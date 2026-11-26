import { throwIfCancelled, checkpoint } from "./file-validation.js";
import { setImageDensity } from "./image-metadata.js";
import { removeBackground } from "./background-removal.js";
import { pixelsPerUnit } from "./image-dimensions.js";
function canvas(w, h) {
  w = Math.round(w);
  h = Math.round(h);
  if (w < 1 || h < 1 || w * h > 25000000 || w > 12000 || h > 12000)
    throw Error(
      "Output dimensions are too large or too small. Use at most 25 megapixels and 12,000 pixels per side.",
    );
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
const blob = async (c, type = "image/jpeg", q = 0.92, signal) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    const { encodeRaster: encodeAdditionalFormat } =
      await import("./raster-output-codecs.js");
    return encodeAdditionalFormat(c, type, q, signal);
  }
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b && b.type === type
          ? resolve(b)
          : reject(Error("This browser could not encode the image.")),
      type,
      q,
    ),
  );
};
const normalizedImages = new WeakMap();
let heifDecoder;
function loadHeifDecoder() {
  if (!heifDecoder) {
    const decoderUrl = `/heic-decoder-${process.env.NEXT_PUBLIC_HEIF_VERSION}.js`;
    heifDecoder = import(/* webpackIgnore: true */ decoderUrl)
      .then((module) => module.default())
      .catch((error) => {
        heifDecoder = null;
        throw error;
      });
  }
  return heifDecoder;
}
export function isHeif(file) {
  return (
    /image\/(heic|heif)/i.test(file.type) ||
    /\.(heic|heif)$/i.test(file.name || "")
  );
}
export async function normalizeImageFile(file, signal) {
  throwIfCancelled(signal);
  if (!isHeif(file)) return file;
  if (normalizedImages.has(file)) return normalizedImages.get(file);
  const conversion = (async () => {
    const libheif = await loadHeifDecoder();
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
    if (!images.length)
      throw Error("This HEIC/HEIF image could not be decoded.");
    try {
      const first = images[0],
        width = first.get_width(),
        height = first.get_height();
      if (width * height > 25000000 || width > 12000 || height > 12000)
        throw Error(
          "Please use a HEIC/HEIF image under 25 megapixels and 12,000 pixels per side.",
        );
      const c = canvas(width, height),
        context = c.getContext("2d");
      const pixels = context.createImageData(width, height);
      await new Promise((resolve, reject) =>
        first.display(pixels, (result) =>
          result
            ? resolve()
            : reject(Error("Could not decode this HEIC/HEIF image.")),
        ),
      );
      context.putImageData(pixels, 0, 0);
      const png = await blob(c, "image/png");
      c.width = c.height = 1;
      return new File(
        [png],
        (file.name || "image.heic").replace(/\.(heic|heif)$/i, ".png"),
        { type: "image/png", lastModified: file.lastModified },
      );
    } finally {
      for (const image of images) image.free?.();
    }
  })();
  normalizedImages.set(file, conversion);
  try {
    const result = await conversion;
    throwIfCancelled(signal);
    return result;
  } catch (error) {
    normalizedImages.delete(file);
    throw error;
  }
}
export async function loadImage(f) {
  f = await normalizeImageFile(f);
  const url = URL.createObjectURL(f);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    if (im.width * im.height > 50000000)
      throw Error("Please use an image under 50 megapixels.");
    return im;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function draw(
  im,
  w = im.width,
  h = im.height,
  fit = "contain",
  background = "#fff",
  smoothingQuality,
) {
  const c = canvas(w, h),
    x = c.getContext("2d");
  if (smoothingQuality) x.imageSmoothingQuality = smoothingQuality;
  if (background) {
    x.fillStyle = background;
    x.fillRect(0, 0, c.width, c.height);
  }
  if (fit === "stretch") x.drawImage(im, 0, 0, c.width, c.height);
  else {
    const s = Math[fit === "cover" ? "max" : "min"](
      c.width / im.width,
      c.height / im.height,
    );
    x.drawImage(
      im,
      (c.width - im.width * s) / 2,
      (c.height - im.height * s) / 2,
      im.width * s,
      im.height * s,
    );
  }
  return c;
}
// Render the same 300 DPI A4 canvas for preview, raster download and PDF.
function onA4Page(source, widthMm, marginMm, position) {
  const pixelsPerMm = 300 / 25.4;
  const page = canvas(210 * pixelsPerMm, 297 * pixelsPerMm);
  const context = page.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, page.width, page.height);
  const fit = Math.min(
    (Math.min(widthMm, 210 - marginMm * 2) * pixelsPerMm) / source.width,
    ((297 - marginMm * 2) * pixelsPerMm) / source.height,
  );
  const width = source.width * fit,
    height = source.height * fit;
  context.drawImage(
    source,
    (page.width - width) / 2,
    position === "center" ? (page.height - height) / 2 : marginMm * pixelsPerMm,
    width,
    height,
  );
  source.width = source.height = 1;
  return page;
}
async function a4Pdf(source, signal) {
  const { PDFDocument } = await import("pdf-lib");
  throwIfCancelled(signal);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(
    await (await blob(source, "image/jpeg", 0.94, signal)).arrayBuffer(),
  );
  const page = pdf.addPage([595.28, 841.89]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });
  throwIfCancelled(signal);
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
export async function compress(
  c,
  kb,
  preserveDimensions = false,
  signal,
  maxQuality = 0.98,
) {
  return compressCanvasToTarget(c, kb, {
    preserveDimensions,
    signal,
    maxQuality,
    // Keep fixed-size form outputs unchanged. General compression can trade
    // pixel dimensions for cleaner JPEG detail instead of severe blocking.
    minQuality: preserveDimensions ? 0.03 : 0.7,
  });
}
export function byteBudget(kb, minKB = 0, factor = 0.97) {
  if (!Number.isFinite(+kb) || +kb <= 0)
    throw Error("Enter a positive size limit.");
  return Math.floor(Math.max(minKB * 1000, kb * 1000 * factor));
}
export async function compressCanvasToTarget(
  c,
  kb,
  {
    type = "image/jpeg",
    preserveDimensions = false,
    signal,
    maxQuality = 0.98,
    minQuality = 0.03,
    minKB = 0,
    headroom = 0.97,
  } = {},
) {
  const max = byteBudget(kb, minKB, headroom);
  const source = c;
  const minimumQuality = Math.min(minQuality, maxQuality);
  for (let attempt = 0; attempt < 24; attempt++) {
    await checkpoint(signal);
    const highQuality = await blob(c, type, maxQuality);
    if (highQuality.size <= max) return highQuality;
    const lowestQuality =
      type === "image/png" || minimumQuality === maxQuality
        ? highQuality
        : await blob(c, type, minimumQuality, signal);
    let low = minimumQuality,
      high = maxQuality,
      best = lowestQuality.size <= max ? lowestQuality : null;
    for (let i = 0; best && i < (type === "image/png" ? 0 : 11); i++) {
      await checkpoint(signal);
      const q = (low + high) / 2,
        b = await blob(c, type, q);
      if (b.size <= max) {
        best = b;
        low = q;
      } else high = q;
    }
    if (best) return best;
    if (preserveDimensions)
      throw Error(
        "Cannot reach this file size at the requested dimensions. Increase the size limit or lower the DPI.",
      );
    if (c.width === 1 && c.height === 1) break;
    const reduction =
      minQuality > 0.03
        ? Math.min(
            0.85,
            Math.max(0.5, Math.sqrt(max / lowestQuality.size) * 0.98),
          )
        : 0.85;
    const smaller = draw(
      source,
      Math.max(1, c.width * reduction),
      Math.max(1, c.height * reduction),
      "contain",
      type === "image/jpeg" ? "#fff" : null,
      "high",
    );
    if (c !== source) c.width = c.height = 1;
    c = smaller;
  }
  throw Error("Cannot reach the requested size. Try a larger limit.");
}
export { blob as encodeCanvas };

export function whitenPaper(c, threshold, darkenInk = false) {
  const context = c.getContext("2d");
  const pixels = context.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const light =
      0.299 * pixels.data[i] +
      0.587 * pixels.data[i + 1] +
      0.114 * pixels.data[i + 2];
    if (light >= threshold)
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    else if (darkenInk)
      pixels.data[i] =
        pixels.data[i + 1] =
        pixels.data[i + 2] =
          Math.max(0, light * 0.5);
  }
  context.putImageData(pixels, 0, 0);
}
// Flood from the outer edge only: similarly coloured pixels inside a subject
// are not background unless connected to that edge.
export async function whitenConnectedBackground(c, tolerance, signal) {
  throwIfCancelled(signal);
  const context = c.getContext("2d"),
    pixels = context.getImageData(0, 0, c.width, c.height);
  const data = pixels.data,
    width = c.width,
    height = c.height,
    count = width * height;
  // Keep RGB colours together. Independent channel medians can invent a
  // colour absent from the border when hair or clothing touches the edges.
  const samples = new Map();
  const sample = (index) => {
    const colour = Array.from(data.subarray(index * 4, index * 4 + 3));
    const key = colour.join(",");
    const existing = samples.get(key);
    if (existing) existing.count++;
    else samples.set(key, { colour, count: 1 });
  };
  // Fewer than 1,024 samples, independent of input resolution.
  const stride = Math.max(1, Math.floor((width + height) / 256));
  for (let x = 0; x < width; x += stride) {
    sample(x);
    sample((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += stride) {
    sample(y * width);
    sample(y * width + width - 1);
  }
  let dominant,
    bestScore = -1,
    checked = 0;
  for (const candidate of samples.values()) {
    if ((checked++ & 63) === 0) await checkpoint(signal);
    let score = 0;
    for (const sample of samples.values()) {
      if (
        Math.max(
          Math.abs(candidate.colour[0] - sample.colour[0]),
          Math.abs(candidate.colour[1] - sample.colour[1]),
          Math.abs(candidate.colour[2] - sample.colour[2]),
        ) <= tolerance
      )
        score += sample.count;
    }
    if (
      score > bestScore ||
      (score === bestScore && candidate.count > dominant.count)
    ) {
      dominant = candidate;
      bestScore = score;
    }
  }
  const colour = dominant.colour;
  const visited = new Uint8Array(count),
    queue = new Uint32Array(count);
  let head = 0,
    tail = 0;
  const enqueue = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    if (
      data[offset + 3] > 0 &&
      Math.max(
        Math.abs(data[offset] - colour[0]),
        Math.abs(data[offset + 1] - colour[1]),
        Math.abs(data[offset + 2] - colour[2]),
      ) > tolerance
    )
      return;
    visited[index] = 2;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    if ((head & 65535) === 0) await checkpoint(signal);
    const index = queue[head++],
      x = index % width;
    if (x) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index < count - width) enqueue(index + width);
  }
  for (let at = 0; at < tail; at++) {
    if ((at & 65535) === 0) await checkpoint(signal);
    const index = queue[at],
      x = index % width;
    const boundary =
      (x > 0 && visited[index - 1] !== 2) ||
      (x < width - 1 && visited[index + 1] !== 2) ||
      (index >= width && visited[index - width] !== 2) ||
      (index < count - width && visited[index + width] !== 2);
    const blend = boundary ? 0.65 : 1;
    for (let channel = 0; channel < 3; channel++)
      data[index * 4 + channel] += (255 - data[index * 4 + channel]) * blend;
    data[index * 4 + 3] = 255;
  }
  throwIfCancelled(signal);
  context.putImageData(pixels, 0, 0);
}
export function formatPhotoDate(value, format = "DD-MM-YYYY") {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw Error("Choose a valid date.");
  const [, year, month, day] = match;
  return format === "YYYY-MM-DD"
    ? value
    : [day, month, year].join(format === "DD/MM/YYYY" ? "/" : "-");
}
export async function processImage(id, files, values, preview = false, signal) {
  const val = (id) => values[id];
  const num = (id, min, max) => {
    const n = Number(val(id));
    if (!Number.isFinite(n) || n < min || n > max)
      throw Error(`Enter a valid ${id} between ${min} and ${max}.`);
    return n;
  };
  await checkpoint(signal);
  const im = await loadImage(files[0]);
  throwIfCancelled(signal);
  let c, b, outputDpi;
  const warnings = [];
  const type = val("format") || "image/jpeg";
  if (id === "compress-image") {
    const w = Math.min(im.width, num("maxWidth", 1, 10000));
    c = draw(im, w, (im.height * w) / im.width);
    if (!preview) b = await compress(c, num("target", 1, 25000), false, signal);
  } else if (id === "resize-image") {
    const dpi = num("dpi", 1, 1200),
      factor = pixelsPerUnit(val("unit"), dpi);
    c = draw(
      im,
      num("width", val("unit") === "px" ? 1 : 0.000001, 12000) * factor,
      num("height", val("unit") === "px" ? 1 : 0.000001, 12000) * factor,
      val("fit"),
      type === "image/jpeg" || val("fit") === "contain" ? "#fff" : null,
    );
    outputDpi = dpi;
    if (Math.max(c.width / im.width, c.height / im.height) > 1.5)
      warnings.push(
        "Upscaling above 1.5× can make this image look soft. Use a larger original for sharper output.",
      );
    if (
      val("fit") === "stretch" &&
      Math.abs(c.width / c.height / (im.width / im.height) - 1) > 0.05
    )
      warnings.push(
        "Stretch changes the original aspect ratio by more than 5%; the image may look distorted.",
      );
  } else if (id === "exam-photo") {
    let [w, h] = val("preset").split(",").map(Number);
    if (w === 51) w = h = 50.8;
    const dpi = num("dpi", 72, 600);
    outputDpi = dpi;
    c = draw(im, (w * dpi) / 25.4, (h * dpi) / 25.4, "cover");
    if (!preview) b = await compress(c, num("target", 1, 25000), true, signal);
  } else if (id === "crop-image") {
    const rotation = +val("rotation"),
      swap = rotation % 180 !== 0;
    const rotated = canvas(
        swap ? im.height : im.width,
        swap ? im.width : im.height,
      ),
      ctx = rotated.getContext("2d");
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(im, -im.width / 2, -im.height / 2);
    const ratio = ["original", "free"].includes(val("ratio"))
      ? rotated.width / rotated.height
      : +val("ratio");
    let w = rotated.width,
      h = w / ratio;
    if (h > rotated.height) {
      h = rotated.height;
      w = h * ratio;
    }
    const zoom = num("zoom", 100, 500) / 100;
    w /= zoom;
    h /= zoom;
    let sx = (rotated.width - w) / 2,
      sy = (rotated.height - h) / 2;
    if (Number(val("crop-w")) > 0 && Number(val("crop-h")) > 0) {
      sx = Number(val("crop-x")) * rotated.width;
      sy = Number(val("crop-y")) * rotated.height;
      w = Number(val("crop-w")) * rotated.width;
      h = Number(val("crop-h")) * rotated.height;
    }
    const imageZoom = Number(val("image-zoom") || 100) / 100;
    const imagePanX = Number(val("image-pan-x") || 0),
      imagePanY = Number(val("image-pan-y") || 0);
    if (
      !Number.isFinite(imageZoom) ||
      imageZoom < 1 ||
      imageZoom > 4 ||
      !Number.isFinite(imagePanX) ||
      !Number.isFinite(imagePanY)
    )
      throw Error("Invalid image zoom or position.");
    sx =
      ((sx / rotated.width - 0.5 - imagePanX) / imageZoom + 0.5) *
      rotated.width;
    sy =
      ((sy / rotated.height - 0.5 - imagePanY) / imageZoom + 0.5) *
      rotated.height;
    w /= imageZoom;
    h /= imageZoom;
    c = canvas(w, h);
    if (type === "image/jpeg") {
      c.getContext("2d").fillStyle = "#fff";
      c.getContext("2d").fillRect(0, 0, c.width, c.height);
    }
    c.getContext("2d").drawImage(
      rotated,
      sx,
      sy,
      w,
      h,
      0,
      0,
      c.width,
      c.height,
    );
  } else if (id === "remove-background") {
    const background = val("background") || "white";
    c = await removeBackground(
      draw(im),
      { background, edge: num("edge", 0, 100), shift: num("shift", -30, 30) },
      signal,
    );
    if (background === "transparent" && type === "image/jpeg") {
      const flat = canvas(c.width, c.height),
        flatContext = flat.getContext("2d");
      flatContext.fillStyle = "#fff";
      flatContext.fillRect(0, 0, flat.width, flat.height);
      flatContext.drawImage(c, 0, 0);
      c = flat;
      warnings.push(
        "JPG cannot store transparency, so the background was filled with white. Choose PNG or WebP to keep it transparent.",
      );
    }
  } else if (id === "signature" || id === "white-background") {
    c = draw(im);
    if (id === "white-background") {
      await whitenConnectedBackground(c, num("threshold", 0, 255), signal);
      if (val("printPage") === "a4" || type === "application/pdf") {
        c = onA4Page(
          c,
          val("printWidth") === undefined ? 35 : num("printWidth", 20, 190),
          val("printMargin") === undefined ? 10 : num("printMargin", 5, 40),
          val("printPosition"),
        );
        outputDpi = 300;
      }
      if (type === "application/pdf" && !preview) return a4Pdf(c, signal);
    } else whitenPaper(c, num("threshold", 0, 255), true);
  } else if (id === "passport-sheet") {
    const dpi = val("dpi") ? num("dpi", 72, 600) : 300;
    outputDpi = dpi;
    const paper = val("paper") === "a4" ? [210, 297] : [101.6, 152.4];
    const photoSize = String(val("photoSize") || "35,45")
      .split(",")
      .map(Number);
    if (!["35,45", "50.8,50.8", "25,35", "20,25"].includes(photoSize.join(",")))
      throw Error("Choose a supported photo size.");
    c = canvas((paper[0] * dpi) / 25.4, (paper[1] * dpi) / 25.4);
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    const n = +val("copies"),
      pw = Math.round((photoSize[0] * dpi) / 25.4),
      ph = Math.round((photoSize[1] * dpi) / 25.4);
    let gap = Math.round((2 * dpi) / 25.4),
      margin = Math.round((2 * dpi) / 25.4),
      cols = Math.max(1, Math.floor((c.width - margin * 2 + gap) / (pw + gap))),
      rows = Math.ceil(n / cols);
    if (!Number.isInteger(n) || n < 1 || n > 40)
      throw Error("Choose between 1 and 40 photos.");
    if (rows * ph + (rows - 1) * gap > c.height - margin * 2) {
      gap = margin = 0;
      cols = Math.max(1, Math.floor(c.width / pw));
      rows = Math.ceil(n / cols);
    }
    if (rows * ph + (rows - 1) * gap > c.height - margin * 2)
      throw Error(
        "These photos do not fit at the selected size. Choose fewer copies or A4 paper.",
      );
    const photo = draw(im, pw, ph, "cover");
    for (let i = 0; i < n; i++) {
      const left =
        (c.width - cols * pw - (cols - 1) * gap) / 2 + (i % cols) * (pw + gap);
      const top =
        (c.height - rows * ph - (rows - 1) * gap) / 2 +
        Math.floor(i / cols) * (ph + gap);
      x.drawImage(photo, left, top, pw, ph);
      if (val("cutGuides") === "yes") {
        x.strokeStyle = "#777";
        x.lineWidth = Math.max(1, dpi / 150);
        x.setLineDash([dpi / 50, dpi / 75]);
        x.strokeRect(left, top, pw, ph);
      }
    }
  } else if (id === "name-date") {
    if (!val("name").trim()) throw Error("Enter a name for the text strip.");
    const w = Math.max(im.width, 600),
      h = (im.height * w) / im.width,
      strip = Math.round(w * 0.16);
    c = canvas(w, h + strip);
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0, w, h);
    x.fillStyle = "#171717";
    x.textAlign = "center";
    x.font = `${Math.round(w * 0.045)}px sans-serif`;
    x.fillText(val("name").trim(), w / 2, h + strip * 0.42, w * 0.9);
    x.font = `${Math.round(w * 0.032)}px sans-serif`;
    x.fillText(
      formatPhotoDate(val("date"), val("dateFormat")),
      w / 2,
      h + strip * 0.78,
      w * 0.9,
    );
  } else if (id === "join-images") {
    if (files.length < 2 || files.length > 6)
      throw Error("Choose 2–6 images to join.");
    const images = [im];
    for (const file of files.slice(1)) {
      await checkpoint(signal);
      images.push(await loadImage(file));
    }
    const layout =
      val("preset") === "aadhaar" ? "vertical" : val("layout") || "vertical";
    const spacing = val("spacing") === undefined ? 16 : num("spacing", 0, 500);
    const boxes = [];
    let width, height;
    if (layout === "grid") {
      const cols = images.length > 4 ? 3 : 2,
        rows = Math.ceil(images.length / cols);
      const side = Math.min(
        1000,
        Math.max(...images.map((image) => Math.max(image.width, image.height))),
      );
      width = cols * side + (cols - 1) * spacing;
      height = rows * side + (rows - 1) * spacing;
      images.forEach((image, index) => {
        const scale = Math.min(side / image.width, side / image.height);
        boxes.push([
          (index % cols) * (side + spacing) + (side - image.width * scale) / 2,
          Math.floor(index / cols) * (side + spacing) +
            (side - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        ]);
      });
    } else if (layout === "horizontal") {
      height = Math.min(1400, Math.max(...images.map((image) => image.height)));
      width = 0;
      images.forEach((image, index) => {
        const w = (image.width * height) / image.height;
        boxes.push([width, 0, w, height]);
        width += w + (index < images.length - 1 ? spacing : 0);
      });
    } else {
      width = Math.min(2000, Math.max(...images.map((image) => image.width)));
      height = 0;
      images.forEach((image, index) => {
        const h = (image.height * width) / image.width;
        boxes.push([0, height, width, h]);
        height += h + (index < images.length - 1 ? spacing : 0);
      });
    }
    const scale = Math.min(
      1,
      12000 / width,
      12000 / height,
      Math.sqrt(25000000 / (width * height)),
    );
    c = canvas(width * scale, height * scale);
    const context = c.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, c.width, c.height);
    images.forEach((image, index) =>
      context.drawImage(image, ...boxes[index].map((value) => value * scale)),
    );
    const a4 =
      type === "application/pdf" ||
      val("joinPage") === "a4" ||
      (val("joinPage") !== "tight" && val("preset") === "aadhaar");
    if (a4) {
      c = onA4Page(
        c,
        val("joinWidth") === undefined ? 86 : num("joinWidth", 20, 190),
        val("joinMargin") === undefined ? 10 : num("joinMargin", 5, 40),
        val("joinPosition"),
      );
      outputDpi = 300;
    }
    if (type === "application/pdf" && !preview) return a4Pdf(c, signal);
  } else
    c = draw(
      im,
      im.width,
      im.height,
      "contain",
      type === "image/jpeg" ? "#fff" : null,
    );
  const outputType = type === "application/pdf" ? "image/jpeg" : type;
  if (!preview && val("maxKB") && ["resize-image", "name-date"].includes(id)) {
    const maxKB = num("maxKB", 1, 25000);
    // Reserve metadata bytes inside the 3% margin, without rescaling an exact resize.
    b = await compressCanvasToTarget(
      c,
      (byteBudget(maxKB) - (outputDpi ? 32 : 0)) / 1000,
      {
        type: outputType,
        preserveDimensions: id === "resize-image",
        signal,
        headroom: 1,
        maxQuality: 0.94,
      },
    );
  }
  b =
    b ||
    (await blob(
      c,
      outputType,
      id === "convert-image" ? num("quality", 1, 100) / 100 : 0.94,
      signal,
    ));
  throwIfCancelled(signal);
  if (!preview && outputDpi) b = await setImageDensity(b, outputDpi);
  if (warnings.length) b.warnings = warnings;
  return b;
}
export async function adjustImage(file, values, signal) {
  await checkpoint(signal);
  const im = await loadImage(file);
  const c = canvas(im.width, im.height),
    x = c.getContext("2d");
  const limits = {
    brightness: [0, 200],
    contrast: [0, 200],
    saturation: [0, 200],
    grayscale: [0, 100],
    sepia: [0, 100],
    blur: [0, 10],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (
      !Number.isFinite(+values[key]) ||
      +values[key] < min ||
      +values[key] > max
    )
      throw Error(`Invalid ${key}.`);
  }
  x.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%) grayscale(${values.grayscale}%) sepia(${values.sepia}%) blur(${values.blur}px)`;
  x.translate(values.flipX ? c.width : 0, values.flipY ? c.height : 0);
  x.scale(values.flipX ? -1 : 1, values.flipY ? -1 : 1);
  x.drawImage(im, 0, 0);
  throwIfCancelled(signal);
  return blob(c, "image/png");
}
