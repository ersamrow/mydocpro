import { useEffect, useRef, useState } from "react";
import { pdfRenderer } from "../src/processing.js";
import { BlobImage } from "./ImageEditor.js";
export default function PdfQualityPreview({ file, values, busy }) {
  const [preview, setPreview] = useState(null),
    [status, setStatus] = useState("Preparing sample…");
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let disposed = false;
    const timer = setTimeout(() => {
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (disposed || busy) return;
          let doc, canvas;
          setStatus("Updating sample…");
          try {
            doc = await pdfRenderer(file);
            const page = await doc.getPage(1),
              native = page.getViewport({ scale: Number(values.dpi) / 72 });
            const scale = Math.min(
              1,
              1000 / Math.max(native.width, native.height),
            );
            const viewport = page.getViewport({
              scale: (Number(values.dpi) / 72) * scale,
            });
            canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({
              canvasContext: canvas.getContext("2d"),
              viewport,
            }).promise;
            const blob = await new Promise((resolve) =>
              canvas.toBlob(
                resolve,
                "image/jpeg",
                Number(values.quality) / 100,
              ),
            );
            if (!disposed) {
              setPreview(blob);
              setStatus(
                "First-page sample, limited to 1,000 pixels for speed. Full output uses your selected DPI.",
              );
            }
          } catch (e) {
            if (!disposed) {
              setPreview(null);
              setStatus("Sample unavailable: " + e.message);
            }
          } finally {
            if (canvas) canvas.width = canvas.height = 1;
            if (doc) await doc.destroy();
          }
        });
    }, 400);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [file, values.dpi, values.quality, busy]);
  return (
    <details className="quality-preview">
      <summary>Live PDF quality preview</summary>
      {preview && (
        <BlobImage
          blob={preview}
          alt="First PDF page with current JPEG quality and resolution"
        />
      )}
      <p role="status">{status}</p>
    </details>
  );
}
