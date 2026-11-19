import { pixelsPerUnit } from "./image-dimensions.js";

export const resizePresetDpi = 300;
// Reference dimensions, not claims of compliance with an exam or authority.
export const resizePresets = [
  { id: "35x45", label: "35 × 45 mm", width: 35, height: 45 },
  { id: "25x35", label: "25 × 35 mm", width: 25, height: 35 },
  { id: "20x25", label: "20 × 25 mm", width: 20, height: 25 },
  { id: "2inch", label: "2 × 2 inches", width: 50.8, height: 50.8 },
  { id: "20x45", label: "20 × 45 mm", width: 20, height: 45 },
];

export function resizePresetValues(preset) {
  return {
    width: String(preset.width),
    height: String(preset.height),
    unit: "mm",
    dpi: String(resizePresetDpi),
    keepProportions: false,
  };
}

export function presetPixels(preset) {
  const factor = pixelsPerUnit("mm", resizePresetDpi);
  return [
    Math.round(preset.width * factor),
    Math.round(preset.height * factor),
  ];
}

export function matchesResizePreset(values, preset) {
  const factor = pixelsPerUnit(values.unit, values.dpi);
  const pixels = presetPixels(preset);
  return (
    Number(values.dpi) === resizePresetDpi &&
    Math.round(Number(values.width) * factor) === pixels[0] &&
    Math.round(Number(values.height) * factor) === pixels[1]
  );
}
