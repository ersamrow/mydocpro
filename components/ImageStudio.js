import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ImageManipulator from "./ImageManipulator.js";
import { tools } from "../src/tools.js";
import { defaults, fields, size, validateFiles } from "../src/tool-settings.js";
import { inspectFiles, throwIfCancelled } from "../src/file-validation.js";
import { processImage, adjustImage } from "../src/processing.js";
import { downloadName } from "../src/download-name.js";
import { cropBox } from "../src/image-geometry.js";

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
    "Whitens light pixels. Best for plain backgrounds; this is not AI background removal.",
  signature: "Darkens signature strokes and whitens light paper.",
  "exam-photo": "Generic sizes. Check the receiving form’s requirements.",
  "passport-sheet":
    "4 × 6 inch sheet at 300 DPI. Eight copies use smaller photo areas.",
  "name-date": "Adds a white text strip below the image.",
};

function Controls({ id, values, update, advanced = false }) {
  return fields(id)
    .filter((f) => f.id !== "output-name")
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
      const inputId = `studio-${id}-${key}`;
      if (options)
        return (
          <fieldset className="studio-options" key={key}>
            <legend>{label}</legend>
            <div>
              {options.map(([v, name]) => (
                <button
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
                </button>
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

export default function ImageStudio() {
  const [original, setOriginal] = useState(null),
    [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]),
    [future, setFuture] = useState([]);
  const [settings, setSettings] = useState(initialSettings),
    [adjust, setAdjust] = useState(adjustments);
  const [effectBase, setEffectBase] = useState(null),
    [effectsPending, setEffectsPending] = useState(false);
  const effectQueue = useRef(Promise.resolve());
  const [second, setSecond] = useState(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Upload an image to start editing."),
    [error, setError] = useState(false);
  const [url, setUrl] = useState(""),
    [filename, setFilename] = useState("edited-image"),
    [dimensions, setDimensions] = useState("");
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
    if (!current || busy) return;
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
  const working = busy || effectsPending;
  const update = (id, patch) =>
    setSettings((s) => {
      const next = { ...s[id], ...patch };
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
      validateFiles([file], [], { pdf: false, multi: false });
      await inspectFiles([file], false);
      if (!alive.current) return;
      if (extra) setSecond(file);
      else {
        setOriginal(file);
        setCurrent(file);
        setHistory([]);
        setFuture([]);
        setSecond(null);
        setSettings(initialSettings());
        clearEffects();
      }
      setStatus(
        extra
          ? "Second image ready to join."
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
    if (!current || lock.current || effectsPending) return;
    lock.current = true;
    setBusy(true);
    setError(false);

    setStatus("Applying edit…");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await processImage(
        id,
        id === "join-images" ? [current, second].filter(Boolean) : [current],
        {
          ...settings[id],
          ...(["name-date", "join-images", "passport-sheet"].includes(id)
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
      setHistory((h) => remember(h, current));
      setFuture([]);
      setCurrent(result);
      resetCrop();
      clearEffects();
      setStatus(
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
    (undo ? setFuture : setHistory)((h) => remember(h, current));
    setCurrent(stack[stack.length - 1]);
    (undo ? setHistory : setFuture)(stack.slice(0, -1));
    resetCrop();
    clearEffects();

    setStatus(undo ? "Last edit undone." : "Edit restored.");
  }
  const extension =
    current?.type === "image/png"
      ? "png"
      : current?.type === "image/webp"
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
    <fieldset
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
          Second image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              upload(e.target.files[0], true);
              e.target.value = "";
            }}
          />
          <span>{second?.name || "Choose a signature or another photo."}</span>
        </label>
      )}
      {notes[id] && <p>{notes[id]}</p>}
      <button
        className="primary"
        disabled={id === "join-images" && !second}
        onClick={() => apply(id)}
      >
        Apply {tools.find((t) => t[0] === id)[1].toLowerCase()}
      </button>
    </fieldset>
  );
  return (
    <main className="workspace image-studio">
      <div className="tool-heading">
        <Link href="/" className="back">
          ← All tools
        </Link>
        <h1>Image Editor</h1>
        <p>
          Upload a photo, make your changes, and download. You can undo any
          edit.
        </p>
      </div>
      <ol className="studio-steps" aria-label="Editing steps">
        <li aria-current={!current ? "step" : undefined}>1. Upload a photo</li>
        <li aria-current={current ? "step" : undefined}>2. Edit your photo</li>
        <li>3. Download</li>
      </ol>
      <div className="studio-toolbar">
        <label className="studio-upload">
          {current ? "Replace image" : "Upload image"}
          <input
            id="studio-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={working}
            onChange={(e) => {
              upload(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
        {current && (
          <>
            <button
              disabled={working || !history.length}
              onClick={() => travel(true)}
            >
              Undo
            </button>
            <button
              disabled={working || !future.length}
              onClick={() => travel(false)}
            >
              Redo
            </button>
            <button
              disabled={working || !original}
              onClick={() => {
                setHistory((h) => remember(h, current));
                setFuture([]);
                setCurrent(original);
                setSettings(initialSettings());
                clearEffects();

                setStatus("Original image restored.");
              }}
            >
              Reset image
            </button>
            {busy && controller.current && (
              <button onClick={() => controller.current?.abort()}>
                Cancel edit
              </button>
            )}
            <details className="studio-save-options">
              <summary>File name</summary>
              <label className="studio-filename">
                Filename
                <input
                  aria-label="Download filename"
                  value={filename}
                  maxLength={120}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </label>
            </details>
          </>
        )}
        {current && !working && (
          <a
            className="primary studio-download"
            href={url}
            download={downloadName(filename, `edited-image.${extension}`)}
          >
            Download {extension.toUpperCase()}
          </a>
        )}
      </div>
      <p
        className={error ? "studio-status studio-error" : "studio-status"}
        role={error ? "alert" : "status"}
      >
        {status}
      </p>
      {!current && (
        <div
          className="studio-empty"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files[0]);
          }}
        >
          <strong>Drop an image here</strong>
          <p>JPG, PNG or WebP · up to 25 MB</p>
        </div>
      )}
      {current && (
        <p className="studio-file-info">
          {original?.name} · {dimensions} · {size(current.size)} ·{" "}
          {extension.toUpperCase()}
        </p>
      )}
      {current && (
        <div className="studio-layout">
          <section
            className="studio-controls"
            aria-label="All image editing controls"
          >
            {renderOperation("crop-image")}
            <div className="studio-sidebar">
              <fieldset
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
                  <button
                    type="button"
                    aria-pressed={adjust.flipX}
                    onClick={() => changeEffects({ flipX: !adjust.flipX })}
                  >
                    Flip horizontal
                  </button>
                  <button
                    type="button"
                    aria-pressed={adjust.flipY}
                    onClick={() => changeEffects({ flipY: !adjust.flipY })}
                  >
                    Flip vertical
                  </button>
                </div>
                <p>Effects update automatically as you adjust the controls.</p>
                <button onClick={() => changeEffects(adjustments)}>
                  Reset effects
                </button>
              </fieldset>
              {renderOperation("resize-image")}
            </div>
            <details className="studio-more">
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
        </div>
      )}
    </main>
  );
}
