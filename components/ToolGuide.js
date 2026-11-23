import Link from "next/link";
import { Card } from "./ui.js";
import { guides, combinedGuideDetails } from "../src/tool-guides.js";
import { guideDetails } from "../src/tool-guide-details.js";
import { tools } from "../src/tools.js";
import ResizeImageGuide from "./ResizeImageGuide.js";
export default function ToolGuide({ id }) {
  const g = guides[id],
    tool = tools.find((t) => t[0] === id),
    detail = guideDetails[id] || combinedGuideDetails[id];
  const related = detail
    ? detail.related.map((relatedId) => tools.find((t) => t[0] === relatedId))
    : [
        tools.find((t) => t[0] === g[5]),
        ...tools
          .filter((t) => t[3] === tool[3] && t[0] !== id && t[0] !== g[5])
          .slice(0, 2),
      ];
  return (
    <Card className="tool-guide" aria-label="Tool guidance">
      {id === "resize-image" ? (
        <ResizeImageGuide />
      ) : (
        <>
          <h2>{g[0]}</h2>
          <p>{g[1]}</p>
          {detail && (
            <>
              <h3>Step-by-step instructions</h3>
              <ol>
                {detail.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          )}
          <h3>Worked example and checks</h3>
          <p>{g[2]}</p>
          <h3>{g[3]}</h3>
          <p>{g[4]}</p>
          {detail && (
            <>
              <h3>Check your download</h3>
              <p>{detail.checks}</p>
            </>
          )}
        </>
      )}
      {id === "compress-image" && (
        <p>
          Need exact dimensions as well as a file-size limit?{" "}
          <Link href="/resize-image">
            Resize your photo in cm or mm and set a KB limit
          </Link>{" "}
          in one step. This preserves the requested pixel dimensions;
          compression here may reduce them to meet a very small target.
        </p>
      )}
      {id === "exam-photo" && (
        <p>
          If your form specifies a size outside these presets,{" "}
          <Link href="/resize-image">
            set custom photo dimensions in centimetres or millimetres
          </Link>
          , choose DPI and enter a maximum KB size. Check the current form’s
          requirements before choosing the values.
        </p>
      )}
      {id === "passport-sheet" && (
        <p>
          Need one digital photo rather than a printable sheet?{" "}
          <Link href="/resize-image">Resize a single photo in cm or mm</Link>{" "}
          and optionally set its KB limit. Use this sheet tool when you need
          several copies arranged for printing.
        </p>
      )}
      {id === "merge-pdf" && (
        <p>
          Need only part of a document? <Link href="/split-pdf">Extract PDF pages</Link>{" "}
          before merging. After combining files, <Link href="/compress-pdf">compress the PDF</Link>{" "}
          if your destination sets a file-size limit, then check the final size and readability.
        </p>
      )}
      {id === "crop-image" && (
        <p>
          A crop changes the frame. To set the final dimensions,{" "}
          <Link href="/resize-image">resize the cropped photo in cm, mm or pixels</Link>.
          For several printed copies, <Link href="/passport-sheet">make a passport photo sheet</Link>{" "}
          after checking the required photo size.
        </p>
      )}
      {id === "white-background" && (
        <p>
          Finish the background first, then <Link href="/crop-image">crop the photo</Link>{" "}
          and <Link href="/resize-image">set its final dimensions and KB limit</Link>.
          For repeated copies on paper, use the <Link href="/passport-sheet">passport photo sheet maker</Link>.
        </p>
      )}
      <h3>Related tools</h3>
      <ul className="related-tools">
        {related.map((t) => (
          <li key={t[0]}>
            <Link href={"/" + t[0]}>
              {t[0] === "resize-image"
                ? "Resize a photo in centimetres or millimetres"
                : t[1]}
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/help">Troubleshooting and file privacy</Link>
      </p>
    </Card>
  );
}
