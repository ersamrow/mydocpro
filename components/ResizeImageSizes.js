import { Button, Card } from "./ui.js";
import {
  resizePresets,
  resizePresetDpi,
  matchesResizePreset,
  presetPixels,
} from "../src/resize-presets.js";
import styles from "./ResizeImageSizes.module.css";

export function ResizePresets({ values, onSelect, disabled }) {
  return (
    <fieldset className={styles.presets} disabled={disabled}>
      <legend>Quick photo sizes · {resizePresetDpi} DPI</legend>
      <div className={styles.buttons}>
        {resizePresets.map((preset) => (
          <Button
            key={preset.id}
            data-resize-preset={preset.id}
            aria-pressed={matchesResizePreset(values, preset)}
            onClick={() => onSelect(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p>
        Presets set dimensions and DPI. Your fit, format and optional KB limit
        stay as selected.
      </p>
    </fieldset>
  );
}

export default function ResizeImageSizes({ values, onSelect, disabled }) {
  return (
    <Card className={styles.reference} aria-labelledby="resize-sizes-heading">
      <h2 id="resize-sizes-heading">Common photo sizes</h2>
      <p>
        Choose a size below, then upload a photo or adjust your current image.
        These examples use {resizePresetDpi} DPI; check your form’s current
        dimensions and file-size requirements.
      </p>
      <ResizePresets values={values} onSelect={onSelect} disabled={disabled} />
      <div
        className={styles.tableScroll}
        tabIndex={0}
        role="region"
        aria-label="Photo size reference table"
      >
        <table className={styles.table}>
          <caption>
            Width × height at {resizePresetDpi} DPI, rounded to whole pixels
          </caption>
          <thead>
            <tr>
              <th scope="col">Millimetres</th>
              <th scope="col">Centimetres</th>
              <th scope="col">Inches (approx.)</th>
              <th scope="col">Pixels</th>
              <th scope="col">Preset</th>
            </tr>
          </thead>
          <tbody>
            {resizePresets.map((preset) => (
              <tr key={preset.id}>
                <th scope="row">
                  {preset.width} × {preset.height} mm
                </th>
                <td>
                  {preset.width / 10} × {preset.height / 10} cm
                </td>
                <td>
                  {(preset.width / 25.4).toFixed(2)} ×{" "}
                  {(preset.height / 25.4).toFixed(2)} in
                </td>
                <td>{presetPixels(preset).join(" × ")} px</td>
                <td>
                  <Button
                    disabled={disabled}
                    onClick={() => onSelect(preset)}
                    aria-label={`Use ${preset.label} at ${resizePresetDpi} DPI`}
                  >
                    Use size
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        Pixels = millimetres ÷ 25.4 × DPI. For inches, multiply by DPI. JPG and
        PNG include the selected print-density metadata; WebP does not. Print at
        Actual size (100%) and measure a trial copy.
      </p>
      <p className={styles.note}>
        Need a size and a KB limit? After choosing a size, enter{" "}
        <strong>Max size (KB, optional)</strong> in the settings. The resizer
        keeps exact pixel dimensions and reports an error if the chosen format
        cannot fit the limit.
      </p>
    </Card>
  );
}
