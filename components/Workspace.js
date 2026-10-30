import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icon } from "./Shared.js";
import PdfQualityPreview from "./PdfQualityPreview.js";
import Settings from "./Settings.js";
import ToolGuide from "./ToolGuide.js";
import ImageEditor from "./ImageEditor.js";
import PdfEditor from "./PdfEditor.js";
import {
  defaults,
  pdfTools,
  multiTools,
  size,
  validateFiles,
} from "../src/tool-settings.js";
import { pageSeo } from "../src/seo.js";
import { processImage, processPdf, pageIndices } from "../src/processing.js";
import { downloadName } from "../src/download-name.js";
function Download({ result }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(result.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [result]);
  return (
    <a className="output result-download" href={url} download={result.name}>
      {result.blob.type.startsWith("image/") && url && (
        <img src={url} alt="Processed image preview" />
      )}
      <span>
        <strong>{result.name}</strong>
        <small>{size(result.blob.size)}</small>
        <span className="download-label">Download file ↓</span>
      </span>
    </a>
  );
}
const notices = {
  "exam-photo":
    "These are generic sizes, not verified exam requirements. Check the current official notification for dimensions, file size, and live-photo rules before submitting.",
  "compress-pdf":
    "Compression creates image-only pages. Searchable text, links, forms, accessibility tags and digital signatures will not be preserved. A target size is not guaranteed.",
  "white-background":
    "For plain, light backgrounds only. This is a brightness threshold, not AI background removal.",
  "crop-image":
    "Drag the crop area or its corners above. Use the fields for precise ratio, rotation and zoom.",
  "join-images":
    "Choose two images: photo first, signature second. Use the arrows to reorder.",
};
export default function Workspace({ tool }) {
  const [id, title] = tool,
    router = useRouter();
  const [files, setFiles] = useState([]),
    [values, setValues] = useState(() => defaults(id)),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(false),
    [outputs, setOutputs] = useState([]),
    [pdf, setPdf] = useState({ entries: [], ready: false, error: "" }),
    [dragging, setDragging] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(true);
  const resultsRef = useRef(null);
  const upload = useRef(null),
    replace = useRef(false),
    alive = useRef(true),
    processing = useRef(false);
  const isPdf = pdfTools.includes(id),
    multi = multiTools.includes(id),
    meta = pageSeo(id);
  const onValues = useCallback((patch) => {
    setValues((v) => ({ ...v, ...patch }));
    setOutputs([]);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (
      id === "compress-image" &&
      router.isReady &&
      typeof router.query.kb === "string"
    )
      onValues({ target: router.query.kb });
    if (id === "name-date")
      onValues({ date: new Date().toISOString().slice(0, 10) });
  }, [id, router.isReady, router.query.kb, onValues]);
  useEffect(() => {
    if (!busy) return;
    const unload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const route = () => {
      router.events.emit("routeChangeError");
      throw new Error("Please wait for file processing to finish.");
    };
    window.addEventListener("beforeunload", unload);
    router.events.on("routeChangeStart", route);
    return () => {
      window.removeEventListener("beforeunload", unload);
      router.events.off("routeChangeStart", route);
    };
  }, [busy, router]);
  function choose(incoming, replacing = false) {
    if (busy || !incoming.length) return;
    try {
      const next = validateFiles(Array.from(incoming), files, {
        pdf: isPdf,
        multi,
        replace: replacing,
      });
      setSettingsOpen(true);
      setFiles(next);
      setOutputs([]);
      setError(false);
      setStatus("");
      setPdf({ entries: [], ready: false, error: "" });
      if (id === "crop-image")
        setValues((v) => ({
          ...v,
          "crop-x": "0",
          "crop-y": "0",
          "crop-w": "1",
          "crop-h": "1",
        }));
    } catch (e) {
      setError(true);
      setStatus(e.message);
    }
  }
  function changeFiles(next) {
    if (busy) return;
    setFiles(next);
    setOutputs([]);
    setPdf({ entries: [], ready: false, error: "" });
  }
  let count = pdf.entries.length,
    rangeError = "";
  if (["split-pdf", "organize-pdf", "pdf-to-image"].includes(id)) {
    try {
      count = values.pages.trim()
        ? pageIndices(values.pages, pdf.entries.length).length
        : 0;
    } catch {
      count = 0;
      rangeError = "Check the page range";
    }
  }
  const disabled =
    busy ||
    !files.length ||
    (isPdf &&
      (!pdf.ready ||
        !!pdf.error ||
        !count ||
        (id === "merge-pdf" && files.length < 2)));
  async function run() {
    if (disabled || processing.current) return;
    processing.current = true;
    setBusy(true);
    setOutputs([]);
    setError(false);
    setStatus("Processing on your device…");
    let note = "",
      succeeded = false;
    const output = (blob, name) => {
      if (alive.current)
        setOutputs((out) => [
          ...out,
          { blob, name: downloadName(values["output-name"] || "", name) },
        ]);
    };
    try {
      await new Promise((r) => setTimeout(r, 20));
      if (isPdf || id === "jpg-to-pdf")
        await processPdf(id, files, values, {
          order: pdf.entries,
          onOutput: output,
          onStatus: (text) => {
            if (text.startsWith("This PDF")) note = text;
            if (alive.current) setStatus(text);
          },
        });
      else {
        const blob = await processImage(id, files, values);
        output(
          blob,
          `mydocpro-${id}.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`,
        );
      }
      succeeded = true;
      if (alive.current)
        setStatus(
          note ||
            "Done! Your download is ready below. Check the result before submitting.",
        );
    } catch (e) {
      if (alive.current) {
        setError(true);
        setStatus(
          e.message || "Could not process this file. Try another file.",
        );
      }
    } finally {
      processing.current = false;
      if (alive.current) {
        setBusy(false);
        if (succeeded && window.matchMedia("(max-width: 600px)").matches) {
          setSettingsOpen(false);
          requestAnimationFrame(() =>
            resultsRef.current?.scrollIntoView({
              behavior: "auto",
              block: "start",
            }),
          );
        }
      }
    }
  }
  return (
    <main className="workspace tool-workspace">
      <div className="tool-heading">
        <div className="tool-heading-meta">
          <Link className="back" href="/">
            <Icon name="arrow-left" />
            All tools
          </Link>
          <span className="eyebrow">
            {tool[3] === "pdf"
              ? "PDF TOOLS"
              : tool[3] === "special"
                ? "PHOTO PRESETS"
                : "IMAGE TOOLS"}
          </span>
        </div>
        <div className="page-intro-heading">
          <span className="page-emblem">
            <Icon name={tool[4]} />
          </span>
          <h1>{title}</h1>
        </div>
        <p className="intro">{meta.description} </p>
        <div className="tool-assurances">
          <span>
            <Icon name="shield-check" /> Files stay on your device
          </span>
          <span>
            <Icon name="check" /> Free to use
          </span>
          <span>
            <Icon name="zap" /> No sign-up
          </span>
        </div>
      </div>
      <section
        className={
          "workpanel tool-panel " +
          (files.length ? "has-files " : "") +
          (isPdf && files.length ? "pdf-editor-panel" : "")
        }
      >
        <label
          className={"dropzone " + (dragging ? "dragover" : "")}
          id="dropzone"
          hidden={files.length > 0}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files);
          }}
        >
          <Icon name="upload" />
          <div className="upload-copy">
            <strong>
              Choose {isPdf ? "PDFs" : "images"} or drop them here
            </strong>
            <span>
              {isPdf
                ? "PDF, up to 100 MB total / 300 pages"
                : "JPG, PNG or WebP, up to 25 MB per image"}
            </span>
          </div>
          <input
            ref={upload}
            id="upload"
            type="file"
            accept={
              isPdf ? "application/pdf,.pdf" : "image/jpeg,image/png,image/webp"
            }
            multiple={multi}
            disabled={busy}
            onChange={(e) => {
              choose(e.target.files, replace.current);
              replace.current = false;
              e.target.value = "";
            }}
          />
        </label>
        <div className="upload-actions" hidden={!files.length}>
          <span className="upload-summary" role="status">
            {files.length} {files.length === 1 ? "file" : "files"} selected
          </span>
          <div className="upload-buttons">
            {multi && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  replace.current = false;
                  upload.current.click();
                }}
              >
                Add more files
              </button>
            )}
            {files.length > 0 && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  replace.current = true;
                  upload.current.click();
                }}
              >
                {multi ? "Replace all" : "Upload another file"}
              </button>
            )}
          </div>
        </div>
        <ul className="file-list" id="file-list">
          {files.map((file, i) => (
            <li key={i}>
              <span>{file.name}</span>
              <small>{size(file.size)}</small>
              {files.length > 1 && (
                <button
                  className="secondary"
                  disabled={busy || i === 0}
                  aria-label={"Move " + file.name + " up"}
                  onClick={() => {
                    const next = [...files];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    changeFiles(next);
                  }}
                >
                  ↑
                </button>
              )}
              <button
                className="secondary"
                disabled={busy}
                aria-label={"Remove " + file.name}
                onClick={() => changeFiles(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {files.length > 0 &&
          (isPdf ? (
            <PdfEditor
              files={files}
              id={id}
              values={values}
              onValues={onValues}
              busy={busy}
              pdf={pdf}
              onPdf={setPdf}
            />
          ) : (
            <ImageEditor
              files={files}
              id={id}
              values={values}
              onValues={onValues}
              busy={busy}
            />
          ))}
        {id === "compress-pdf" && files.length > 0 && (
          <PdfQualityPreview file={files[0]} values={values} busy={busy} />
        )}
        <details
          className="settings-disclosure"
          open={settingsOpen}
          onToggle={(e) => setSettingsOpen(e.currentTarget.open)}
        >
          <summary>
            Settings{" "}
            <span>{settingsOpen ? "Hide" : "Adjust and process again"}</span>
          </summary>
          <Settings
            id={id}
            values={values}
            onChange={(key, value) => {
              const patch = { [key]: value };
              if (
                id === "resize-image" &&
                values.keepProportions &&
                ["width", "height"].includes(key) &&
                Number(value) > 0
              ) {
                const ratio = Number(values.width) / Number(values.height);
                if (Number.isFinite(ratio) && ratio > 0)
                  patch[key === "width" ? "height" : "width"] = String(
                    Number(
                      (key === "width"
                        ? Number(value) / ratio
                        : Number(value) * ratio
                      ).toFixed(values.unit === "px" ? 0 : 3),
                    ),
                  );
              }
              onValues(patch);
            }}
            busy={busy}
          />
        </details>
        {notices[id] && <p className="notice">{notices[id]}</p>}
        <div className="process-actions">
          <p
            className="output-summary"
            id="output-summary"
            aria-live="polite"
            hidden={!isPdf || !files.length}
          >
            {pdf.error ||
              (!pdf.ready
                ? "Loading page previews…"
                : rangeError ||
                  `${count} ${count === 1 ? "page" : "pages"} ${id === "compress-pdf" ? "to compress" : id === "merge-pdf" ? "to merge" : "selected"}`)}
          </p>
          <button
            className="primary"
            id="process"
            disabled={disabled}
            onClick={run}
          >
            <Icon name="wand-sparkles" />
            {busy
              ? "Processing…"
              : id === "merge-pdf"
                ? "Merge PDFs"
                : id === "split-pdf"
                  ? "Extract pages"
                  : "Process file" + (multi ? "s" : "")}
          </button>
        </div>
        {busy && (
          <progress
            className="processing-progress"
            aria-label={status || "Processing file"}
          />
        )}
        <div
          id="status"
          className={"status " + (error ? "error" : "")}
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          {status}
        </div>
        <div className="outputs" id="outputs" ref={resultsRef} tabIndex={-1}>
          {outputs.length > 0 && (
            <div className="results-summary">
              <h2>
                {busy || error ? "Available downloads" : "Your files are ready"}
              </h2>
              <p>
                Original: {size(files.reduce((sum, f) => sum + f.size, 0))} →
                Output: {size(outputs.reduce((sum, r) => sum + r.blob.size, 0))}
                {!busy &&
                  !error &&
                  (() => {
                    const original = files.reduce((sum, f) => sum + f.size, 0),
                      total = outputs.reduce((sum, r) => sum + r.blob.size, 0);
                    return original
                      ? ` · ${Math.abs((1 - total / original) * 100).toFixed(1)}% ${total <= original ? "smaller" : "larger"}`
                      : "";
                  })()}
              </p>
              <small>
                Compare the result before submitting. Your original files are
                unchanged.
              </small>
            </div>
          )}
          {outputs.map((result, i) => (
            <Download key={i} result={result} />
          ))}
        </div>
      </section>
      <ToolGuide id={id} />
      <div className="steps">
        {[
          [
            "01. Choose your file",
            "Add a file from your device. It stays in your browser.",
          ],
          [
            "02. Make it yours",
            "Adjust the settings for the form or document you need.",
          ],
          [
            "03. Save & carry on",
            "Download the result. Your original file stays unchanged.",
          ],
        ].map(([title, body]) => (
          <div key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
