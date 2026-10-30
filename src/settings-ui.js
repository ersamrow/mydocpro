export function sliderBounds(key, field, values) {
  let max = field.max;
  if (key === "target") max = 1000;
  if (key === "maxWidth") max = 4000;
  if (key === "width" || key === "height")
    max = { cm: 30, mm: 300, in: 12, px: 4000 }[values.unit] || 4000;
  return {
    min: field.min,
    max: Math.min(field.max, Math.max(max, Number(values[key]) || 0)),
    step: field.step || 1,
  };
}
export function visibleField(key, values) {
  return (
    !(key === "quality" && values.format === "image/png") &&
    !(key === "orientation" && values.pageSize === "fit")
  );
}
export function settingPresets(key) {
  return key === "target"
    ? [
        ["Under 50 KB", "50"],
        ["Under 200 KB", "200"],
        ["Under 500 KB", "500"],
      ]
    : key === "quality"
      ? [
          ["Smaller", "50"],
          ["Balanced", "75"],
          ["High quality", "92"],
        ]
      : [];
}
