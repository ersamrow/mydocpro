import { useCallback, useEffect, useRef, useState } from "react";
import PdfEditor from "./PdfEditor.js";
import { validateFiles } from "../src/tool-settings.js";
import { inspectFiles } from "../src/file-validation.js";
import { processPdf } from "../src/processing.js";

const values = { pages: "all", rotation: "0" };
const noSettings = () => {};
export default function PdfWorkbench({
  files,
  onFilesChange,
  onWorkingChange,
}) {
  const [pdf, setPdf] = useState({ entries: [], ready: false, error: "" });
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const [result, setResult] = useState(null),
    [url, setUrl] = useState("");
  const abort = useRef(null),
    alive = useRef(true),
    lock = useRef(false);
  const updatePdf = useCallback((next) => {
    setPdf(next);
    setResult(null);
    setStatus("");
  }, []);
  const selected = pdf.entries.filter((e) => e.selected !== false);
  const loading = files.length > 0 && !pdf.ready && !pdf.error;
  useEffect(() => {
    onWorkingChange(busy || loading);
  }, [busy, loading, onWorkingChange]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    setResult(null);
  }, [pdf.entries, files]);
  useEffect(() => {
    if (!files.length) setPdf({ entries: [], ready: false, error: "" });
  }, [files]);
  useEffect(() => {
    if (!result) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(result);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [result]);
  async function add(incoming) {
    if (!incoming.length || lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    setStatus("Checking PDFs…");
    try {
      const next = validateFiles(Array.from(incoming), files, {
        pdf: true,
        multi: true,
      });
      await inspectFiles(Array.from(incoming), true);
      if (alive.current) {
        onFilesChange(next);
        setStatus(
          "Pages load in file order. Uncheck any pages you do not want to include.",
        );
      }
    } catch (e) {
      if (alive.current) setStatus(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function download() {
    if (busy || loading || !pdf.ready || !selected.length || lock.current)
      return;
    lock.current = true;
    setBusy(true);
    setResult(null);
    abort.current = new AbortController();
    try {
      await processPdf(
        "pdf-workbench",
        files,
        {},
        {
          order: selected,
          signal: abort.current.signal,
          onStatus: (s) => alive.current && setStatus(s),
          onOutput: (b) => {
            if (alive.current) setResult(b);
          },
        },
      );
      if (alive.current)
        setStatus(
          `${selected.length} selected pages ready to download in the order shown.`,
        );
    } catch (e) {
      if (alive.current)
        setStatus(
          e.name === "AbortError"
            ? "Cancelled. Your page edits are kept."
            : e.message,
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="pdf-workbench" aria-label="PDF page workspace">
      <div className="pdf-workbench-heading">
        <div>
          <span className="eyebrow">YOUR PDF WORKSPACE</span>
          <h2>Arrange pages, then download</h2>
        </div>
        {files.length > 0 && (
          <span className="pdf-ready-count">
            {files.length} PDFs · {pdf.entries.length} pages
          </span>
        )}
      </div>
      <ol className="pdf-workbench-steps">
        <li aria-current={!files.length ? "step" : undefined}>1. Add PDFs</li>
        <li aria-current={files.length && !result ? "step" : undefined}>
          2. Choose & arrange pages
        </li>
        <li aria-current={result ? "step" : undefined}>3. Download</li>
      </ol>
      <p>
        Add one or more PDFs. Check the pages to keep, move them into order, and
        rotate any page.
      </p>
      <label
        className={"pdf-workbench-upload" + (files.length ? " has-pdfs" : "")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
      >
        <strong>
          {files.length ? "Add more PDFs" : "Choose PDFs or drop them here"}
        </strong>
        <span>Up to 100 MB and 300 pages total</span>
        <input
          id="workbench-upload"
          type="file"
          multiple
          accept="application/pdf,.pdf"
          disabled={busy || loading}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <>
          <details className="pdf-source-manager">
            <summary>
              Manage uploaded files <span>{files.length} files</span>
            </summary>
            <p className="pdf-task-help">
              Adding or removing source files reloads the pages and resets page
              edits.
            </p>
            <ul className="pdf-source-list">
              {files.map((file, i) => (
                <li key={i}>
                  <span>
                    {i + 1}. {file.name}
                  </span>
                  <button
                    disabled={busy || loading}
                    onClick={() =>
                      onFilesChange(files.filter((_, n) => n !== i))
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <div className="pdf-selection-heading">
            <h3>Your pages</h3>
            <span>
              {selected.length} selected ·{" "}
              {pdf.entries.length - selected.length} excluded
            </span>
          </div>
          <PdfEditor
            files={files}
            id="pdf-workbench"
            values={values}
            onValues={noSettings}
            busy={busy}
            pdf={pdf}
            onPdf={updatePdf}
          />
        </>
      )}
      <p role="status">{status}</p>
      {files.length > 0 && (
        <div className="pdf-workbench-actions">
          <strong>
            {selected.length} of {pdf.entries.length} pages selected
          </strong>
          {!result && (
            <button
              className="primary"
              disabled={
                busy || loading || !pdf.ready || !selected.length || !!pdf.error
              }
              onClick={download}
            >
              Create PDF from selected pages
            </button>
          )}
          {busy && abort.current && (
            <button onClick={() => abort.current.abort()}>Cancel</button>
          )}
          {result && url && (
            <a className="primary" href={url} download="edited-pages.pdf">
              Download PDF
            </a>
          )}
        </div>
      )}
    </section>
  );
}
