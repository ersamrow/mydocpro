import { fields } from "../src/tool-settings.js";
export default function Settings({ id, values, onChange, busy }) {
  return (
    <div className="settings">
      {fields(id).map(({ id: key, label, options, value, ...props }) =>
        options ? (
          <label key={key} htmlFor={key}>
            {label}
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
          </label>
        ) : (
          <label
            key={key}
            htmlFor={key}
            className={props.type === "range" ? "range-field" : undefined}
          >
            {props.type === "range" ? (
              <span className="range-heading">
                <span>{label}</span>
                <output id={key + "-value"} htmlFor={key}>
                  {values[key]}
                </output>
              </span>
            ) : (
              label
            )}
            <input
              {...props}
              id={key}
              value={values[key]}
              disabled={busy}
              onChange={(e) => onChange(key, e.target.value)}
            />
            {props.type === "range" && (
              <>
                <span className="range-scale" aria-hidden="true">
                  <span>0</span>
                  <span>255</span>
                </span>
                <span className="range-hint">
                  Lower values whiten more of the image.
                </span>
              </>
            )}
          </label>
        ),
      )}
    </div>
  );
}
