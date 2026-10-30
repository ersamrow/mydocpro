import { fields } from "../src/tool-settings.js";
import {
  sliderBounds,
  visibleField,
  settingPresets,
} from "../src/settings-ui.js";
export default function Settings({ id, values, onChange, busy }) {
  return (
    <div className="settings">
      {fields(id).map(({ id: key, label, options, value, ...props }) => {
        if (!visibleField(key, values)) return null;
        const bounds = sliderBounds(key, props, values);
        const presets = settingPresets(key);
        const numeric = props.type === "number";
        const slider = numeric || props.type === "range";
        const sliderId = numeric ? key + "-slider" : key;
        if (slider)
          return (
            <div key={key} className="range-field">
              <div className="range-heading">
                <label htmlFor={sliderId}>{label}</label>
                {numeric ? (
                  <input
                    {...props}
                    className="range-exact"
                    id={key}
                    aria-label={label + " — exact value"}
                    value={values[key]}
                    disabled={busy}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                ) : (
                  <output id={key + "-value"} htmlFor={key}>
                    {values[key]}
                  </output>
                )}
              </div>
              <input
                type="range"
                id={sliderId}
                min={bounds.min}
                max={bounds.max}
                step={bounds.step}
                value={values[key]}
                disabled={busy}
                onChange={(e) => onChange(key, e.target.value)}
              />
              <span className="range-scale" aria-hidden="true">
                <span>{bounds.min}</span>
                <span>{bounds.max}</span>
              </span>
              {presets.length > 0 && (
                <div
                  className="setting-presets"
                  aria-label={label + " presets"}
                >
                  {presets.map(([name, v]) => (
                    <button
                      type="button"
                      key={v}
                      disabled={busy}
                      aria-pressed={values[key] === v}
                      onClick={() => onChange(key, v)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {key === "threshold" && (
                <span className="range-hint">
                  Lower values whiten more of the image.
                </span>
              )}
            </div>
          );
        return (
          <label key={key} htmlFor={key}>
            {label}
            {options ? (
              <select
                id={key}
                value={values[key]}
                disabled={busy}
                onChange={(e) => onChange(key, e.target.value)}
              >
                {options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...props}
                id={key}
                value={values[key]}
                disabled={busy}
                onChange={(e) => onChange(key, e.target.value)}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
