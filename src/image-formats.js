export const conversionFormats = [
  ["image/jpeg", "JPG", "Photos"],
  ["image/png", "PNG", "Lossless"],
  ["image/webp", "WebP", "Smaller files"],
  ["image/bmp", "BMP", "Bitmap"],
  ["image/x-icon", "ICO", "256px icon"],
  ["image/gif", "GIF", "Still image"],
];
export const conversionHints = {
  "image/jpeg": "Photos with a white background. Transparent areas become white.",
  "image/png": "Lossless image with transparency.",
  "image/webp": "Compact image with transparency. Check that your form accepts WebP.",
  "image/bmp": "Uncompressed bitmap. Transparent areas become white; files can be large.",
  "image/x-icon": "One PNG-backed icon, fitted within 256 × 256 pixels with transparent padding.",
  "image/gif": "One still frame with up to 256 colours. Animation is not retained.",
};
export const conversionAccept = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/bmp,image/gif,image/x-icon,image/vnd.microsoft.icon,.heic,.heif,.avif,.bmp,.gif,.ico";
export function sourceImageType(file) {
  const extension = (file.name || "").split(".").pop().toLowerCase();
  return file.originalType || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon", gif: "image/gif" }[extension]) || file.type;
}
