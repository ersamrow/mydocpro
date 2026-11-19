import { Button, Card } from "./ui.js";
import { fieldHints } from "../src/ui-copy.js";
import { fields } from "../src/tool-settings.js";
import { resizeFieldProps } from "../src/image-dimensions.js";
import {
  sliderBounds,
  visibleField,
  settingPresets,
} from "../src/settings-ui.js";
export default function Settings({
  id,
  values,
  onChange,
  busy,
  exclude = [],
  only,
  compact = false,
}) {
  return (
    <div className={"settings" + (compact ? " ui-settings--compact" : "")}>
      {fields(id).map(({ id: key, label, options, value, ...props }) => {
        if (
          !visibleField(key, values) ||
          exclude.includes(key) ||
          (only && !only.includes(key))
        )
          return null;
        const bounds = sliderBounds(key, props, values);
        if (id === "resize-image")
          Object.assign(props, resizeFieldProps(key, values));
        const presets = settingPresets(key, id);
        const numeric = props.type === "number";
        const slider = numeric || props.type === "range";
        const sliderId = numeric ? key + "-slider" : key;
        if (compact)
          return (
            <div
              key={key}
              className={
                "ui-setting" +
                (key === "target" || key === "output-name"
                  ? " ui-setting--wide"
                  : "")
              }
            >
              <div className="ui-setting-heading">
                <label htmlFor={key}>{label}</label>
                {!numeric && slider && (
                  <output htmlFor={key}>{values[key]}</output>
                )}
                {numeric && (
                  <input
                    {...props}
                    id={key}
                    value={values[key]}
                    disabled={busy}
                    onChange={(event) => onChange(key, event.target.value)}
                  />
                )}
              </div>
              {options ? (
                <select
                  id={key}
                  value={values[key]}
                  disabled={busy}
                  onChange={(event) => onChange(key, event.target.value)}
                >
                  {options.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : numeric ? (
                <input
                  type="range"
                  id={sliderId}
                  aria-label={label}
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={values[key]}
                  disabled={busy}
                  onChange={(event) => onChange(key, event.target.value)}
                />
              ) : (
                <input
                  {...props}
                  id={key}
                  value={values[key]}
                  disabled={busy}
                  onChange={(event) => onChange(key, event.target.value)}
                />
              )}
              {presets.length > 0 && (
                <div className="ui-control-group">
                  {presets.map(([name, v]) => (
                    <Button
                      key={v}
                      disabled={busy}
                      aria-pressed={values[key] === v}
                      onClick={() => onChange(key, v)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
              {id === "white-background" && key === "threshold" && (
                <p className="field-hint">Start low to protect similar-coloured skin or clothing. Higher tolerance includes more background shades.</p>
              )}
            </div>
          );
        if (slider)
          return (
            <Card
              as="div"
              variant={compact ? "flat" : undefined}
              key={key}
              className="range-field"
            >
              <div className="range-heading">
                <label htmlFor={sliderId}>{label}</label>
                {numeric ? (
                  <input
                    {...props}
                    className="range-exact"
                    id={key}
                    aria-label={label + " — exact value"}
                    aria-describedby={
                      fieldHints[key] ? key + "-hint" : undefined
                    }
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
                aria-describedby={fieldHints[key] ? key + "-hint" : undefined}
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
                    <Button
                      type="button"
                      key={v}
                      disabled={busy}
                      aria-pressed={values[key] === v}
                      onClick={() => onChange(key, v)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
              {fieldHints[key] && (
                <span id={key + "-hint"} className="field-hint">
                  {fieldHints[key]}
                </span>
              )}
              {key === "threshold" && (
                <span className="range-hint">
                  {id === "white-background"
                    ? "Higher tolerance includes more border-connected background colours."
                    : "Lower values whiten more of the paper."}
                </span>
              )}
            </Card>
          );
        return (
          <Card
            as="label"
            variant={compact ? "flat" : undefined}
            key={key}
            htmlFor={key}
          >
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
                aria-describedby={fieldHints[key] ? key + "-hint" : undefined}
                id={key}
                value={values[key]}
                disabled={busy}
                onChange={(e) => onChange(key, e.target.value)}
              />
            )}
            {fieldHints[key] && (
              <span id={key + "-hint"} className="field-hint">
                {fieldHints[key]}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
