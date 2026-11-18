import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  formatExamDimensions,
  formatExamFileRange,
} from "../src/exam-requirements.js";
import styles from "./ExamDocumentTool.module.css";

function useFileUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = file ? URL.createObjectURL(file) : "";
    setUrl(next);
    return () => {
      if (next) URL.revokeObjectURL(next);
    };
  }, [file]);
  return url;
}

function ImagePreset({ doc, slug, initialFile, onFileChange }) {
  const id = useId();
  const [file, setFile] = useState(initialFile || null);
  const [fit, setFit] = useState(doc.type === "photo" ? "cover" : "contain");
  const [whitePaper, setWhitePaper] = useState(false);
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
      setFrameRatio(null);
      setFile(next);
      onFileChange?.(next);
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
      <h3>{doc.label}</h3>
      <p className={styles.specs}>
        {[doc.format, formatExamFileRange(doc), ...formatExamDimensions(doc)]
          .filter((v, i, all) => v && all.indexOf(v) === i)
          .join(" · ")}
      </p>
      {doc.rangeNote && <p>{doc.rangeNote}</p>}
      {!hasFrame && (
        <p>
          To remove extra margins, use the{" "}
          <Link className={styles.textLink} prefetch={false} href="/crop-image">
            image cropper
          </Link>{" "}
          before choosing your file.
        </p>
      )}
      {triple && (
        <p>
          Sign three times on one sheet, one below the other. Choose a scan
          showing all three signatures.
        </p>
      )}
      <label htmlFor={id}>Choose an image</label>
      <input
        id={id}
        className={styles.file}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = "";
          choose(next);
        }}
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
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  const { examFrame } = await import("../src/exam-output.js");
                  const frame = examFrame(doc, naturalWidth, naturalHeight);
                  setFrameRatio(frame.width / frame.height);
                }}
              />
            )}
            {triple && (
              <div className={styles.rows} aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <span key={n}>{!sourceUrl && `Signature ${n}`}</span>
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
      {!!hasFrame && (
        <label>
          Framing
          <select
            value={fit}
            disabled={busy}
            onChange={(e) => changeSetting(setFit, e.target.value)}
          >
            <option value="contain">
              Keep the entire image (white padding)
            </option>
            <option value="cover">Centre crop to the preset shape</option>
          </select>
        </label>
      )}
      {doc.type !== "photo" && (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={whitePaper}
            disabled={busy}
            onChange={(e) => changeSetting(setWhitePaper, e.target.checked)}
          />
          Whiten light paper
        </label>
      )}
      <button
        className="primary"
        type="button"
        disabled={!file || busy}
        onClick={prepareJpeg}
      >
        {busy ? "Working…" : "Prepare JPG"}
      </button>
      {status && (
        <p role="alert" className={styles.warning}>
          {status}
        </p>
      )}
      <div role="status" aria-live="polite">
        {output && (
          <div className={styles.result}>
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
              {(output.blob.size / 1024).toFixed(2)} KB · {output.width} ×{" "}
              {output.height} px · JPG
            </p>
            {output.issues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
            {slug === "ibps" &&
              doc.type === "signature" &&
              output.blob.size < doc.minKB * 1024 && (
                <p>
                  If your notice permits dimensions above {doc.widthPx} ×{" "}
                  {doc.heightPx} px, open your original scan in the{" "}
                  <Link
                    className={styles.textLink}
                    prefetch={false}
                    href="/resize-image"
                  >
                    image resizer
                  </Link>
                  . Select <strong>Keep proportions</strong>, try a higher pixel
                  resolution and check the saved JPG against{" "}
                  {formatExamFileRange(doc)}.
                </p>
              )}
            {outputUrl && (
              <>
                <img
                  src={outputUrl}
                  width={output.width}
                  height={output.height}
                  alt="Final JPG"
                  className={styles.resultImage}
                />
                <a
                  className="secondary"
                  href={outputUrl}
                  download={doc.filename || `${slug}-${doc.type}.jpg`}
                >
                  Download JPG
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CertificatePreset({ doc }) {
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
      <h3>{doc.label}</h3>
      <p>{doc.rules.join(" ")}</p>
      <label htmlFor={id}>Check your PDF size</label>
      <input
        id={id}
        className={styles.file}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          check(f);
        }}
      />
      <div role="status">
        {busy && "Checking PDF…"}
        {result && (
          <>
            <strong className={result.fits ? styles.success : styles.warning}>
              {doc.maxKB == null
                ? "PDF checked"
                : result.fits
                  ? "✓ PDF meets the file-size limit"
                  : "PDF exceeds the file-size limit"}
            </strong>
            <p>
              {(result.bytes / 1024).toFixed(2)} KB · {result.pages}{" "}
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
      <Link prefetch={false} className="secondary" href="/compress-pdf">
        Open PDF compressor
      </Link>
    </div>
  );
}

export default function ExamDocumentTool({ exam, initialFile, onFileChange }) {
  const [selected, setSelected] = useState(exam.documents[0].type);
  const doc =
    exam.documents.find((item) => item.type === selected) || exam.documents[0];
  return (
    <section
      className={styles.panel}
      aria-label={`${exam.shortName} document tool`}
    >
      <h2>Prepare your document</h2>
      {exam.documents.length > 1 && (
        <div
          className={styles.buttons}
          role="group"
          aria-label="Choose a document"
        >
          {exam.documents.map((item) => (
            <button
              key={item.type}
              type="button"
              aria-pressed={item.type === doc.type}
              onClick={() => setSelected(item.type)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {doc.format === "PDF" ? (
        <CertificatePreset doc={doc} />
      ) : (
        <ImagePreset
          key={doc.type}
          doc={doc}
          slug={exam.slug}
          initialFile={initialFile}
          onFileChange={onFileChange}
        />
      )}
    </section>
  );
}
