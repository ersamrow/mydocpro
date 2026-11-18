import TrustBadges from "./TrustBadges.js";
import ExamLinks from "./ExamLinks.js";
import WhatsAppChannel from "./WhatsAppChannel.js";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Icon } from "./Shared.js";
import useToolSettings from "./useToolSettings.js";
import ZipDownload from "./ZipDownload.js";
import { inspectFiles, throwIfCancelled } from "../src/file-validation.js";
import { actionLabels } from "../src/ui-copy.js";
import Settings from "./Settings.js";
import Dropzone from "./Dropzone.js";
import { settingsSummary } from "../src/settings-ui.js";
import ToolGuide from "./ToolGuide.js";
import {
  batchTools,
  pdfTools,
  multiTools,
  size,
  validateFiles,
} from "../src/tool-settings.js";
import { pageSeo } from "../src/seo.js";
import { pageIndices } from "../src/page-indices.js";
import { downloadName } from "../src/download-name.js";

const PdfQualityPreview = dynamic(() => import("./PdfQualityPreview.js"));
const ImageEditor = dynamic(() => import("./ImageEditor.js"));
const PdfEditor = dynamic(() => import("./PdfEditor.js"));
const UpscSignaturePreset = dynamic(() => import("./UpscSignaturePreset.js"));

function useResultUrl(blob) {
  const [resource, setResource] = useState(null);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setResource({ blob, url: u });
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return resource?.blob === blob ? resource.url : "";
}

function Download({ result }) {
  const url = useResultUrl(result.blob);
  const format =
    result.blob.type === "application/pdf"
      ? "PDF"
      : result.blob.type === "image/jpeg"
        ? "JPG"
        : result.blob.type.split("/")[1]?.toUpperCase() || "file";
  if (!url)
    return (
      <button className="primary" disabled>
        Preparing download…
      </button>
    );
  return (
    <a
      className="merge-bar-download"
      href={url}
      download={result.name}
      aria-label={`Download ${result.name}`}
    >
      Download {format} ↓
    </a>
  );
}

function DownloadActions({ outputs }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, outputs.length - 1);
  return (
    <div className="download-actions">
      {outputs.length > 1 && (
        <label className="download-file-choice">
          File
          <select
            aria-label="File to download"
            value={index}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {outputs.map((result, i) => (
              <option key={i} value={i}>
                {result.name} · {size(result.blob.size)}
              </option>
            ))}
          </select>
        </label>
      )}
      <Download result={outputs[index]} />
      {outputs.length > 1 && <ZipDownload outputs={outputs} busy={false} />}
    </div>
  );
}

function ResultPreview({ result }) {
  const image = result.blob.type.startsWith("image/");
  const url = useResultUrl(image ? result.blob : null);
  return (
    <div className="output result-preview">
      {image && url && (
        <img
          src={url}
          width="64"
          height="64"
          alt={`Preview of ${result.name}`}
        />
      )}
      <span>
        <strong>{result.name}</strong>
        <small>{size(result.blob.size)}</small>
      </span>
    </div>
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
export default function Workspace({
  tool,
  examLinks,
  embedded = false,
  initialFiles = [],
  onFilesChange,
  onWorkingChange,
}) {
  const [id, title] = tool,
    router = useRouter();
  const [files, setFiles] = useState(initialFiles),
    [busy, setBusy] = useState(false),
    [validating, setValidating] = useState(false),
    [cancelling, setCancelling] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(false),
    [outputs, setOutputs] = useState([]),
    [pdf, setPdf] = useState({ entries: [], ready: false, error: "" }),
    [settingsOpen, setSettingsOpen] = useState(initialFiles.length > 0);
  const [tripleSignature, setTripleSignature] = useState(false);
  const actionsRef = useRef(null),
    controller = useRef(null),
    selecting = useRef(false);
  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);
  useEffect(() => {
    onWorkingChange?.(busy || validating);
  }, [busy, validating, onWorkingChange]);
  const {
    values,
    setValues,
    onValues,
    remember,
    setRemember,
    canUndo,
    undo,
    reset,
    storageNote,
  } = useToolSettings(id, () => {
    setOutputs([]);
    setStatus("");
  });
  const upload = useRef(null),
    replace = useRef(false),
    alive = useRef(true),
    processing = useRef(false);
  const isPdf = pdfTools.includes(id),
    isMerge = id === "merge-pdf",
    multi = multiTools.includes(id),
    meta = pageSeo(id);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
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
  async function choose(incoming, replacing = false) {
    if (busy || selecting.current || !incoming.length) return;
    selecting.current = true;
    setValidating(true);
    setStatus("Checking files…");
    try {
      const next = validateFiles(Array.from(incoming), files, {
        pdf: isPdf,
        multi,
        replace: replacing,
      });
      await inspectFiles(Array.from(incoming), isPdf);
      if (!alive.current) return;
      setSettingsOpen(next.length > 0);
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
    } finally {
      selecting.current = false;
      if (alive.current) setValidating(false);
    }
  }
  function changeFiles(next) {
    if (busy || validating) return;
    setSettingsOpen(next.length > 0);
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
    validating ||
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
    setCancelling(false);
    const abortController = new AbortController();
    controller.current = abortController;
    const signal = abortController.signal;
    setOutputs([]);
    setError(false);
    setStatus("Processing on your device…");
    let note = "",
      succeeded = false;
    let outputBytes = 0;
    const output = (blob, name) => {
      throwIfCancelled(signal);
      outputBytes += blob.size;
      if (outputBytes > 150 * 1048576)
        throw Error(
          "Results exceed 150 MB. Download the completed files, then process a smaller batch.",
        );
      if (alive.current)
        setOutputs((out) => [
          ...out,
          {
            blob,
            name:
              batchTools.includes(id) && files.length > 1
                ? `${out.length + 1}-${downloadName(values["output-name"] || "", name)}`
                : downloadName(values["output-name"] || "", name),
          },
        ]);
    };
    try {
      await new Promise((r) => setTimeout(r, 20));
      const { processImage, processPdf } = await import("../src/processing.js");
      throwIfCancelled(signal);
      if (isPdf || id === "jpg-to-pdf")
        await processPdf(id, files, values, {
          signal,
          order: pdf.entries,
          onOutput: output,
          onStatus: (text) => {
            if (text.startsWith("This PDF")) note = text;
            if (alive.current) setStatus(text);
          },
        });
      else {
        const batches = batchTools.includes(id)
          ? files.map((f) => [f])
          : [files];
        for (const [index, batch] of batches.entries()) {
          throwIfCancelled(signal);
          setStatus(`Processing image ${index + 1} of ${batches.length}…`);
          const blob = await processImage(id, batch, values, false, signal);
          output(
            blob,
            `mydocpro-${id}.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`,
          );
        }
      }
      throwIfCancelled(signal);
      succeeded = true;
      if (alive.current)
        setStatus(
          note ||
            "Done! Download from the action bar and check the result before submitting.",
        );
    } catch (e) {
      if (alive.current) {
        setError(true);
        setStatus(
          signal.aborted
            ? "Processing cancelled. Completed downloads remain available."
            : e.message || "Could not process this file. Try another file.",
        );
      }
    } finally {
      processing.current = false;
      if (alive.current) {
        setBusy(false);
        setCancelling(false);
        if (succeeded && window.matchMedia("(max-width: 600px)").matches) {
          setSettingsOpen(false);
          requestAnimationFrame(() =>
            actionsRef.current?.scrollIntoView({
              behavior: "auto",
              block: "center",
            }),
          );
        }
      }
    }
  }
  const Container = embedded ? "section" : "main";
  const FileContainer = "div";
  const PreviewContainer = isMerge ? "details" : "div";
  const HelpContainer = isMerge || embedded ? "details" : "div";
  const PreferenceContainer = isMerge || embedded ? "details" : "div";
  const Heading = embedded ? "h2" : "h1";
  const summary = settingsSummary(id, values);
  return (
    <Container
      className={
        (isMerge ? "merge-workspace " : "") +
        (id === "crop-image" ? "crop-workspace " : "") +
        (embedded
          ? "tool-workspace combined-operation"
          : "workspace tool-workspace")
      }
    >
      <div className="tool-heading">
        <div className="tool-heading-meta">
          <span className="eyebrow">
            {tool[3] === "pdf"
              ? "PDF TOOLS"
              : tool[3] === "special"
                ? "PHOTO PRESETS"
                : "IMAGE TOOLS"}
          </span>
          <Link className="back" href="/">
            <Icon name="grid2x2" />
            All tools
          </Link>
        </div>
        <div className="page-intro-heading">
          <span className="page-emblem">
            <Icon name={tool[4]} />
          </span>
          <Heading>{embedded ? title : meta.name}</Heading>
        </div>
        <p className="intro">
          {isMerge
            ? "Combine PDFs in your preferred order. Add files, arrange pages, and download one document."
            : meta.description}{" "}
        </p>
        {!embedded && <TrustBadges toolId={id} />}
      </div>
      {!embedded && id === "exam-photo" && (
        <>
          <ExamLinks exams={examLinks} />
          <WhatsAppChannel />
        </>
      )}
      {!embedded && id === "signature" && (
        <label className="settings">
          Signature preset
          <select
            disabled={busy || validating}
            value={tripleSignature ? "upsc" : "standard"}
            onChange={(event) =>
              setTripleSignature(event.target.value === "upsc")
            }
          >
            <option value="standard">Standard signature cleanup</option>
            <option value="upsc">UPSC triple signature</option>
          </select>
        </label>
      )}
      {tripleSignature && (
        <UpscSignaturePreset
          initialFile={files[0]}
          onFileChange={(file) => changeFiles([file])}
        />
      )}
      <section
        hidden={tripleSignature}
        className={
          "workpanel tool-panel " +
          (files.length ? "has-files " : "") +
          (isPdf && files.length ? "pdf-editor-panel" : "")
        }
      >
        <ol className="workflow-steps" aria-label="Tool workflow">
          {(isMerge
            ? ["Add PDFs", "Arrange pages", "Merge & download"]
            : ["Choose files", "Adjust settings", "Download"]
          ).map((label, index) => {
            const stage = outputs.length && !busy ? 2 : files.length ? 1 : 0;
            return (
              <li
                key={label}
                aria-current={stage === index ? "step" : undefined}
                className={index < stage ? "completed" : ""}
              >
                <span aria-hidden="true">
                  {index < stage ? "✓" : index + 1}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <div className="merge-layout">
          <div className="merge-canvas">
            <Dropzone
              id="upload"
              inputRef={upload}
              hidden={files.length > 0}
              disabled={busy || validating}
              multiple={multi}
              accept={
                isPdf
                  ? "application/pdf,.pdf"
                  : "image/jpeg,image/png,image/webp"
              }
              title={
                isMerge
                  ? "Drop your PDFs here"
                  : `Choose ${isPdf ? "PDFs" : "images"} or drop them here`
              }
              hint={
                isMerge
                  ? "Select 2+ files · Up to 100 MB / 300 pages"
                  : isPdf
                    ? "PDF, up to 100 MB total / 300 pages"
                    : "JPG, PNG or WebP, up to 25 MB per image"
              }
              buttonLabel={isPdf ? "Choose PDFs" : "Choose images"}
              onFiles={(incoming) => {
                choose(incoming, replace.current);
                replace.current = false;
              }}
            />
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
            <FileContainer
              className="merge-file-manager"
              hidden={!files.length}
            >
              {isMerge && (
                <div className="merge-list-heading">
                  Your documents{" "}
                  <span>
                    {files.length} files ·{" "}
                    {size(files.reduce((sum, file) => sum + file.size, 0))}
                  </span>
                </div>
              )}
              <ul className="file-list" id="file-list">
                {files.map((file, i) => (
                  <li key={i}>
                    {isMerge && (
                      <span className="merge-file-icon">
                        <Icon name="file-text" />
                      </span>
                    )}
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
                    {isMerge && files.length > 1 && (
                      <button
                        className="secondary"
                        disabled={busy || validating || i === files.length - 1}
                        aria-label={"Move " + file.name + " down"}
                        onClick={() => {
                          const next = [...files];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          changeFiles(next);
                        }}
                      >
                        ↓
                      </button>
                    )}
                    <button
                      className="secondary"
                      disabled={busy}
                      aria-label={"Remove " + file.name}
                      onClick={() =>
                        changeFiles(files.filter((_, j) => j !== i))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </FileContainer>
            <PreviewContainer
              className="merge-page-editor"
              open={isMerge && embedded ? true : undefined}
              hidden={!files.length}
            >
              {isMerge && (
                <summary>
                  Arrange individual pages{" "}
                  <span>Optional · preview, zoom & reorder</span>
                </summary>
              )}
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
            </PreviewContainer>
            {id === "compress-pdf" && files.length > 0 && (
              <PdfQualityPreview file={files[0]} values={values} busy={busy} />
            )}
          </div>
          <div className="merge-controls">
            {isMerge && (
              <div className="merge-output-heading">
                <span className="eyebrow">FINAL DOCUMENT</span>
                <h2>Ready to bring it together?</h2>
                <p>
                  All pages are included in the order shown. Your original PDFs
                  stay unchanged.
                </p>
              </div>
            )}
            <details
              className="settings-disclosure tool-settings-details"
              hidden={embedded && !files.length}
              open={files.length > 0 && settingsOpen}
              onToggle={(e) =>
                setSettingsOpen(files.length > 0 && e.currentTarget.open)
              }
            >
              <summary
                aria-disabled={!files.length}
                onClick={(event) => {
                  if (!files.length) event.preventDefault();
                }}
              >
                Adjust settings
                <span className="tool-settings-summary" title={summary}>
                  {summary}
                </span>
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
              <PreferenceContainer className="merge-preferences">
                {(isMerge || embedded) && (
                  <summary>Preferences & reset</summary>
                )}
                <div className="settings-toolbar">
                  <button
                    className="secondary"
                    disabled={busy || validating || !canUndo}
                    onClick={undo}
                  >
                    Undo settings
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || validating}
                    onClick={reset}
                  >
                    Reset settings
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      disabled={busy || validating}
                      onChange={(e) => setRemember(e.target.checked)}
                    />{" "}
                    Remember settings on this device
                  </label>
                </div>
                <p className="preference-note" role="status">
                  {storageNote}
                </p>
              </PreferenceContainer>
            </details>
            {notices[id] && <p className="notice">{notices[id]}</p>}
            <div className="process-actions" ref={actionsRef}>
              <p
                className="output-summary"
                id="output-summary"
                aria-live="polite"
                hidden={false}
              >
                {outputs.length > 0 && !busy
                  ? `${outputs.length} ${outputs.length === 1 ? "file" : "files"} ready to download${error ? " · Some files could not be completed" : ""}`
                  : !files.length
                    ? "Choose a file above to get started."
                    : !isPdf
                      ? `${files.length} ${files.length === 1 ? "image" : "images"} ready · Review settings, then save.`
                      : pdf.error ||
                        (!pdf.ready
                          ? "Loading page previews…"
                          : (id === "merge-pdf" && files.length < 2
                              ? "Add one more PDF to merge."
                              : rangeError) ||
                            `${count} ${count === 1 ? "page" : "pages"} ${id === "compress-pdf" ? "to compress" : id === "merge-pdf" ? "to merge" : "selected"}`)}
              </p>
              {isMerge && (
                <button
                  className="secondary merge-add-files"
                  disabled={busy || validating}
                  onClick={() => {
                    replace.current = false;
                    upload.current.click();
                  }}
                >
                  <Icon name="upload" />
                  Add PDFs
                </button>
              )}
              <button
                className="primary"
                id="process"
                hidden={outputs.length > 0 && !busy && !error}
                disabled={disabled}
                onClick={run}
                aria-describedby="output-summary"
              >
                <Icon name="wand-sparkles" />
                {busy ? "Processing…" : actionLabels[id] || "Save result"}
              </button>
              {outputs.length > 0 && !busy && (
                <DownloadActions outputs={outputs} />
              )}
              {busy && (
                <button
                  className="secondary cancel-processing"
                  disabled={cancelling}
                  onClick={() => {
                    controller.current?.abort();
                    setCancelling(true);
                    setStatus("Cancelling… finishing the current operation.");
                  }}
                >
                  {cancelling ? "Cancelling…" : "Cancel processing"}
                </button>
              )}
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
            <div className="outputs" id="outputs" tabIndex={-1}>
              {outputs.length > 0 && (
                <div className="results-summary">
                  <h2>
                    {busy || error
                      ? "Available downloads"
                      : "Your files are ready"}
                  </h2>
                  <p>
                    Original: {size(files.reduce((sum, f) => sum + f.size, 0))}{" "}
                    → Output:{" "}
                    {size(outputs.reduce((sum, r) => sum + r.blob.size, 0))}
                    {!busy &&
                      !error &&
                      (() => {
                        const original = files.reduce(
                            (sum, f) => sum + f.size,
                            0,
                          ),
                          total = outputs.reduce(
                            (sum, r) => sum + r.blob.size,
                            0,
                          );
                        return original
                          ? ` · ${Math.abs((1 - total / original) * 100).toFixed(1)}% ${total <= original ? "smaller" : "larger"}`
                          : "";
                      })()}
                  </p>
                  <small>
                    Compare the result before submitting. Your original files
                    are unchanged.
                  </small>
                </div>
              )}
              {outputs.map((result, i) => (
                <ResultPreview key={i} result={result} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <HelpContainer className="merge-help">
        {(isMerge || embedded) && (
          <summary>
            Need a hand? <span>Instructions, tips & related tools</span>
          </summary>
        )}
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
      </HelpContainer>
    </Container>
  );
}
