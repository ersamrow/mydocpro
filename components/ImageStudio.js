import { visibleField } from "../src/settings-ui.js";
import { Button, Card, ToolLayout, ActionBar } from "./ui.js";
import TrustBadges from "./TrustBadges.js";
import Dropzone from "./Dropzone.js";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Shared.js";
import ImageManipulator from "./ImageManipulator.js";
import ImageEditor from "./ImageEditor.js";
import { resizeFieldProps } from "../src/image-dimensions.js";
import ToolGuide from "./ToolGuide.js";
import { tools } from "../src/tools.js";
import { defaults, fields, size, validateFiles } from "../src/tool-settings.js";
import { inspectFiles, throwIfCancelled } from "../src/file-validation.js";
import {
  processImage,
  adjustImage,
  normalizeImageFile,
  loadImage,
  draw,
  byteBudget,
  compressCanvasToTarget,
} from "../src/processing.js";
import { setImageDensity } from "../src/image-metadata.js";
import { downloadName } from "../src/download-name.js";
import { cropBox } from "../src/image-geometry.js";
import { resizeUnitPatch } from "../src/settings-ui.js";

const operations = [
  "crop-image",
  "resize-image",
  "compress-image",
  "convert-image",
  "white-background",
  "signature",
  "name-date",
  "exam-photo",
  "passport-sheet",
  "join-images",
];
const adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  flipX: false,
  flipY: false,
};
const initialSettings = () =>
  Object.fromEntries(
    operations.map((id) => [
      id,
      {
        ...defaults(id),
        ...([
          "crop-image",
          "resize-image",
          "signature",
          "white-background",
        ].includes(id)
          ? { format: "image/png" }
          : {}),
      },
    ]),
  );
const notes = {
  "compress-image":
    "Creates a JPG; dimensions may shrink to meet the target. Compress after other edits.",
  "white-background":
    "Whiten background connected to the image edges. Tolerance controls which similar colours are included.",
  signature: "Darkens signature strokes and whitens light paper.",
  "exam-photo": "Generic sizes. Check the receiving form’s requirements.",
  "passport-sheet":
    "Photos keep their selected physical size. Choose enough paper for the requested copies.",
  "name-date": "Adds a white text strip below the image.",
};

function Controls({ id, values, update, advanced = false }) {
  return fields(id)
    .filter((f) => f.id !== "output-name")
    .filter((f) => !["white-background", "join-images"].includes(id) || visibleField(f.id, values))
    .filter((f) => {
      const extra =
        id === "crop-image"
          ? ["rotation", "zoom"]
          : id === "resize-image"
            ? ["dpi", "format", "fit"]
            : [];
      return advanced ? extra.includes(f.id) : !extra.includes(f.id);
    })
    .map(({ id: key, label, options, value, ...props }) => {
      if (id === "resize-image")
        Object.assign(props, resizeFieldProps(key, values));
      const inputId = `studio-${id}-${key}`;
      if (options)
        return (
          <fieldset className="studio-options" key={key}>
            <legend>{label}</legend>
            <div>
              {options.map(([v, name]) => (
                <Button
                  type="button"
                  key={v}
                  aria-pressed={values[key] === v}
                  onClick={() =>
                    update({
                      [key]: v,
                      ...(id === "crop-image" &&
                      ["ratio", "rotation", "zoom"].includes(key)
                        ? { "crop-w": "", "crop-h": "" }
                        : {}),
                    })
                  }
                >
                  {name}
                </Button>
              ))}
            </div>
          </fieldset>
        );
      return (
        <label className="studio-field" key={key} htmlFor={inputId}>
          <span>
            {label}
            {props.type === "range" ? `: ${values[key]}` : ""}
          </span>
          <input
            {...props}
            id={inputId}
            value={values[key]}
            onChange={(e) =>
              update({
                [key]: e.target.value,
                ...(id === "crop-image" && key === "zoom"
                  ? { "crop-w": "", "crop-h": "" }
                  : {}),
              })
            }
          />
        </label>
      );
    });
}

async function prepareExport(current, format, options, signal) {
  let result =
    current.type === format
      ? current
      : await processImage(
          "convert-image",
          [current],
          { format, quality: "94" },
          false,
          signal,
        );
  throwIfCancelled(signal);
  const limit = options.maxKB ? byteBudget(options.maxKB) : null;
  const metadataSpace =
    options.dpi && ["image/jpeg", "image/png"].includes(format) ? 32 : 0;
  if (limit && result.size > limit - metadataSpace) {
    const image = await loadImage(result);
    throwIfCancelled(signal);
    const canvas = draw(
      image,
      image.width,
      image.height,
      "contain",
      format === "image/jpeg" ? "#fff" : null,
    );
    try {
      result = await compressCanvasToTarget(
        canvas,
        (limit - metadataSpace) / 1000,
        {
          type: format,
          preserveDimensions: options.preserveDimensions,
          signal,
          maxQuality: 0.94,
          headroom: 1,
        },
      );
    } finally {
      canvas.width = canvas.height = 1;
    }
  }
  if (options.dpi) result = await setImageDensity(result, options.dpi);
  throwIfCancelled(signal);
  if (limit && result.size > limit)
    throw Error(
      "The selected output format cannot fit this size limit. Choose JPG, allow a larger size, or reduce dimensions.",
    );
  return result;
}

export default function ImageStudio({ heading }) {
  const [original, setOriginal] = useState(null),
    [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]),
    [future, setFuture] = useState([]);
  const [settings, setSettings] = useState(initialSettings),
    [adjust, setAdjust] = useState(adjustments);
  const previewFiles = useMemo(() => (current ? [current] : []), [current]);
  const [effectBase, setEffectBase] = useState(null),
    [effectsPending, setEffectsPending] = useState(false);
  const effectQueue = useRef(Promise.resolve());
  const [second, setSecond] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Upload an image to start editing."),
    [error, setError] = useState(false);
  const [url, setUrl] = useState(""),
    [filename, setFilename] = useState(""),
    [dimensions, setDimensions] = useState("");
  const [outputFormat, setOutputFormat] = useState("keep");
  const [documentExport, setDocumentExport] = useState(null);
  const exportOptions = useRef(new WeakMap());
  const [downloadBlob, setDownloadBlob] = useState(null),
    [downloadUrl, setDownloadUrl] = useState(""),
    [exportPending, setExportPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const uploadInput = useRef(null);
  const lock = useRef(false),
    controller = useRef(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!current) return;
    const u = URL.createObjectURL(current),
      im = new Image();
    let dead = false;
    setUrl(u);
    im.src = u;
    im.decode()
      .then(() => {
        if (!dead) setDimensions(`${im.width} × ${im.height} px`);
      })
      .catch(() => {});
    return () => {
      dead = true;
      URL.revokeObjectURL(u);
    };
  }, [current]);
  useEffect(() => {
    if (!current) {
      setDownloadBlob(null);
      return;
    }
    let stale = false;
    const abort = new AbortController();
    const format =
      outputFormat === "keep" ? original?.type || "image/png" : outputFormat;
    setDownloadBlob(null);
    setExportPending(true);
    const prepare = documentExport
      ? Promise.resolve(documentExport)
      : prepareExport(
          current,
          format,
          exportOptions.current.get(current) || {},
          abort.signal,
        );
    prepare
      .then((result) => {
        if (!stale) setDownloadBlob(result);
      })
      .catch((error) => {
        if (!stale && error.name !== "AbortError") {
          setError(true);
          setStatus(error.message);
        }
      })
      .finally(() => {
        if (!stale) setExportPending(false);
      });
    return () => {
      stale = true;
      abort.abort();
    };
  }, [current, original, outputFormat, documentExport]);
  useEffect(() => {
    if (!downloadBlob) {
      setDownloadUrl("");
      return;
    }
    const next = URL.createObjectURL(downloadBlob);
    setDownloadUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [downloadBlob]);
  useEffect(() => {
    if (!effectBase) return;
    let stale = false;
    const abort = new AbortController();
    // Serialize encoding and discard obsolete slider positions.
    const timer = setTimeout(() => {
      effectQueue.current = effectQueue.current
        .catch(() => {})
        .then(async () => {
          if (stale) return;
          try {
            const neutral = Object.keys(adjustments).every(
              (key) => adjust[key] === adjustments[key],
            );
            const result = neutral
              ? effectBase
              : await adjustImage(effectBase, adjust, abort.signal);
            if (stale) return;
            if (result.size > 100 * 1048576)
              throw Error("Result exceeds 100 MB. Try smaller dimensions.");
            exportOptions.current.set(
              result,
              exportOptions.current.get(effectBase) || {},
            );
            setCurrent(result);
            setEffectsPending(false);
            setStatus(
              "Effects updated. Continue editing or download the current image.",
            );
          } catch (e) {
            if (stale) return;
            setEffectsPending(false);
            setCurrent(effectBase);
            setEffectBase(null);
            setAdjust(adjustments);
            setError(true);
            setStatus(e.message);
          }
        });
    }, 80);
    return () => {
      stale = true;
      clearTimeout(timer);
      abort.abort();
    };
  }, [adjust, effectBase]);
  function changeEffects(patch) {
    if (!current || busy || lock.current) return;
    setDocumentExport(null);
    if (!effectBase) {
      setEffectBase(current);
      setHistory((h) => remember(h, current));
    }
    setFuture([]);
    setAdjust((a) => ({ ...a, ...patch }));
    setEffectsPending(true);

    setError(false);
    setStatus("Updating effects…");
  }
  function clearEffects() {
    setEffectBase(null);
    setEffectsPending(false);
    setAdjust(adjustments);
  }
  const working = busy || effectsPending || exportPending;
  const update = (id, patch) =>
    setSettings((s) => {
      const next = {
        ...s[id],
        ...(id === "resize-image" ? resizeUnitPatch(s[id], patch) : patch),
      };
      if (
        id === "crop-image" &&
        ["ratio", "rotation", "zoom"].some((key) => key in patch) &&
        dimensions
      ) {
        const [w, h] = dimensions.split(" × ").map(parseFloat);
        const rotated = +next.rotation % 180 !== 0;
        const rect = cropBox(
          rotated ? h : w,
          rotated ? w : h,
          next.ratio,
          +next.zoom || 100,
        );
        for (const [key, value] of Object.entries(rect))
          next[`crop-${key}`] = String(value);
      }
      return { ...s, [id]: next };
    });
  function resetCrop() {
    update("crop-image", {
      ...defaults("crop-image"),
      format: "image/png",
      "image-zoom": "100",
      "image-pan-x": "0",
      "image-pan-y": "0",
    });
  }
  function remember(list, image) {
    const next = [...list, image].slice(-10);
    while (
      next.length &&
      next.reduce((n, item) => n + item.size, 0) > 100 * 1048576
    )
      next.shift();
    return next;
  }
  async function upload(file, extra = false) {
    if (!file || lock.current || effectsPending) return;
    lock.current = true;
    controller.current = null;
    setBusy(true);
    setError(false);
    try {
      const selected = extra ? Array.from(file) : [file];
      if (extra && selected.length > 5)
        throw Error(
          "Choose at most five additional images (six images in total).",
        );
      validateFiles(selected, [], { pdf: false, multi: extra });
      await inspectFiles(selected, false);
      const normalized = await Promise.all(
        selected.map((image) => normalizeImageFile(image)),
      );
      if (!alive.current) return;
      setDocumentExport(null);
      if (extra) setSecond(normalized);
      else {
        setOriginal(normalized[0]);
        setCurrent(normalized[0]);
        setFilename("");
        setOutputFormat("keep");
        setSettingsOpen(true);
        setHistory([]);
        setFuture([]);
        setSecond(null);
        setSettings(initialSettings());
        clearEffects();
      }
      setStatus(
        extra
          ? `${normalized.length} additional ${normalized.length === 1 ? "image" : "images"} ready to join.`
          : "Ready to edit. Start with crop, colors or size; changes stay on this page.",
      );
    } catch (e) {
      if (alive.current) {
        setError(true);
        setStatus(e.message);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function apply(id) {
    if (!current || lock.current || effectsPending || exportPending) return;
    lock.current = true;
    setBusy(true);
    setError(false);

    setStatus("Applying edit…");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const options = { ...exportOptions.current.get(current) };
      if (["resize-image", "exam-photo", "passport-sheet"].includes(id))
        options.dpi = Number(settings[id].dpi);
      if (["resize-image", "name-date"].includes(id)) {
        const value = settings[id].maxKB;
        if (
          value !== "" &&
          value != null &&
          (!Number.isFinite(Number(value)) ||
            Number(value) < 1 ||
            Number(value) > 25000)
        )
          throw Error(
            "Enter a Max size between 1 and 25,000 KB, or leave it blank.",
          );
        options.maxKB = value ? Number(value) : null;
        options.preserveDimensions = id === "resize-image";
      } else if (["compress-image", "exam-photo"].includes(id)) {
        options.maxKB = Number(settings[id].target);
        options.preserveDimensions = id === "exam-photo";
      }
      const result = await processImage(
        id,
        id === "join-images" ? [current, ...(second || [])] : [current],
        {
          ...settings[id],
          // Enforce optional limits on the final selected format, not the
          // lossless intermediate used for further edits.
          ...(["resize-image", "name-date"].includes(id) ? { maxKB: "" } : {}),
          ...(["name-date", "passport-sheet"].includes(id)
            ? { format: "image/png" }
            : {}),
        },
        false,
        abort.signal,
      );
      if (!alive.current) return;
      throwIfCancelled(abort.signal);
      if (result.size > 100 * 1048576)
        throw Error("Result exceeds 100 MB. Try smaller dimensions.");
      if (result.type === "application/pdf") {
        setDocumentExport(result);
        setStatus(
          "Your A4 PDF is ready to download. The current image remains available for further edits.",
        );
        return;
      }
      setDocumentExport(null);
      exportOptions.current.set(result, options);
      setHistory((h) => remember(h, current));
      setFuture([]);
      setCurrent(result);
      if (
        [
          "compress-image",
          "convert-image",
          "exam-photo",
          "join-images",
        ].includes(id)
      )
        setOutputFormat(result.type);
      resetCrop();
      clearEffects();
      setStatus(
        result.warnings?.join(" ") ||
          "Edit applied. Continue editing or download the current image.",
      );
    } catch (e) {
      if (alive.current) {
        setError(e.name !== "AbortError");
        setStatus(
          e.name === "AbortError"
            ? "Edit cancelled. Your image is unchanged."
            : e.message,
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function travel(undo) {
    const stack = undo ? history : future;
    if (working || !stack.length) return;
    setDocumentExport(null);
    (undo ? setFuture : setHistory)((h) => remember(h, current));
    setCurrent(stack[stack.length - 1]);
    (undo ? setHistory : setFuture)(stack.slice(0, -1));
    resetCrop();
    clearEffects();

    setStatus(undo ? "Last edit undone." : "Edit restored.");
  }
  const extension =
    downloadBlob?.type === "application/pdf"
      ? "pdf"
      : downloadBlob?.type === "image/png"
        ? "png"
        : downloadBlob?.type === "image/webp"
          ? "webp"
          : "jpg";
  const renderEffects = (keys) =>
    Object.entries(adjust)
      .filter(([key, v]) => keys.includes(key) && typeof v === "number")
      .map(([key, value]) => (
        <label className="studio-field" key={key}>
          <span>
            {key[0].toUpperCase() + key.slice(1)}: {value}
            {key === "blur" ? " px" : "%"}
          </span>
          <input
            aria-label={key}
            type="range"
            min="0"
            max={
              key === "blur"
                ? 10
                : ["grayscale", "sepia"].includes(key)
                  ? 100
                  : 200
            }
            value={value}
            onChange={(e) => changeEffects({ [key]: +e.target.value })}
          />
        </label>
      ));
  const renderOperation = (id) => (
    <Card
      as="fieldset"
      className={`studio-card studio-${id}`}
      key={id}
      disabled={working || !current}
    >
      <legend>{tools.find((t) => t[0] === id)[1]}</legend>
      {id === "crop-image" && current && (
        <div
          className="studio-crop"
          style={
            effectsPending
              ? {
                  "--effect-filter": `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%) grayscale(${adjust.grayscale}%) sepia(${adjust.sepia}%) blur(${adjust.blur}px)`,
                  "--effect-transform": `scale(${adjust.flipX ? -1 : 1}, ${adjust.flipY ? -1 : 1})`,
                }
              : undefined
          }
        >
          <ImageManipulator
            previewZoom
            file={effectsPending ? effectBase : current}
            kind={id}
            values={settings[id]}
            onValues={(patch) => update(id, patch)}
            busy={working}
          />
        </div>
      )}
      <Controls
        id={id}
        values={settings[id]}
        update={(patch) => update(id, patch)}
      />
      {["crop-image", "resize-image"].includes(id) && (
        <details className="studio-advanced">
          <summary>Advanced settings</summary>
          <Controls
            id={id}
            values={settings[id]}
            update={(patch) => update(id, patch)}
            advanced
          />
        </details>
      )}
      {id === "join-images" && (
        <label className="studio-field">
          Images 2–6
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            onChange={(e) => {
              upload(Array.from(e.target.files), true);
              e.target.value = "";
            }}
          />
          <span>
            {second?.map((file) => file.name).join(", ") ||
              "Choose up to five more images."}
          </span>
        </label>
      )}
      {current &&
        settingsOpen &&
        (id === "resize-image" || moreOpen) &&
        ["resize-image", "exam-photo", "passport-sheet"].includes(id) && (
          <ImageEditor
            compact
            files={previewFiles}
            id={id}
            values={settings[id]}
            busy={working}
          />
        )}
      {notes[id] && <p>{notes[id]}</p>}
      <Button
        variant="primary"
        disabled={
          working || !current || (id === "join-images" && !second?.length)
        }
        onClick={() => apply(id)}
      >
        Apply {tools.find((t) => t[0] === id)[1].toLowerCase()}
      </Button>
    </Card>
  );
  return (
    <ToolLayout className="workspace tool-workspace image-studio">
      <div className="tool-heading">
        <Button as={Link} href="/" className="back">
          <Icon name="grid2x2" />
          All tools
        </Button>
        <h1>{heading}</h1>
        <p>
          Upload a photo, make your changes, and download. You can undo any
          edit.
        </p>
        <TrustBadges toolId="image-editor" />
      </div>
      <ol className="studio-steps workflow-steps" aria-label="Editing steps">
        <li aria-current={!current ? "step" : undefined}>1. Upload a photo</li>
        <li aria-current={current ? "step" : undefined}>2. Edit your photo</li>
        <li>3. Download</li>
      </ol>
      <Dropzone
        id="studio-upload"
        inputRef={uploadInput}
        hidden={Boolean(current)}
        disabled={working}
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        title="Choose an image or drop it here"
        hint="JPG, PNG, WebP or HEIC · up to 25 MB per image"
        buttonLabel="Choose image"
        onFiles={(files) => upload(files[0])}
      />
      {current && (
        <>
          <div className="ui-control-group studio-edit-toolbar">
            <Button
              disabled={working}
              onClick={() => uploadInput.current?.click()}
            >
              Replace image
            </Button>
            <>
              <Button
                disabled={working || !history.length}
                onClick={() => travel(true)}
              >
                Undo
              </Button>
              <Button
                disabled={working || !future.length}
                onClick={() => travel(false)}
              >
                Redo
              </Button>
              <Button
                disabled={working || !original}
                onClick={() => {
                  setDocumentExport(null);
                  setHistory((h) => remember(h, current));
                  setFuture([]);
                  setCurrent(original);
                  setSettings(initialSettings());
                  clearEffects();

                  setStatus("Original image restored.");
                }}
              >
                Reset image
              </Button>
              <label className="studio-filename">
                <span>Output format</span>
                <select
                  aria-label="Output format"
                  value={documentExport ? "application/pdf" : outputFormat}
                  disabled={working}
                  onChange={(event) => {
                    setDocumentExport(null);
                    setOutputFormat(event.target.value);
                  }}
                >
                  {documentExport && (
                    <option value="application/pdf">A4 PDF</option>
                  )}
                  <option value="keep">Keep original</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </label>
              <label className="studio-filename">
                <span>File name</span>
                <input
                  aria-label="Download filename"
                  value={filename}
                  maxLength={120}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </label>
            </>
          </div>
        </>
      )}
      <p
        className={error ? "studio-status studio-error" : "studio-status"}
        role={error ? "alert" : "status"}
      >
        {status}
      </p>
      {current && (
        <p className="studio-file-info">
          {original?.name} · {documentExport ? "1 A4 page" : dimensions} ·{" "}
          {size((downloadBlob || current).size)} · {extension.toUpperCase()}
        </p>
      )}
      {current && (
        <details
          className="studio-layout tool-settings-details"
          open={settingsOpen}
          onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
        >
          <summary>
            Settings
            <span className="tool-settings-summary">
              Crop:{" "}
              {fields("crop-image")
                .find((field) => field.id === "ratio")
                .options.find(
                  ([value]) => value === settings["crop-image"].ratio,
                )?.[1] || "Custom"}
              {" · "}Resize: {settings["resize-image"].width} ×{" "}
              {settings["resize-image"].height} {settings["resize-image"].unit}
            </span>
          </summary>
          <section
            className="studio-controls"
            aria-label="All image editing controls"
          >
            {renderOperation("crop-image")}
            <div className="studio-sidebar">
              <Card
                as="fieldset"
                className="studio-card studio-effects"
                disabled={busy || !current}
              >
                <legend>Color & effects</legend>
                {renderEffects(["brightness", "contrast", "saturation"])}
                <details className="studio-advanced">
                  <summary>More effects</summary>
                  {renderEffects(["grayscale", "sepia", "blur"])}
                </details>
                <div className="studio-options">
                  <Button
                    type="button"
                    aria-pressed={adjust.flipX}
                    onClick={() => changeEffects({ flipX: !adjust.flipX })}
                  >
                    Flip horizontal
                  </Button>
                  <Button
                    type="button"
                    aria-pressed={adjust.flipY}
                    onClick={() => changeEffects({ flipY: !adjust.flipY })}
                  >
                    Flip vertical
                  </Button>
                </div>
                <p>Effects update automatically as you adjust the controls.</p>
                <Button onClick={() => changeEffects(adjustments)}>
                  Reset effects
                </Button>
              </Card>
              {renderOperation("resize-image")}
            </div>
            <details
              className="studio-more"
              onToggle={(event) => setMoreOpen(event.currentTarget.open)}
            >
              <summary>
                More tools{" "}
                <span>
                  Compress, convert, backgrounds, text & photo layouts
                </span>
              </summary>
              <div className="studio-extra-grid">
                {operations.slice(2).map(renderOperation)}
              </div>
            </details>
            <p className="studio-note">
              JPG output and several photo-layout operations use a white
              background for transparent areas. For best quality, resize and
              compress near the end.
            </p>
          </section>
        </details>
      )}
      {current && (
        <ActionBar>
          <p className="output-summary">
            {working
              ? "Applying your changes…"
              : `${extension.toUpperCase()} ready · ${size((downloadBlob || current).size)}`}
          </p>
          {busy && controller.current && (
            <Button onClick={() => controller.current?.abort()}>
              Cancel edit
            </Button>
          )}
          {downloadUrl && !working && (
            <Button
              as="a"
              variant="primary"
              className="studio-download"
              href={downloadUrl}
              download={downloadName(
                filename,
                `${(original?.name || "image").replace(/\.[^.]+$/, "")}_${documentExport ? "joined" : "edited"}.${extension}`,
              )}
            >
              Download {extension.toUpperCase()} – free
            </Button>
          )}
        </ActionBar>
      )}
      <ToolGuide id="image-editor" />
    </ToolLayout>
  );
}
