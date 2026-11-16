export function pageIndices(spec, count) {
  if (spec.trim().toLowerCase() === "all")
    return Array.from({ length: count }, (_, i) => i);
  const result = [];
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw Error("Use page numbers like 1-3, 5, 8.");
    const start = +m[1],
      end = +(m[2] || m[1]);
    if (start < 1 || end > count || end < start)
      throw Error(`Page range must be between 1 and ${count}.`);
    for (let i = start; i <= end; i++) result.push(i - 1);
  }
  if (result.length > 300) throw Error("Select at most 300 pages.");
  return result;
}
