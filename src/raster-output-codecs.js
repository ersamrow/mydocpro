import { checkpoint, throwIfCancelled } from "./file-validation.js";

function dimensions(canvas) {
  const { width, height } = canvas;
  if (
    !Number.isInteger(width) || !Number.isInteger(height) ||
    width < 1 || height < 1 || width > 12000 || height > 12000 ||
    width * height > 25000000
  ) throw Error("Use images under 25 megapixels and 12,000 pixels per side.");
  return { width, height };
}

async function encodeBmp(canvas, signal) {
  const { width, height } = dimensions(canvas);
  const pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const stride = Math.ceil(width * 3 / 4) * 4;
  const bytes = new Uint8Array(54 + stride * height);
  const view = new DataView(bytes.buffer);
  bytes.set([66, 77]);
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, stride * height, true);
  for (let y = 0; y < height; y++) {
    if ((y & 63) === 0) await checkpoint(signal);
    const row = 54 + (height - y - 1) * stride;
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      const alpha = pixels[source + 3] / 255;
      for (let channel = 0; channel < 3; channel++) {
        bytes[row + x * 3 + channel] = Math.round(
          pixels[source + 2 - channel] * alpha + 255 * (1 - alpha),
        );
      }
    }
  }
  return new Blob([bytes], { type: "image/bmp" });
}

async function encodeIco(canvas, signal) {
  const { width, height } = dimensions(canvas);
  const size = Math.min(256, Math.max(width, height));
  const icon = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(size, size)
    : document.createElement("canvas");
  icon.width = icon.height = size;
  try {
    const scale = Math.min(size / width, size / height);
    icon.getContext("2d").drawImage(
      canvas, (size - width * scale) / 2, (size - height * scale) / 2,
      width * scale, height * scale,
    );
    const png = typeof icon.convertToBlob === "function"
      ? await icon.convertToBlob({ type: "image/png" })
      : await new Promise((resolve, reject) => icon.toBlob(
          blob => blob ? resolve(blob) : reject(Error("Could not encode this icon.")),
          "image/png",
        ));
    throwIfCancelled(signal);
    const header = new Uint8Array(22);
    const view = new DataView(header.buffer);
    view.setUint16(2, 1, true);
    view.setUint16(4, 1, true);
    header[6] = header[7] = size === 256 ? 0 : size;
    view.setUint16(10, 1, true);
    view.setUint16(12, 32, true);
    view.setUint32(14, png.size, true);
    view.setUint32(18, 22, true);
    return new Blob([header, png], { type: "image/x-icon" });
  } finally {
    icon.width = icon.height = 1;
  }
}

async function encodeGif(canvas, quality, signal) {
  const { width, height } = dimensions(canvas);
  const module = await import("gifenc");
  // Browsers resolve the ESM build (default is the encoder function), while
  // Node resolves CommonJS (default is the exports object).
  const { GIFEncoder, quantize, applyPalette } =
    typeof module.quantize === "function" ? module : module.default;
  await checkpoint(signal);
  const pixels = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  let transparent = false;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] < 128) { transparent = true; break; }
  }
  // Reserve a separate transparent entry. Palette mapping must never make an
  // opaque black pixel transparent merely because its colour is a close match.
  const palette = quantize(pixels, transparent ? 255 : 256, { format: "rgb565" });
  await checkpoint(signal);
  const indexed = applyPalette(pixels, palette, "rgb565");
  if (transparent) {
    for (let i = 0; i < indexed.length; i++) {
      if ((i & 65535) === 0) await checkpoint(signal);
      indexed[i] = pixels[i * 4 + 3] < 128 ? 0 : indexed[i] + 1;
    }
    palette.unshift([0, 0, 0]);
  }
  const gif = GIFEncoder();
  gif.writeFrame(indexed, width, height, {
    palette, transparent, transparentIndex: 0, repeat: -1,
  });
  gif.finish();
  throwIfCancelled(signal);
  return new Blob([gif.bytes()], { type: "image/gif" });
}

// GIF exports one still frame with 1-bit transparency. BMP flattens onto white.
// ICO exports one PNG-backed square icon, at most 256px, with transparent padding.
export async function encodeRaster(canvas, type, quality = 0.92, signal) {
  throwIfCancelled(signal);
  if (type === "image/bmp") return encodeBmp(canvas, signal);
  if (type === "image/x-icon") return encodeIco(canvas, signal);
  if (type === "image/gif") return encodeGif(canvas, quality, signal);
  throw Error("Choose BMP, ICO or GIF for this encoder.");
}
