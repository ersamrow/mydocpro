export function pageIndices(spec, count) {
  spec = String(spec ?? "").trim();
  if (spec.toLowerCase() === "all")
    return Array.from({ length: count }, (_, i) => i);
  const result = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw Error("Use page numbers like 1-3, 5, 8.");
    const start = +m[1],
      end = +(m[2] || m[1]);
    for (const page of [start, end]) {
      if (page < 1) throw Error("Page numbers start at 1.");
      if (page > count)
        throw Error(
          `Page ${page} doesn't exist – this PDF has ${count} ${count === 1 ? "page" : "pages"}.`,
        );
    }
    if (result.length + Math.abs(end - start) + 1 > 300)
      throw Error("Select at most 300 pages.");
    const step = start <= end ? 1 : -1;
    for (let i = start; step > 0 ? i <= end : i >= end; i += step)
      result.push(i - 1);
  }
  if (result.length > 300) throw Error("Select at most 300 pages.");
  return result;
}
