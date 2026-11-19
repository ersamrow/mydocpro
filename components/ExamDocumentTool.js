import { Button, Card, ActionBar, ToolSectionHeading } from "./ui.js";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  formatExamDimensions,
  formatExamFileRange,
} from "../src/exam-requirements.js";
import styles from "./ExamDocumentTool.module.css";
import Dropzone from "./Dropzone.js";
import { useObjectUrl } from "./useObjectUrl.js";
import { downloadName } from "../src/download-name.js";

const useFileUrl = useObjectUrl;

function ImagePreset({
  doc,
  slug,
  initialFile,
  onFileChange,
  documentSelector,
}) {
  const id = useId();
  const [file, setFile] = useState(initialFile || null);
  const [fit, setFit] = useState(doc.type === "photo" ? "cover" : "contain");
  const [whitePaper, setWhitePaper] = useState(doc.type !== "photo");
  const [output, setOutput] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [frameRatio, setFrameRatio] = useState(null);
  const active = useRef(null);
  const sourceUrl = useFileUrl(file);
  const outputUrl = useFileUrl(output?.blob);
  useEffect(() => () => active.current?.abort(), []);

  function start() {
    active.current?.abort();
    active.current = new AbortController();
    setOutput(null);
    setStatus("");
    setBusy(true);
    return active.current.signal;
  }
  async function choose(next) {
    if (!next) return;
    const signal = start();
    try {
      const { inspectExamInput } = await import("../src/exam-output.js");
      await inspectExamInput(next);
      if (signal.aborted) return;
      const { normalizeImageFile } = await import("../src/image-processing.js");
      const normalized = await normalizeImageFile(next, signal);
      if (signal.aborted) return;
      setFrameRatio(null);
      setFile(normalized);
      onFileChange?.(normalized);
    } catch (error) {
      if (!signal.aborted) setStatus(error.message);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function prepareJpeg() {
    if (!file || busy) return;
    const signal = start();
    try {
      const { processExamDocument } = await import("../src/exam-output.js");
      const result = await processExamDocument(
        file,
        doc,
        { fit, whitePaper },
        signal,
      );
      if (!signal.aborted) setOutput(result);
    } catch (error) {
      if (!signal.aborted)
        setStatus(
          error.message || "Could not prepare the JPG. Try another scan.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  function changeSetting(setter, value) {
    setOutput(null);
    setStatus("");
    setter(value);
  }
  const fixedRatio =
    doc.cropAspect ||
    (doc.widthPx && doc.heightPx && doc.widthPx / doc.heightPx) ||
    (doc.widthMm && doc.heightMm && doc.widthMm / doc.heightMm);
  const hasFrame =
    fixedRatio ||
    doc.minWidthPx ||
    doc.minHeightPx ||
    doc.maxWidthPx ||
    doc.maxHeightPx;
  const triple = doc.signatureRows === 3;
  const hasSize = doc.minKB != null || doc.maxKB != null;
  return (
    <div className={styles.form}>
      <div className={`ui-preview-options ${styles.workspace}`}>
        <section
          className={`ui-options-pane ${styles.options}`}
          aria-label="Document options"
        >
          <ToolSectionHeading
            step="1"
            title="Choose your document"
            description="Select a preset and review its requirements."
          />
          {documentSelector}
          <h3>{doc.label}</h3>
          <p className={styles.specs}>
            {[
              doc.format,
              formatExamFileRange(doc),
              ...formatExamDimensions(doc),
            ]
              .filter(
                (value, index, all) => value && all.indexOf(value) === index,
              )
              .join(" · ")}
          </p>
          {doc.rangeNote && <p className={styles.hint}>{doc.rangeNote}</p>}
          {!hasFrame && (
            <p className={styles.hint}>
              To remove extra margins, use the{" "}
              <Link
                className={styles.textLink}
                prefetch={false}
                href="/crop-image"
              >
                image cropper
              </Link>{" "}
              before choosing your file.
            </p>
          )}
          {triple && (
            <p className={styles.hint}>
              Sign three times on one sheet, one below the other. Choose a scan
              showing all three signatures.
            </p>
          )}
          {(hasFrame || doc.type !== "photo") && (
            <div className={styles.settings}>
              {!!hasFrame && (
                <label>
                  Framing
                  <select
                    value={fit}
                    disabled={busy}
                    onChange={(event) =>
                      changeSetting(setFit, event.target.value)
                    }
                  >
                    <option value="contain">
                      Keep the entire image (white padding)
                    </option>
                    <option value="cover">
                      Centre crop to the preset shape
                    </option>
                  </select>
                </label>
              )}
              {doc.type !== "photo" && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={whitePaper}
                    disabled={busy}
                    onChange={(event) =>
                      changeSetting(setWhitePaper, event.target.checked)
                    }
                  />
                  Whiten paper
                </label>
              )}
            </div>
          )}
        </section>
        <section
          className={`ui-preview-pane ${styles.upload}`}
          aria-label="Upload and preview"
        >
          <ToolSectionHeading
            step="2"
            title="Upload & preview"
            description="Your image is processed on this device."
          />
          <Dropzone
            id={id}
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            disabled={busy}
            title={
              file
                ? "Choose another image or drop it here"
                : "Choose an image or drop it here"
            }
            hint="JPG, PNG, WebP or HEIC · up to 25 MB per image"
            buttonLabel={file ? "Replace image" : "Choose image"}
            onFiles={(files) => choose(files[0])}
          />
          {file && <p className={styles.filename}>{file.name}</p>}
          {(sourceUrl || triple) && (
            <figure className={styles.figure}>
              <div
                className={styles.preview}
                style={{ "--exam-aspect": frameRatio || fixedRatio || 1 }}
              >
                {sourceUrl && (
                  <img
                    src={sourceUrl}
                    alt="Source image framing"
                    style={{ objectFit: fit }}
                    onLoad={async (event) => {
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;
                      const { examFrame } =
                        await import("../src/exam-output.js");
                      const frame = examFrame(doc, naturalWidth, naturalHeight);
                      setFrameRatio(frame.width / frame.height);
                    }}
                  />
                )}
                {triple && (
                  <div className={styles.rows} aria-hidden="true">
                    {[1, 2, 3].map((number) => (
                      <span key={number}>
                        {!sourceUrl && `Signature ${number}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <figcaption>
                {triple
                  ? "Three-signature guide. Guide lines stay out of the JPG."
                  : "Image framing"}
              </figcaption>
            </figure>
          )}
        </section>
      </div>
      {file && (
        <ActionBar className="process-actions">
          {output && outputUrl && !busy ? (
            <Button
              as="a"
              variant="primary"
              href={outputUrl}
              download={
                doc.filename ||
                downloadName(
                  `${file.name.replace(/\.[^.]+$/, "")}_${slug}`,
                  `${doc.type}_${slug}.jpg`,
                )
              }
            >
              Download JPG
            </Button>
          ) : (
            <Button
              variant="primary"
              type="button"
              disabled={!file || busy}
              onClick={prepareJpeg}
            >
              {busy ? "Working…" : "Prepare JPG"}
            </Button>
          )}
        </ActionBar>
      )}
      {status && (
        <p role="alert" className={styles.warning}>
          {status}
        </p>
      )}
      <div role="status" aria-live="polite">
        {output && (
          <Card as="div" className={styles.result}>
            <strong
              className={output.issues.length ? styles.warning : styles.success}
            >
              {output.issues.length
                ? "Check this JPG before submitting"
                : hasSize
                  ? "✓ JPG meets the listed file specifications"
                  : "JPG prepared — confirm limits in the notice"}
            </strong>
            <p>
              {(output.blob.size / 1000).toFixed(2)} KB · {output.width} ×{" "}
              {output.height} px · JPG
            </p>
            {output.paddedBytes > 0 && (
              <p className={styles.success}>
                ✓ padded to {(output.blob.size / 1000).toFixed(2)} KB · image
                pixels unchanged
              </p>
            )}
            {output.issues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
            {outputUrl && (
              <img
                src={outputUrl}
                width={output.width}
                height={output.height}
                alt="Final JPG"
                className={styles.resultImage}
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function CertificatePreset({ doc, documentSelector }) {
  const id = useId();
  const active = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => active.current?.abort(), []);
  async function check(file) {
    if (!file) return;
    active.current?.abort();
    active.current = new AbortController();
    const { signal } = active.current;
    setResult(null);
    setError("");
    setBusy(true);
    try {
      const { inspectCertificate } = await import("../src/exam-output.js");
      const next = await inspectCertificate(file, doc, signal);
      if (!signal.aborted) setResult(next);
    } catch (err) {
      if (!signal.aborted) setError(err.message || "Could not read the PDF.");
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <div className={styles.form}>
      <div className={`ui-preview-options ${styles.workspace}`}>
        <section
          className={`ui-options-pane ${styles.options}`}
          aria-label="Document options"
        >
          <ToolSectionHeading
            step="1"
            title="Choose your document"
            description="Select a preset and review its requirements."
          />
          {documentSelector}
          <h3>{doc.label}</h3>
          <p className={styles.hint}>{doc.rules.join(" ")}</p>
          <Button as={Link} prefetch={false} href="/compress-pdf">
            Open PDF compressor
          </Button>
        </section>
        <section
          className={`ui-preview-pane ${styles.upload}`}
          aria-label="Upload and check PDF"
        >
          <ToolSectionHeading
            step="2"
            title="Choose your PDF"
            description="Check the existing PDF against the listed limit."
          />
          <Dropzone
            id={id}
            accept="application/pdf,.pdf"
            disabled={busy}
            title="Check your PDF size"
            hint="Choose your certificate PDF or drop it here."
            buttonLabel="Choose PDF"
            onFiles={(files) => check(files[0])}
          />
          <div role="status">
            {busy && "Checking PDF…"}
            {result && (
              <>
                <strong
                  className={result.fits ? styles.success : styles.warning}
                >
                  {doc.maxKB == null
                    ? "PDF checked"
                    : result.fits
                      ? "✓ PDF meets the file-size limit"
                      : "PDF exceeds the file-size limit"}
                </strong>
                <p>
                  {(result.bytes / 1000).toFixed(2)} KB · {result.pages}{" "}
                  {result.pages === 1 ? "page" : "pages"}
                </p>
              </>
            )}
          </div>
          {error && (
            <p role="alert" className={styles.warning}>
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ExamDocumentTool({ exam, initialFile, onFileChange }) {
  const [selected, setSelected] = useState(exam.documents[0].type);
  const doc =
    exam.documents.find((item) => item.type === selected) || exam.documents[0];
  const documentSelector = exam.documents.length > 1 && (
    <div className={styles.buttons} role="group" aria-label="Choose a document">
      {exam.documents.map((item) => (
        <Button
          key={item.type}
          type="button"
          aria-pressed={item.type === doc.type}
          onClick={() => setSelected(item.type)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
  return (
    <Card
      className={styles.panel}
      aria-label={`${exam.shortName} document tool`}
    >
      <h2>Prepare your document</h2>
      {doc.format === "PDF" ? (
        <CertificatePreset doc={doc} documentSelector={documentSelector} />
      ) : (
        <ImagePreset
          key={doc.type}
          doc={doc}
          slug={exam.slug}
          documentSelector={documentSelector}
          initialFile={initialFile}
          onFileChange={onFileChange}
        />
      )}
    </Card>
  );
}
