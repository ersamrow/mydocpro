import { Button } from "./ui.js";
import { useEffect, useRef, useState } from "react";
import { processImage } from "../src/processing.js";
import ImageManipulator from "./ImageManipulator.js";
export function BlobImage({ blob, ...props }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img {...props} src={url} /> : null;
}
export default function ImageEditor({
  files,
  id,
  values,
  onValues,
  busy,
  compact = false,
}) {
  const [result, setResult] = useState(null),
    [note, setNote] = useState(""),
    [updating, setUpdating] = useState(false),
    [compare, setCompare] = useState(false),
    [previewSize, setPreviewSize] = useState(null);
  const sourceOnly = id === "jpg-to-pdf";
  const hasManipulator = ["crop-image", "resize-image"].includes(id);
  const ResultContainer = hasManipulator ? "details" : "div";
  const previewQueue = useRef(Promise.resolve());
  useEffect(() => {
    let disposed = false;
    if (!sourceOnly && !busy) {
      setResult(null);
      setUpdating(true);
      setNote("Updating preview…");
    }
    const timer = setTimeout(() => {
      // Serialize large canvas operations; obsolete queued previews never run.
      previewQueue.current = previewQueue.current
        .catch(() => {})
        .then(async () => {
          if (disposed || sourceOnly || busy) return;
          setUpdating(true);
          setNote("Updating preview…");
          try {
            const blob = await processImage(id, files, values, true);
            if (!disposed) {
              setResult(blob);
              setNote(
                ["compress-image", "exam-photo"].includes(id)
                  ? "Layout preview; compression is applied when you process."
                  : "Preview updates as you edit.",
              );
            }
          } catch (e) {
            if (!disposed) {
              setResult(null);
              setNote(e.message);
            }
          } finally {
            if (!disposed) setUpdating(false);
          }
        });
    }, 250);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [id, files, values, busy, sourceOnly]);
  if (compact)
    return (
      <figure
        className="ui-live-preview"
        aria-label="Live output preview"
        aria-busy={updating}
      >
        <figcaption>
          Live output preview
          {previewSize?.blob === result &&
            ` · ${previewSize.width} × ${previewSize.height} px`}
        </figcaption>
        <div className="image-edit-stage">
          {result && (
            <BlobImage
              blob={result}
              alt="Preview with current editing settings"
              onLoad={(event) =>
                setPreviewSize({
                  blob: result,
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
            />
          )}
        </div>
        <p className="image-preview-note" role="status">
          {note} Apply this edit to update your download.
        </p>
      </figure>
    );
  return (
    <section
      id="image-previews"
      className={
        "image-previews " + (hasManipulator ? "ui-single-preview" : "")
      }
      aria-label="Image editing preview"
    >
      {hasManipulator && (
        <ImageManipulator
          file={files[0]}
          kind={id}
          values={values}
          onValues={onValues}
          busy={busy}
          previewHeight={id === "resize-image" ? 220 : 380}
        />
      )}
      <ResultContainer
        className={hasManipulator ? "ui-preview-details" : undefined}
      >
        {hasManipulator && <summary>Compare original & result</summary>}
        <section className="image-result-panel">
          <h2>
            {["crop-image", "resize-image"].includes(id)
              ? "Result preview"
              : "Image preview"}
          </h2>
          <details open={sourceOnly || undefined}>
            <summary>
              {sourceOnly
                ? "Images in output order"
                : "Show original image" + (files.length > 1 ? "s" : "")}
            </summary>
            <div className="image-originals">
              {files.map((file, i) => (
                <figure key={i}>
                  <BlobImage blob={file} alt={"Original: " + file.name} />
                  <figcaption>{file.name}</figcaption>
                </figure>
              ))}
            </div>
          </details>
          {!sourceOnly && (
            <>
              <Button
                type="button"
                className="secondary compare-toggle"
                aria-pressed={compare}
                onClick={() => setCompare((v) => !v)}
              >
                {compare ? "Show result only" : "Compare before / after"}
              </Button>
              {files.length > 1 && id !== "join-images" && (
                <p className="preview-batch-note">
                  Preview shows the first image. Settings apply to every image
                  in the batch.
                </p>
              )}
              <div
                className={
                  "image-result-display" + (compare ? " before-after" : "")
                }
              >
                {compare && (
                  <figure>
                    <figcaption>Before</figcaption>
                    <BlobImage
                      blob={files[0]}
                      alt="Original image before edits"
                    />
                  </figure>
                )}
                <div className="image-edit-stage" aria-busy={updating}>
                  {compare && <span className="comparison-label">After</span>}
                  {result && (
                    <BlobImage
                      blob={result}
                      alt="Preview with current editing settings"
                    />
                  )}
                </div>
              </div>
              <p className="image-preview-note" role="status">
                {note}
              </p>
            </>
          )}
        </section>
      </ResultContainer>
    </section>
  );
}
