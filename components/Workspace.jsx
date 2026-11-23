import TrustBadges from "./TrustBadges.js";
import {
  Button,
  Card,
  ToolLayout,
  ActionBar,
  FileRow,
  ToolSectionHeading,
} from "./ui.js";
import ExamLinks from "./ExamLinks.js";
import WhatsAppChannel from "./WhatsAppChannel.js";
import { Fragment, useEffect, useRef, useState } from "react";
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
import ResizeImageSizes, { ResizePresets } from "./ResizeImageSizes.js";
import { resizePresetValues } from "../src/resize-presets.js";
import {
  batchTools,
  pdfTools,
  multiTools,
  size,
  validateFiles,
} from "../src/tool-settings.js";
import { pageSeo } from "../src/seo.js";
import { pageIndices } from "../src/page-indices.js";
import { useObjectUrl } from "./useObjectUrl.js";
import { downloadName, toolOutputName } from "../src/download-name.js";
import {
  conversionAccept,
  conversionFormats,
  conversionHints,
  sourceImageType,
} from "../src/image-formats.js";

const PdfQualityPreview = dynamic(() => import("./PdfQualityPreview.js"));
const ImageEditor = dynamic(() => import("./ImageEditor.js"));
const PdfEditor = dynamic(() => import("./PdfEditor.js"));
const UpscSignaturePreset = dynamic(() => import("./UpscSignaturePreset.js"));

const useResultUrl = useObjectUrl;

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
      <Button className="primary" disabled>
        Preparing download…
      </Button>
    );
  return (
    <Button
      as="a"
      variant="primary"
      className="merge-bar-download"
      href={url}
      download={result.name}
      aria-label={`Download ${result.name}`}
    >
      Download {format} ↓
    </Button>
  );
}

function FileThumbnail({ file }) {
  const url = useResultUrl(file);
  return url ? (
    <img
      className="convert-file-thumbnail"
      src={url}
      alt=""
      width="40"
      height="40"
    />
  ) : null;
}

function SelectedImagePreview({ file }) {
  const url = useResultUrl(file);
  return url ? (
    <div className="ui-source-preview">
      <img src={url} alt={`Selected image: ${file.name}`} />
    </div>
  ) : null;
}

function DownloadActions({ outputs }) {
  return (
    <div className="download-actions">
      {outputs.length > 1 ? (
        <ZipDownload outputs={outputs} busy={false} />
      ) : (
        <Download result={outputs[0]} />
      )}
    </div>
  );
}

function ResultPreview({ result }) {
  const image = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/bmp",
    "image/x-icon",
    "image/gif",
  ].includes(result.blob.type);
  const url = useResultUrl(result.blob);
  return (
    <FileRow as="div" className="output result-preview ui-result-row">
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
        {result.warnings?.map((warning) => (
          <small className="result-warning" key={warning}>
            {warning}
          </small>
        ))}
      </span>
      {url && (
        <Button
          as="a"
          variant="primary"
          className="primary result-file-download"
          href={url}
          download={result.name}
          aria-label={`Download ${result.name}`}
        >
          <span aria-hidden="true">↓</span> Download
        </Button>
      )}
    </FileRow>
  );
}
const notices = {
  "exam-photo":
    "These are generic sizes, not verified exam requirements. Check the current official notification for dimensions, file size, and live-photo rules before submitting.",
  "compress-pdf":
    "Text is preserved when embedded images can be compressed. Scanned PDFs may be rebuilt as images. A target size is not guaranteed; inspect the result before submitting.",
  "white-background":
    "Start with Gentle or Balanced tolerance and compare the preview to protect subject details. Choose A4 with white space to set photo width, margins and position. Print the A4 PDF at Actual size (100%).",
  "crop-image":
    "Drag the crop area or its corners above. Use the fields for precise ratio, rotation and zoom.",
  "join-images":
    "Choose 2–6 images and reorder with the arrows. The Aadhaar preset leaves white space on an A4 page. Adjust image width, margins and position; print the A4 PDF at Actual size (100%).",
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
  const sameSourceFormat = (format) =>
    files.length > 0 && files.every((file) => sourceImageType(file) === format);
  useEffect(() => {
    if (id !== "convert-image" || !sameSourceFormat(values.format)) return;
    onValues({
      format: values.format === "image/jpeg" ? "image/png" : "image/jpeg",
    });
  }, [id, files, values.format, onValues]);
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
    if (id === "name-date") {
      const today = new Date();
      onValues({
        date: [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-"),
      });
    }
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
      let next = validateFiles(Array.from(incoming), files, {
        pdf: isPdf,
        multi,
        replace: replacing,
        allowImages: isMerge,
      });
      if (isMerge) {
        for (const file of incoming)
          await inspectFiles([file], /\.pdf$/i.test(file.name));
        const { imageFileToPdf } = await import("../src/pdf-processing.js");
        const converted = [];
        for (const file of next) {
          if (!alive.current) return;
          if (/\.pdf$/i.test(file.name)) converted.push(file);
          else {
            setStatus(`Preparing ${file.name} as a PDF page…`);
            converted.push(await imageFileToPdf(file));
          }
        }
        next = validateFiles(converted, [], {
          pdf: true,
          multi: true,
          replace: true,
        });
      } else await inspectFiles(Array.from(incoming), isPdf);
      if (id === "join-images" && next.length > 6)
        throw Error("Choose between 2 and 6 images to join.");
      if (!isPdf) {
        const { normalizeImageFile } =
          await import("../src/image-processing.js");
        next = await Promise.all(next.map(normalizeImageFile));
      }
      if (!alive.current) return;
      setSettingsOpen(id !== "convert-image" && next.length > 0);
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
    setSettingsOpen(id !== "convert-image" && next.length > 0);
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
    } catch (e) {
      count = 0;
      rangeError = pdf.ready ? e.message : "";
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
    const output = (blob, name, metadata = {}) => {
      throwIfCancelled(signal);
      outputBytes += blob.size;
      if (outputBytes > 150 * 1048576)
        throw Error(
          "Results exceed 150 MB. Download the completed files, then process a smaller batch.",
        );
      if (alive.current)
        setOutputs((out) => {
          const requested = downloadName(values["output-name"] || "", name);
          const extension = requested.slice(requested.lastIndexOf("."));
          const stem = requested.slice(0, -extension.length);
          let unique = requested,
            suffix = 2;
          while (out.some((result) => result.name === unique))
            unique = `${stem}_${suffix++}${extension}`;
          return [
            ...out,
            {
              blob,
              name: unique,
              warnings: metadata.warnings || blob.warnings || [],
            },
          ];
        });
    };
    try {
      await new Promise((r) => setTimeout(r, 20));
      const { processImage, processPdf } = await import("../src/processing.js");
      throwIfCancelled(signal);
      if (isPdf || id === "jpg-to-pdf") {
        const report = await processPdf(id, files, values, {
          signal,
          order: pdf.entries,
          onOutput: output,
          onStatus: (text) => {
            if (text.startsWith("This PDF")) note = text;
            if (alive.current) setStatus(text);
          },
        });
        if (report?.message) note = report.message;
      } else {
        const batches = batchTools.includes(id)
          ? files.map((f) => [f])
          : [files];
        for (const [index, batch] of batches.entries()) {
          throwIfCancelled(signal);
          setStatus(`Processing image ${index + 1} of ${batches.length}…`);
          const blob = await processImage(id, batch, values, false, signal);
          output(blob, toolOutputName(batch[0].name, id, values, blob.type));
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
  const Container = ToolLayout;
  const FileContainer = "div";
  const PreviewContainer = isMerge ? "details" : "div";
  const HelpContainer = Card;
  const PreferenceContainer = isMerge || embedded ? "details" : "div";
  const Heading = embedded ? "h2" : "h1";
  const compactSettings = !["convert-image", "merge-pdf"].includes(id);
  const sideLayout = !isMerge;
  const SettingsGroup = sideLayout
    ? Card
    : id === "compress-image"
      ? "div"
      : Fragment;
  const summary = settingsSummary(id, values);
  const selectResizePreset = (preset) => {
    onValues(resizePresetValues(preset));
    setSettingsOpen(true);
  };
  return (
    <Container
      as={embedded ? "section" : "main"}
      className={
        (isMerge ? "merge-workspace " : "") +
        (compactSettings ? "ui-compact-workspace " : "") +
        (sideLayout && files.length > 0 ? "ui-side-workspace " : "") +
        (id === "convert-image" ? "convert-workspace " : "") +
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
          <Button as={Link} className="back" href="/">
            <Icon name="grid2x2" />
            All tools
          </Button>
        </div>
        <div className="page-intro-heading">
          <span className="page-emblem">
            <Icon name={tool[4]} />
          </span>
          <Heading>{embedded ? title : meta.name}</Heading>
        </div>
        <p className="intro">
          {isMerge
            ? "Combine PDFs and images in your preferred order. Add files, arrange pages, and download one document."
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
      <Card
        hidden={tripleSignature}
        className={
          "workpanel tool-panel " +
          (files.length ? "has-files " : "") +
          (isPdf && files.length ? "pdf-editor-panel" : "")
        }
      >
        <ol
          className="workflow-steps"
          aria-label="Tool workflow"
          hidden={sideLayout && files.length > 0}
        >
          {(isMerge
            ? ["Add PDFs or images", "Arrange pages", "Merge & download"]
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
            {sideLayout && files.length > 0 && (
              <ToolSectionHeading
                step="2"
                title="Upload & preview"
                description="Check your file before saving."
              />
            )}
            <Dropzone
              id="upload"
              inputRef={upload}
              hidden={files.length > 0}
              disabled={busy || validating}
              multiple={multi}
              accept={
                isMerge
                  ? "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  : isPdf
                    ? "application/pdf,.pdf"
                    : conversionAccept
              }
              title={
                isMerge
                  ? "Choose PDFs or images, or drop them here"
                  : `Choose ${isPdf ? (multi ? "PDFs" : "a PDF") : multi ? "images" : "an image"} or drop ${multi ? "them" : "it"} here`
              }
              hint={
                isMerge
                  ? "Select 2+ PDFs or images · 25 MB per image · 100 MB total / 300 pages"
                  : isPdf
                    ? "PDF, up to 100 MB total / 300 pages"
                    : "JPG, PNG, WebP, AVIF, BMP, ICO, GIF or HEIC/HEIF · up to 25 MB · animated inputs export as still images"
              }
              buttonLabel={
                isMerge
                  ? "Choose PDFs or images"
                  : isPdf
                    ? "Choose PDFs"
                    : multi
                      ? "Choose images"
                      : "Choose image"
              }
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
                  <Button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      replace.current = false;
                      upload.current.click();
                    }}
                  >
                    Add more files
                  </Button>
                )}
                {files.length > 0 && (
                  <Button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      replace.current = true;
                      upload.current.click();
                    }}
                  >
                    {multi ? "Replace all" : "Upload another file"}
                  </Button>
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
                  <FileRow key={i}>
                    {id === "convert-image" && <FileThumbnail file={file} />}
                    {isMerge && (
                      <span className="merge-file-icon">
                        <Icon name="file-text" />
                      </span>
                    )}
                    <span>
                      {id === "join-images" ? `Image ${i + 1}: ` : ""}
                      {file.name}
                    </span>
                    <small>{size(file.size)}</small>
                    {files.length > 1 && id !== "convert-image" && (
                      <Button
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
                      </Button>
                    )}
                    {isMerge && files.length > 1 && (
                      <Button
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
                      </Button>
                    )}
                    <Button
                      className="secondary"
                      disabled={busy}
                      aria-label={"Remove " + file.name}
                      onClick={() =>
                        changeFiles(files.filter((_, j) => j !== i))
                      }
                    >
                      <Icon name="trash-2" />
                    </Button>
                  </FileRow>
                ))}
              </ul>
            </FileContainer>
            {id === "convert-image" && files.length > 0 && (
              <SelectedImagePreview file={files[0]} />
            )}
            <PreviewContainer
              className="merge-page-editor"
              open={isMerge && (embedded || !!pdf.error) ? true : undefined}
              hidden={!files.length}
            >
              {isMerge && (
                <summary>
                  Arrange individual pages{" "}
                  <span>Optional · preview, zoom & reorder</span>
                </summary>
              )}
              {files.length > 0 &&
                id !== "convert-image" &&
                (isPdf ? (
                  <PdfEditor
                    files={files}
                    id={id}
                    values={values}
                    onValues={onValues}
                    busy={busy || validating}
                    pdf={pdf}
                    onPdf={setPdf}
                  />
                ) : (
                  <ImageEditor
                    files={files}
                    id={id}
                    values={values}
                    onValues={onValues}
                    busy={busy || validating}
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
                  All pages are included in the order shown. Images become A4
                  pages, with orientation chosen for each image.
                </p>
              </div>
            )}
            <SettingsGroup
              {...(sideLayout
                ? {
                    hidden:
                      !files.length &&
                      !["compress-image", "convert-image"].includes(id),
                    className:
                      "ui-options-card" +
                      (id === "compress-image"
                        ? " compress-settings-panel"
                        : ""),
                  }
                : id === "compress-image"
                  ? { className: "compress-settings-panel" }
                  : {})}
            >
              {sideLayout && files.length > 0 && (
                <ToolSectionHeading
                  step="1"
                  title="Adjust settings"
                  description="Choose the size and format you need."
                />
              )}
              {id === "convert-image" && (
                <section
                  className="convert-options"
                  aria-labelledby="convert-options-heading"
                >
                  <div className="convert-options-heading">
                    <Icon name="replace" />
                    <div>
                      <h2 id="convert-options-heading">Convert to</h2>
                      <p>Choose a format for all selected images.</p>
                    </div>
                  </div>
                  <div
                    className="convert-format-buttons"
                    role="group"
                    aria-label="Output format"
                  >
                    {conversionFormats
                      .filter(([format]) => !sameSourceFormat(format))
                      .map(([format, label, hint]) => (
                        <Button
                          type="button"
                          key={format}
                          disabled={busy || validating}
                          aria-pressed={values.format === format}
                          title={`Convert to ${label}`}
                          onClick={() => onValues({ format })}
                        >
                          <strong>{label}</strong>
                          <small>{hint}</small>
                        </Button>
                      ))}
                  </div>
                  {["image/jpeg", "image/webp"].includes(values.format) && (
                    <div className="convert-quality">
                      <label htmlFor="quality">Quality</label>
                      <input
                        id="quality"
                        type="number"
                        min="1"
                        max="100"
                        value={values.quality}
                        disabled={busy || validating}
                        onChange={(event) =>
                          onValues({ quality: event.target.value })
                        }
                      />
                      <input
                        aria-label="Image quality"
                        type="range"
                        min="1"
                        max="100"
                        value={values.quality}
                        disabled={busy || validating}
                        onChange={(event) =>
                          onValues({ quality: event.target.value })
                        }
                      />
                    </div>
                  )}
                  <p className="convert-format-hint">
                    {conversionHints[values.format]}
                  </p>
                </section>
              )}
              {id === "compress-image" && (
                <div className="compress-quick-settings">
                  <Settings
                    id={id}
                    values={values}
                    busy={busy || validating}
                    only={["target"]}
                    compact={compactSettings}
                    onChange={(key, value) => onValues({ [key]: value })}
                  />
                </div>
              )}
              {id === "resize-image" && (
                <ResizePresets
                  values={values}
                  onSelect={selectResizePreset}
                  disabled={busy || validating}
                />
              )}
              <details
                className="settings-disclosure tool-settings-details"
                hidden={(embedded || compactSettings) && !files.length}
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
                  {id === "convert-image"
                    ? "Filename & preferences"
                    : sideLayout
                      ? "Size & output options"
                      : "Adjust settings"}
                  <span className="tool-settings-summary" title={summary}>
                    {summary}
                  </span>
                </summary>
                <Settings
                  id={id}
                  compact={compactSettings}
                  exclude={
                    id === "compress-image"
                      ? ["target"]
                      : id === "convert-image"
                        ? ["format", "quality"]
                        : []
                  }
                  values={values}
                  onChange={(key, value) => {
                    const patch = { [key]: value };
                    if (
                      id === "split-pdf" &&
                      key === "mode" &&
                      value === "every"
                    )
                      patch.pages = "all";
                    if (
                      id === "join-images" &&
                      key === "preset" &&
                      value === "aadhaar"
                    )
                      Object.assign(patch, {
                        layout: "vertical",
                        spacing: "16",
                      });
                    if (
                      id === "resize-image" &&
                      values.keepProportions &&
                      ["width", "height"].includes(key) &&
                      Number(value) > 0
                    ) {
                      const ratio =
                        Number(values.width) / Number(values.height);
                      if (Number.isFinite(ratio) && ratio > 0)
                        patch[key === "width" ? "height" : "width"] = String(
                          Number(
                            (key === "width"
                              ? Number(value) / ratio
                              : Number(value) * ratio
                            ).toFixed(values.unit === "px" ? 0 : 6),
                          ),
                        );
                    }
                    onValues(patch);
                  }}
                  busy={busy || validating}
                />
                <PreferenceContainer className="merge-preferences">
                  {(isMerge || embedded) && (
                    <summary>Preferences & reset</summary>
                  )}
                  <div className="settings-toolbar">
                    <Button
                      className="secondary"
                      disabled={busy || validating || !canUndo}
                      onClick={undo}
                    >
                      Undo settings
                    </Button>
                    <Button
                      className="secondary"
                      disabled={busy || validating}
                      onClick={reset}
                    >
                      Reset settings
                    </Button>
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
            </SettingsGroup>
            {notices[id] && <p className="notice">{notices[id]}</p>}
            {files.length > 0 && (
              <ActionBar ref={actionsRef}>
                <p
                  className="output-summary"
                  id="output-summary"
                  aria-live="polite"
                  hidden={false}
                >
                  {outputs.length > 0 && !busy
                    ? `${outputs.length} ${outputs.length === 1 ? "file" : "files"} ready to download${error ? " · Some files could not be completed" : ""}`
                    : !isPdf
                      ? `${files.length} ${files.length === 1 ? "image" : "images"} ready · Review settings, then save.`
                      : (pdf.error ? "Choose another PDF to continue." : "") ||
                        (!pdf.ready
                          ? "Loading page previews…"
                          : (id === "merge-pdf" && files.length < 2
                              ? "Add one more PDF or image to merge."
                              : rangeError) ||
                            `${count} ${count === 1 ? "page" : "pages"} ${id === "compress-pdf" ? "to compress" : id === "merge-pdf" ? "to merge" : "selected"}`)}
                </p>
                {isMerge && (
                  <Button
                    className="secondary merge-add-files"
                    disabled={busy || validating}
                    onClick={() => {
                      replace.current = false;
                      upload.current.click();
                    }}
                  >
                    <Icon name="upload" />
                    Add PDFs or images
                  </Button>
                )}
                <Button
                  className="primary"
                  id="process"
                  hidden={outputs.length > 0 && !busy && !error}
                  disabled={disabled}
                  onClick={run}
                  aria-describedby="output-summary"
                >
                  <Icon name="wand-sparkles" />
                  {busy ? "Processing…" : actionLabels[id] || "Save result"}
                </Button>
                {outputs.length > 0 && !busy && (
                  <DownloadActions outputs={outputs} />
                )}
                {busy && (
                  <Button
                    className="secondary cancel-processing"
                    disabled={cancelling}
                    onClick={() => {
                      controller.current?.abort();
                      setCancelling(true);
                      setStatus("Cancelling… finishing the current operation.");
                    }}
                  >
                    {cancelling ? "Cancelling…" : "Cancel processing"}
                  </Button>
                )}
              </ActionBar>
            )}
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
              hidden={
                id === "convert-image" && outputs.length > 0 && !busy && !error
              }
            >
              {status}
            </div>
            <div className="outputs ui-results" id="outputs" tabIndex={-1}>
              {outputs.length > 0 && id !== "convert-image" && (
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
                        return original &&
                          ["compress-image", "compress-pdf"].includes(id)
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
              {id === "convert-image" && outputs.length > 0 && (
                <p className="ui-result-heading" role="status">
                  <strong>✓ Conversion complete</strong>
                  <span>
                    {size(files.reduce((sum, file) => sum + file.size, 0))}{" "}
                    original →{" "}
                    {size(
                      outputs.reduce(
                        (sum, result) => sum + result.blob.size,
                        0,
                      ),
                    )}{" "}
                    converted
                  </span>
                </p>
              )}
              {outputs.map((result, i) => (
                <ResultPreview
                  key={i}
                  result={result}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
      {id === "resize-image" && !embedded && (
        <>
          <ResizeImageSizes
            values={values}
            onSelect={selectResizePreset}
            disabled={busy || validating}
          />
          <ToolGuide id={id} />
        </>
      )}
      {id !== "resize-image" && (
        <HelpContainer as="details" className="merge-help ui-help">
          <summary>
            Need a hand? <span>Instructions, tips & related tools</span>
          </summary>
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
      )}
    </Container>
  );
}
