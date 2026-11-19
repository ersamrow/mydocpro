export function pixelsPerUnit(unit, dpi) {
  return {
    px: 1,
    cm: Number(dpi) / 2.54,
    mm: Number(dpi) / 25.4,
    in: Number(dpi),
  }[unit];
}

export function resizeFieldProps(key, values) {
  if (!["width", "height"].includes(key)) return {};
  return values.unit === "px"
    ? { min: 1, step: 1 }
    : { min: 0.000001, step: "any" };
}
