import { useState } from "react";
import Link from "next/link";
import { Card, ToolLayout } from "./ui.js";
import TrustBadges from "./TrustBadges.js";
import { photoSizes, sizePixels } from "../src/photo-sizes.js";
import styles from "./CmToPixels.module.css";
import ResizeFaqs from "./ResizeFaqs.js";
import { calculatorFaqs } from "../src/tool-faqs.js";

const units = {
  cm: { label: "Centimetres (cm)", perInch: 2.54 },
  mm: { label: "Millimetres (mm)", perInch: 25.4 },
  inch: { label: "Inches", perInch: 1 },
};
const concise = (value) =>
  Number(value.toFixed(4)).toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });

export default function CmToPixels() {
  const [direction, setDirection] = useState("to-pixels");
  const [unit, setUnit] = useState("cm");
  const [amount, setAmount] = useState("3.5");
  const [dpi, setDpi] = useState("300");
  const value = Number(amount),
    density = Number(dpi);
  const converted =
    direction === "to-pixels"
      ? (value / units[unit].perInch) * density
      : (value / density) * units[unit].perInch;
  const valid =
    amount.trim() !== "" &&
    dpi.trim() !== "" &&
    value > 0 &&
    density > 0 &&
    Number.isFinite(converted) &&
    Number.isFinite(value) &&
    Number.isFinite(density);
  const result = direction === "to-pixels" ? Math.round(converted) : converted;

  return (
    <ToolLayout className={styles.page}>
      <div className={styles.intro}>
        <h1>CM to Pixels Converter – Free</h1>
        <p>
          Convert cm, mm or inches to pixels, or calculate physical size from
          pixels at your chosen DPI. All calculations run in your browser.
        </p>
        <TrustBadges />
      </div>
      <Card aria-labelledby="conversion-heading">
        <h2 id="conversion-heading">Calculate a dimension</h2>
        <div className={styles.fields}>
          <label htmlFor="conversion-direction">
            Conversion
            <select
              id="conversion-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            >
              <option value="to-pixels">Physical size → pixels</option>
              <option value="from-pixels">Pixels → physical size</option>
            </select>
          </label>
          <label htmlFor="conversion-unit">
            Physical unit
            <select
              id="conversion-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              {Object.entries(units).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="conversion-amount">
            {direction === "to-pixels"
              ? `Size (${unit === "inch" ? "inches" : unit})`
              : "Size (pixels)"}
            <input
              id="conversion-amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="conversion-result"
              aria-invalid={!valid}
            />
          </label>
          <label htmlFor="conversion-dpi">
            DPI (pixels per inch)
            <input
              id="conversion-dpi"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={dpi}
              onChange={(event) => setDpi(event.target.value)}
              aria-describedby="conversion-result"
              aria-invalid={!valid}
            />
          </label>
        </div>
        <div
          id="conversion-result"
          className={styles.result}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {valid ? (
            <>
              <strong>
                {concise(result)}{" "}
                {direction === "to-pixels"
                  ? "px"
                  : unit === "inch"
                    ? "inches"
                    : unit}
              </strong>
              <span>
                {" "}
                at {concise(density)} DPI
                {direction === "to-pixels"
                  ? " · rounded to the nearest pixel"
                  : " · rounded to 4 decimal places"}
              </span>
            </>
          ) : (
            <span>
              Enter a positive, finite size and DPI to calculate the result.
            </span>
          )}
        </div>
        <p>
          For an image with width and height, calculate each dimension
          separately. DPI changes this conversion; it does not add detail to
          your source photo.
        </p>
        <p>
          <Link href="/resize-image">Resize an image in cm, mm or pixels</Link>{" "}
          to create the actual file, or use{" "}
          <Link href="/exam-photo">photo presets for application forms</Link>.
        </p>
      </Card>
      <Card
        className={styles.reference}
        aria-labelledby="conversion-table-heading"
      >
        <h2 id="conversion-table-heading">
          Common photo dimensions at 300 DPI
        </h2>
        <p>
          Each size links to a pre-filled resizer. These are dimensional
          references; check the destination’s current photo and file-size
          requirements.
        </p>
        <div
          className={styles.scroll}
          tabIndex={0}
          role="region"
          aria-label="Photo size conversion table"
        >
          <table>
            <caption>Width × height, rounded to whole pixels</caption>
            <thead>
              <tr>
                <th scope="col">Size in cm</th>
                <th scope="col">Size in mm</th>
                <th scope="col">Pixels at 300 DPI</th>
              </tr>
            </thead>
            <tbody>
              {photoSizes.map((size) => (
                <tr key={size.slug}>
                  <th scope="row">
                    <Link href={`/resize-image/${size.slug}`}>
                      {size.width} × {size.height} cm
                    </Link>
                  </th>
                  <td>
                    {Number((size.width * 10).toFixed(4))} ×{" "}
                    {Number((size.height * 10).toFixed(4))} mm
                  </td>
                  <td>{sizePixels(size, 300).join(" × ")} px</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>How the conversion works</h3>
        <p>
          Pixels = cm ÷ 2.54 × DPI. For millimetres, divide by 25.4 instead; for
          inches, multiply by DPI. To reverse the calculation, divide pixels by
          DPI to obtain inches, then multiply by 2.54 for cm or 25.4 for mm.
        </p>
        <p>
          At 300 DPI, 3.5 × 4.5 cm is approximately 413 × 531 pixels. At 200 DPI
          it is approximately 276 × 354 pixels. A 5 × 5 cm photo is not exactly
          2 × 2 inches: two inches equals 5.08 cm.
        </p>
        <p>
          For printing, use the intended DPI and print at Actual size (100%).
          Measure a trial print because printer settings can override the
          requested dimensions.
        </p>
      </Card>
      <Card className="tool-guide">
        <ResizeFaqs faqs={calculatorFaqs} />
      </Card>
    </ToolLayout>
  );
}
