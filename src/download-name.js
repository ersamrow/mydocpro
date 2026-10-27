export function downloadName(requested, fallback) {
  const extension = fallback.slice(fallback.lastIndexOf('.'));
  let base = requested.trim().replace(/\.(pdf|png|jpe?g|webp)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100);
  if (!base) return fallback;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) base = `file-${base}`;
  const page = fallback.match(/^page-(\d+)\./);
  return `${base}${page ? `-page-${page[1]}` : ''}${extension}`;
}
