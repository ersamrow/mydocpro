import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, ToolLayout, ActionBar } from "./ui.js";
import TrustBadges from "./TrustBadges.js";
import Dropzone from "./Dropzone.js";
import ToolGuide from "./ToolGuide.js";
import { Icon } from "./Shared.js";
import { useObjectUrl } from "./useObjectUrl.js";
import { isBackdropClick, useDialogFocus } from "./dialog.js";
import { pdfRenderer } from "../src/processing.js";
import { inspectFiles } from "../src/file-validation.js";
import { validateFiles, size } from "../src/tool-settings.js";
import { downloadName } from "../src/download-name.js";
import {
  exportSignedPdf,
  keyOutPaper,
  todayLabel,
  TEXT_LINE,
} from "../src/pdf-sign.js";

const INK = "#0c195a";
let nextId = 1;
const newId = () => `item-${nextId++}`;

function trimmedPng(canvas) {
  const context = canvas.getContext("2d"),
    { width, height } = canvas,
    data = context.getImageData(0, 0, width, height).data;
  let left = width,
    right = -1,
    top = height,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  if (right < 0) return null;
  const pad = 6,
    sx = Math.max(0, left - pad),
    sy = Math.max(0, top - pad),
    w = Math.min(width - sx, right - left + 1 + pad * 2),
    h = Math.min(height - sy, bottom - top + 1 + pad * 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d").drawImage(canvas, sx, sy, w, h, 0, 0, w, h);
  return { png: out.toDataURL("image/png"), ratio: w / h };
}

function SignatureDialog({ onSave, onClose }) {
  const dialog = useRef(null),
    pad = useRef(null),
    drawing = useRef(null);
  const [tab, setTab] = useState("draw"),
    [typed, setTyped] = useState(""),
    [style, setStyle] = useState("cursive"),
    [uploaded, setUploaded] = useState(null),
    [error, setError] = useState("");
  useDialogFocus(dialog);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const point = (event) => {
    const rect = pad.current.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * pad.current.width,
      ((event.clientY - rect.top) / rect.height) * pad.current.height,
    ];
  };
  function start(event) {
    event.preventDefault();
    pad.current.setPointerCapture(event.pointerId);
    const [x, y] = point(event),
      context = pad.current.getContext("2d");
    context.strokeStyle = INK;
    context.lineWidth = 5;
    context.lineCap = context.lineJoin = "round";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 0.1, y + 0.1);
    context.stroke();
    drawing.current = [x, y];
  }
  function move(event) {
    if (!drawing.current) return;
    const [x, y] = point(event),
      context = pad.current.getContext("2d");
    context.beginPath();
    context.moveTo(...drawing.current);
    context.lineTo(x, y);
    context.stroke();
    drawing.current = [x, y];
  }
  const fonts = {
    cursive: '"Segoe Script","Brush Script MT","Snell Roundhand",cursive',
    formal: '"Lucida Handwriting","Apple Chancery","Zapfino",cursive',
    plain: 'italic 400 "Georgia",serif',
  };
  async function save() {
    setError("");
    let result = null;
    if (tab === "draw") result = trimmedPng(pad.current);
    else if (tab === "type") {
      if (!typed.trim()) return setError("Type your name first.");
      const c = document.createElement("canvas"),
        x = c.getContext("2d");
      c.width = 1200;
      c.height = 360;
      x.fillStyle = INK;
      x.textBaseline = "middle";
      let px = 200;
      do {
        x.font = `${px}px ${fonts[style]}`;
        px -= 8;
      } while (x.measureText(typed).width > 1120 && px > 40);
      x.fillText(typed.trim(), 40, 190);
      result = trimmedPng(c);
    } else if (tab === "upload") {
      if (!uploaded) return setError("Choose a signature photo first.");
      result = uploaded;
    }
    if (!result)
      return setError(
        tab === "draw"
          ? "Draw your signature in the box first."
          : "Nothing to save yet.",
      );
    onSave(result);
  }
  async function chooseFile(file) {
    setError("");
    setUploaded(null);
    if (!file) return;
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type))
        throw Error("Choose a JPG, PNG or WebP photo of your signature.");
      if (file.size > 10 * 1048576) throw Error("Please use a photo under 10 MB.");
      const bitmap = await createImageBitmap(file),
        scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)),
        c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bitmap.width * scale));
      c.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = c.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, c.width, c.height);
      const pixels = context.getImageData(0, 0, c.width, c.height);
      keyOutPaper(pixels.data);
      context.putImageData(pixels, 0, 0);
      const result = trimmedPng(c);
      if (!result)
        throw Error("No dark ink was found. Use a clear photo on white paper.");
      setUploaded(result);
    } catch (e) {
      setError(e.message || "That image could not be read.");
    }
  }
  const clear = () =>
    pad.current
      ?.getContext("2d")
      .clearRect(0, 0, pad.current.width, pad.current.height);
  return (
    <dialog
      ref={dialog}
      className="sp-dialog"
      aria-labelledby="sp-sig-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => isBackdropClick(e) && onClose()}
    >
      <h2 id="sp-sig-title">Create your signature</h2>
      <div className="sp-tabs" role="tablist">
        {[
          ["draw", "Draw"],
          ["type", "Type"],
          ["upload", "Upload photo"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "draw" && (
        <div>
          <canvas
            ref={pad}
            className="sp-pad"
            width="900"
            height="300"
            aria-label="Signature drawing area"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={() => (drawing.current = null)}
            onPointerCancel={() => (drawing.current = null)}
          />
          <Button onClick={clear}>Clear</Button>
        </div>
      )}
      {tab === "type" && (
        <div className="sp-type">
          <label>
            Your name
            <input
              value={typed}
              maxLength={40}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your name"
            />
          </label>
          <div className="sp-styles">
            {Object.keys(fonts).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={style === key}
                style={{ font: `28px ${fonts[key]}`, color: INK }}
                onClick={() => setStyle(key)}
              >
                {typed.trim() || "Signature"}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "upload" && (
        <div className="sp-upload">
          <p>
            Photograph your signature in dark ink on white paper. The paper
            becomes transparent.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Choose a signature photo"
            onChange={(e) => chooseFile(e.target.files[0])}
          />
          {uploaded && (
            <img className="sp-preview" src={uploaded.png} alt="Signature preview" />
          )}
        </div>
      )}
      <p className="sp-error" role="alert">
        {error}
      </p>
      <div className="sp-dialog-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          Use this signature
        </Button>
      </div>
    </dialog>
  );
}

function PageView({
  doc,
  number,
  meta,
  items,
  selected,
  armed,
  onPlace,
  onSelect,
  onChange,
  onRemove,
}) {
  const box = useRef(null),
    canvas = useRef(null);
  const [scale, setScale] = useState(1),
    [visible, setVisible] = useState(number < 2);
  const [W, H] = meta;
  useEffect(() => {
    const element = box.current;
    const observer = new ResizeObserver(() =>
      setScale(element.getBoundingClientRect().width / W),
    );
    observer.observe(element);
    const view = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "400px" },
    );
    view.observe(element);
    return () => {
      observer.disconnect();
      view.disconnect();
    };
  }, [W]);
  useEffect(() => {
    if (!visible || !scale) return;
    let task,
      stale = false;
    (async () => {
      const page = await doc.getPage(number);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: scale * ratio });
      const c = canvas.current;
      if (stale || !c || viewport.width * viewport.height > 25000000) return;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      task = page.render({
        canvasContext: c.getContext("2d"),
        viewport,
        canvas: c,
      });
      await task.promise.catch(() => {});
    })();
    return () => {
      stale = true;
      task?.cancel();
    };
  }, [doc, number, visible, Math.round(scale * 20)]);
  const drag = useRef(null);
  function begin(event, item, mode) {
    event.stopPropagation();
    onSelect(item.id);
    drag.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      item: { ...item },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event, item) {
    const d = drag.current;
    if (!d) return;
    const dx = (event.clientX - d.x) / scale,
      dy = (event.clientY - d.y) / scale;
    if (d.mode === "move")
      onChange(item.id, {
        x: Math.min(W - 8, Math.max(8 - (d.item.w ?? 24), d.item.x + dx)),
        y: Math.min(H - 8, Math.max(-8, d.item.y + dy)),
      });
    else if (item.type === "text")
      onChange(item.id, {
        size: Math.min(72, Math.max(6, d.item.size + dy * 0.6)),
      });
    else {
      const ratio = d.item.w / d.item.h,
        w = Math.min(W, Math.max(16, d.item.w + dx));
      onChange(item.id, { w, h: w / ratio });
    }
  }
  const place = (event) => {
    if (!armed || event.target !== event.currentTarget) {
      if (event.target === event.currentTarget) onSelect(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    onPlace(
      number - 1,
      (event.clientX - rect.left) / scale,
      (event.clientY - rect.top) / scale,
    );
  };
  return (
    <div
      ref={box}
      className={`sp-page${armed ? " sp-armed" : ""}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-page={number}
    >
      <canvas ref={canvas} className="sp-canvas" aria-label={`Page ${number}`} />
      <div
        className="sp-layer"
        onClick={place}
        role="group"
        aria-label={`Items on page ${number}`}
      >
        {items.map((item) => {
          const h = item.type === "text" ? item.size * TEXT_LINE : item.h;
          const style = {
            left: `${(item.x / W) * 100}%`,
            top: `${(item.y / H) * 100}%`,
          };
          if (item.type !== "text") {
            style.width = `${(item.w / W) * 100}%`;
            style.height = `${(h / H) * 100}%`;
          }
          return (
            <div
              key={item.id}
              className={`sp-item sp-${item.type}${selected === item.id ? " sp-selected" : ""}`}
              style={style}
              onPointerDown={(e) =>
                item.type === "text" ? e.stopPropagation() : begin(e, item, "move")
              }
              onPointerMove={(e) => move(e, item)}
              onPointerUp={() => (drag.current = null)}
              onFocus={() => onSelect(item.id)}
            >
              {item.type === "text" && (
                <>
                  <span
                    className="sp-grip"
                    title="Drag to move"
                    onPointerDown={(e) => begin(e, item, "move")}
                    onPointerMove={(e) => move(e, item)}
                    onPointerUp={() => (drag.current = null)}
                  />
                  <input
                    value={item.text}
                    autoFocus={item.fresh}
                    aria-label="Text on page"
                    placeholder="Type here"
                    maxLength={200}
                    style={{
                      fontSize: item.size * scale,
                      width: `${Math.max(10, item.text.length + 1)}ch`,
                    }}
                    onChange={(e) => onChange(item.id, { text: e.target.value })}
                  />
                </>
              )}
              {item.type === "check" && (
                <svg viewBox="0 0 100 100" aria-label="Check mark" role="img">
                  <polyline
                    points="15,55 40,82 88,18"
                    fill="none"
                    stroke={INK}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {item.type === "signature" && (
                <img src={item.png} alt="Signature" draggable="false" />
              )}
              {selected === item.id && (
                <>
                  <button
                    type="button"
                    className="sp-remove"
                    aria-label="Remove this item"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                  <span
                    className="sp-resize"
                    aria-hidden="true"
                    onPointerDown={(e) => begin(e, item, "resize")}
                    onPointerMove={(e) => move(e, item)}
                    onPointerUp={() => (drag.current = null)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SignPdf({ heading }) {
  const [file, setFile] = useState(null),
    [doc, setDoc] = useState(null),
    [metas, setMetas] = useState([]);
  const [items, setItems] = useState([]),
    [selected, setSelected] = useState(null),
    [armed, setArmed] = useState(null);
  const [signatures, setSignatures] = useState([]),
    [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Choose a PDF to start."),
    [error, setError] = useState(false);
  const [blob, setBlob] = useState(null),
    url = useObjectUrl(blob);
  const alive = useRef(true),
    controller = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => () => void doc?.destroy(), [doc]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setArmed(null);
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(
        document.activeElement?.tagName,
      );
      if (typing || !selected) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        remove(selected);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  const report = (message, isError = false) => {
    setStatus(message);
    setError(isError);
  };
  async function load(files) {
    try {
      const [next] = validateFiles(files, [], { pdf: true });
      await inspectFiles([next], true);
      const loaded = await pdfRenderer(next);
      const sizes = [];
      for (let n = 1; n <= loaded.numPages; n++) {
        const viewport = (await loaded.getPage(n)).getViewport({ scale: 1 });
        sizes.push([viewport.width, viewport.height]);
      }
      if (!alive.current) return loaded.destroy();
      setFile(next);
      setDoc(loaded);
      setMetas(sizes);
      setItems([]);
      setSelected(null);
      setArmed(null);
      setBlob(null);
      report(
        `${next.name} loaded (${loaded.numPages} ${loaded.numPages === 1 ? "page" : "pages"}). Choose a tool, then click the page.`,
      );
    } catch (e) {
      report(e.message, true);
    }
  }
  const touch = (updater) => {
    setBlob(null);
    setItems(updater);
  };
  const update = useCallback(
    (id, patch) =>
      touch((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [],
  );
  function remove(id) {
    touch((all) => all.filter((i) => i.id !== id));
    setSelected(null);
  }
  function arm(spec) {
    setSelected(null);
    setArmed(spec);
    report(
      spec
        ? `Click the page where the ${spec.label} should go. Press Esc to cancel.`
        : status,
    );
  }
  function place(pageIndex, x, y) {
    if (!armed) return;
    const [W, H] = metas[pageIndex];
    const id = newId();
    let item;
    if (armed.type === "signature") {
      const w = Math.min(W * 0.4, 170),
        h = w / armed.ratio;
      item = { type: "signature", png: armed.png, w, h };
    } else if (armed.type === "check") item = { type: "check", w: 18, h: 18 };
    else {
      const text = armed.text ?? "";
      item = { type: "text", size: 12, text, fresh: !text };
    }
    const bw = item.w ?? 0,
      bh = item.type === "text" ? item.size * TEXT_LINE : item.h;
    item = {
      ...item,
      id,
      page: pageIndex,
      x: Math.min(Math.max(0, x - bw / 2), W - Math.max(bw, 24)),
      y: Math.min(Math.max(0, y - bh / 2), H - bh),
    };
    touch((all) => all.concat(item));
    setSelected(id);
    if (armed.type !== "check") setArmed(null);
    report(
      armed.type === "check"
        ? "Check mark added. Click to add more, or press Esc to stop."
        : "Added. Drag to move, use the corner to resize, or add another item.",
    );
  }
  async function create() {
    setBusy(true);
    controller.current?.abort();
    const mine = (controller.current = new AbortController());
    try {
      const out = await exportSignedPdf(file, items, mine.signal);
      if (!alive.current || mine.signal.aborted) return;
      setBlob(out);
      report("Your signed PDF is ready. Download it and check every page.");
    } catch (e) {
      if (e.name !== "AbortError") report(e.message, true);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const counts = useMemo(
    () => ({
      signature: items.filter((i) => i.type === "signature").length,
      total: items.length,
    }),
    [items],
  );
  const outName = file
    ? downloadName("", `${file.name.replace(/\.pdf$/i, "")}-signed.pdf`)
    : "signed.pdf";
  const canvasReady = Boolean(doc);
  return (
    <ToolLayout className="workspace tool-workspace sign-pdf">
      <div className="tool-heading">
        <Button as={Link} className="back" href="/">
          <Icon name="grid2x2" />
          All tools
        </Button>
        <h1>{heading}</h1>
        <p className="intro">
          Add your signature, text, today’s date or check marks to a PDF, right
          in your browser. Your document is never uploaded.
        </p>
        <TrustBadges toolId="sign-pdf" />
      </div>
      <Card className="sp-start">
        <h2>1. Choose your PDF</h2>
        <Dropzone
          accept="application/pdf,.pdf"
          onFiles={load}
          title={file ? `Replace ${file.name}` : "Choose a PDF or drop it here"}
          buttonLabel="Choose a PDF"
          hint="Up to 100 MB and 300 pages. Password-protected PDFs must be unlocked first."
        />
      </Card>
      {canvasReady && (
        <>
          <Card className="sp-toolbar" aria-label="Signing tools">
            <h2>2. Add to the page</h2>
            <div className="sp-tools">
              {signatures.map((s, index) => (
                <Button
                  key={index}
                  aria-pressed={armed?.png === s.png}
                  onClick={() =>
                    arm({
                      type: "signature",
                      png: s.png,
                      ratio: s.ratio,
                      label: "signature",
                    })
                  }
                >
                  <img className="sp-chip" src={s.png} alt="" />
                  Place signature {signatures.length > 1 ? index + 1 : ""}
                </Button>
              ))}
              <Button variant="primary" onClick={() => setDialog(true)}>
                {signatures.length ? "New signature" : "Create signature"}
              </Button>
              <Button
                aria-pressed={armed?.type === "text" && armed.text === undefined}
                onClick={() => arm({ type: "text", label: "text" })}
              >
                Add text
              </Button>
              <Button
                aria-pressed={armed?.text === todayLabel()}
                onClick={() =>
                  arm({ type: "text", text: todayLabel(), label: "date" })
                }
              >
                Add today’s date
              </Button>
              <Button
                aria-pressed={armed?.type === "check"}
                onClick={() => arm({ type: "check", label: "check mark" })}
              >
                Add check mark
              </Button>
            </div>
            <p className={error ? "sp-status sp-error" : "sp-status"} role="status">
              {status}
            </p>
            <p className="sp-note">
              This places marks on the page. It does not fill interactive form
              fields, and it is not a certified digital signature.
            </p>
          </Card>
          <div className="sp-pages" aria-label="PDF pages">
            {metas.map((meta, index) => (
              <PageView
                key={`${file.name}-${index}`}
                doc={doc}
                number={index + 1}
                meta={meta}
                items={items.filter((i) => i.page === index)}
                selected={selected}
                armed={armed}
                onPlace={place}
                onSelect={setSelected}
                onChange={update}
                onRemove={remove}
              />
            ))}
          </div>
          <ActionBar>
            <span>
              {counts.total
                ? `${counts.total} ${counts.total === 1 ? "item" : "items"} placed`
                : "Nothing placed yet"}
            </span>
            {blob && url ? (
              <Button as="a" variant="primary" href={url} download={outName}>
                Download signed PDF ({size(blob.size)})
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={busy || !counts.total}
                onClick={create}
              >
                {busy ? "Creating…" : "Create signed PDF"}
              </Button>
            )}
          </ActionBar>
        </>
      )}
      {!canvasReady && (
        <p className={error ? "sp-status sp-error" : "sp-status"} role="status">
          {status}
        </p>
      )}
      {dialog && (
        <SignatureDialog
          onClose={() => setDialog(false)}
          onSave={(result) => {
            setSignatures((all) => all.concat(result).slice(-3));
            setDialog(false);
            arm({ type: "signature", ...result, label: "signature" });
          }}
        />
      )}
      <ToolGuide id="sign-pdf" />
    </ToolLayout>
  );
}
