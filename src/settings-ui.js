import { fields } from "./tool-settings.js";

export function settingsSummary(id, values) {
  return fields(id)
    .filter((field) => visibleField(field.id, values))
    .map((field) => {
      const value = values[field.id] ?? field.value;
      if (field.id === "output-name" && !value) return "Default filename";
      const label = field.options?.find(
        ([option]) => String(option) === String(value),
      )?.[1];
      return `${field.label}: ${label ?? (value === "" ? "Not set" : value)}`;
    })
    .join(" · ");
}

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
    !(key === "quality" && !["image/jpeg", "image/webp", "image/avif"].includes(values.format) && values.format) &&
    !(key === "every" && values.mode !== "every") &&
    !(key === "orientation" && values.pageSize === "fit")
  );
}
export function settingPresets(key, tool) {
  return key === "target"
    ? tool === "compress-pdf"
      ? [
          ["100 KB", "100"],
          ["200 KB", "200"],
          ["500 KB", "500"],
          ["1 MB", "1000"],
        ]
      : [
          ["20 KB", "20"],
          ["50 KB", "50"],
          ["100 KB", "100"],
          ["200 KB", "200"],
        ]
    : key === "quality"
      ? [
          ["Smaller", "50"],
          ["Balanced", "75"],
          ["High quality", "92"],
        ]
      : [];
}
