export function downloadName(requested, fallback) {
  const extension = fallback.slice(fallback.lastIndexOf("."));
  let base = requested
    .trim()
    .replace(/\.(pdf|png|jpe?g|webp|avif|bmp|ico|gif)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  if (!base) return fallback;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base))
    base = `file-${base}`;
  const page = fallback.match(/(?:^|_)(page|part)-(\d+)\./);
  return `${base}${page ? `-${page[1]}-${page[2]}` : ""}${extension}`;
}

export function toolOutputName(
  original,
  tool,
  values = {},
  mime = "image/jpeg",
) {
  const stem = (original || "file").replace(/\.[^.]+$/, "");
  const ext =
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/bmp": "bmp",
      "image/x-icon": "ico",
      "image/gif": "gif",
      "application/pdf": "pdf",
    }[mime] || "jpg";
  const suffix = tool === "compress-image" ? `${values.target}kb` : tool;
  return downloadName(`${stem}_${suffix}`, `file.${ext}`);
}
