import { useEffect, useRef, useState } from "react";
import { pdfRenderer, pageIndices } from "../src/processing.js";
import { BlobImage } from "./ImageEditor.js";
const colors = [
  "#1e6b52",
  "#3559a5",
  "#8d4a87",
  "#93651a",
  "#247884",
  "#a44839",
];
function Zoom({ entry, rotation, onClose }) {
  const dialog = useRef(null),
    canvas = useRef(null);
  const [message, setMessage] = useState("Loading page…");
  useEffect(() => {
    let dead = false,
      doc,
      task;
    dialog.current.showModal();
    (async () => {
      try {
        doc = await pdfRenderer(entry.file);
        if (dead) return;
        const page = await doc.getPage(entry.index + 1);
        if (dead) return;
        const angle = (page.rotate + Number(rotation || 0)) % 360,
          natural = page.getViewport({ scale: 1, rotation: angle }),
          viewport = page.getViewport({
            scale: Math.min(1600 / natural.width, 2200 / natural.height),
            rotation: angle,
          }),
          c = canvas.current;
        c.width = Math.ceil(viewport.width);
        c.height = Math.ceil(viewport.height);
        task = page.render({
          canvasContext: c.getContext("2d"),
          viewport,
          background: "#fff",
        });
        await task.promise;
        if (!dead) setMessage("");
      } catch {
        if (!dead)
          setMessage("Could not render this page. Close and try again.");
      } finally {
        await doc?.destroy();
      }
    })();
    return () => {
      dead = true;
      task?.cancel();
      void doc?.destroy();
    };
  }, [entry, rotation]);
  return (
    <dialog
      ref={dialog}
      className="page-zoom-dialog"
      aria-labelledby="page-zoom-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="zoom-heading">
        <h2 id="page-zoom-title">
          {entry.file.name} · Page {entry.index + 1}
        </h2>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="zoom-content" role="status">
        {message}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Page ${entry.index + 1} preview`}
          hidden={!!message}
        />
      </div>
    </dialog>
  );
}
function MoveDialog({ position, count, onMove, onClose }) {
  const ref = useRef(null),
    [value, setValue] = useState(position + 1);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="page-move-dialog"
      aria-label="Move page to position"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onMove(Number(value) - 1);
          onClose();
        }}
      >
        <h2>Move page</h2>
        <label>
          New position
          <input
            type="number"
            min="1"
            max={count}
            step="1"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Move
          </button>
        </div>
      </form>
    </dialog>
  );
}
export default function PdfEditor({
  files,
  id,
  values,
  onValues,
  busy,
  pdf,
  onPdf,
}) {
  const [history, setHistory] = useState([]),
    [zoom, setZoom] = useState(null),
    [moving, setMoving] = useState(null),
    [status, setStatus] = useState("");
  const dragged = useRef(null),
    skipSort = useRef(false),
    previousPages = useRef(values.pages);
  const split = ["split-pdf", "organize-pdf", "pdf-to-image"].includes(id),
    readOnly = id === "compress-pdf",
    entries = pdf.entries,
    disabled = busy || !pdf.ready || !!pdf.error;
  let indices = [];
  try {
    indices =
      split && values.pages.trim()
        ? pageIndices(values.pages, entries.length)
        : split
          ? []
          : entries.map((_, i) => i);
  } catch {}
  const selected = new Set(indices),
    rotation = id === "organize-pdf" ? Number(values.rotation) : 0;
  useEffect(() => {
    let disposed = false,
      task,
      doc;
    onPdf({ entries: [], ready: false, error: "" });
    setHistory([]);
    setZoom(null);
    setMoving(null);
    (async () => {
      const list = [];
      try {
        for (const [fileIndex, file] of files.entries()) {
          doc = await pdfRenderer(file);
          if (disposed) return;
          if (list.length + doc.numPages > 300)
            throw Error(
              "Preview limit is 300 pages in total. Remove a PDF to continue.",
            );
          for (let n = 1; n <= doc.numPages; n++) {
            if (disposed) return;
            const page = await doc.getPage(n);
            if (disposed) return;
            const natural = page.getViewport({ scale: 1 }),
              viewport = page.getViewport({
                scale: Math.min(300 / natural.width, 360 / natural.height),
              }),
              c = document.createElement("canvas");
            c.width = Math.ceil(viewport.width);
            c.height = Math.ceil(viewport.height);
            let blob = null;
            try {
              task = page.render({
                canvasContext: c.getContext("2d"),
                viewport,
                background: "#fff",
              });
              await task.promise;
              blob = await new Promise((resolve) =>
                c.toBlob(resolve, "image/jpeg", 0.8),
              );
            } catch (e) {
              if (disposed) return;
            } finally {
              c.width = c.height = 1;
              page.cleanup();
            }
            list.push({
              key: fileIndex + ":" + (n - 1),
              file,
              fileIndex,
              index: n - 1,
              original: list.length,
              blob,
            });
            if (!disposed)
              onPdf({ entries: [...list], ready: false, error: "" });
          }
          await doc.destroy();
          doc = null;
        }
        if (!disposed) onPdf({ entries: list, ready: true, error: "" });
      } catch (e) {
        if (!disposed)
          onPdf({
            entries: list,
            ready: false,
            error: e.message || "Invalid or protected PDF.",
          });
      } finally {
        await doc?.destroy();
      }
    })();
    return () => {
      disposed = true;
      task?.cancel();
      void doc?.destroy();
    };
  }, [files, onPdf]);
  useEffect(() => {
    if (previousPages.current === values.pages) return;
    previousPages.current = values.pages;
    if (skipSort.current) {
      skipSort.current = false;
      return;
    }
    try {
      const order = pageIndices(values.pages, entries.length),
        rank = new Map(order.map((n, i) => [n, i]));
      const sorted = [...entries].sort(
        (a, b) =>
          (rank.get(a.index) ?? Infinity) - (rank.get(b.index) ?? Infinity),
      );
      if (sorted.some((e, i) => e !== entries[i]))
        onPdf({ ...pdf, entries: sorted });
    } catch {}
  }, [values.pages, entries, pdf, onPdf]);
  function remember() {
    setHistory((h) => [
      ...h.slice(-49),
      { entries: [...entries], pages: values.pages },
    ]);
  }
  function commit(next, pages) {
    onPdf({ ...pdf, entries: next });
    if (split) {
      skipSort.current = true;
      onValues({ pages });
    }
  }
  function choose(set) {
    if (disabled) return;
    remember();
    commit(
      entries,
      entries
        .filter((e) => set.has(e.index))
        .map((e) => e.index + 1)
        .join(", "),
    );
  }
  function move(entry, to) {
    if (disabled || to < 0 || to >= entries.length) return;
    remember();
    const next = entries.filter((e) => e.key !== entry.key);
    next.splice(to, 0, entry);
    commit(
      next,
      next
        .filter((e) => selected.has(e.index))
        .map((e) => e.index + 1)
        .join(", "),
    );
    setStatus(`Moved page ${entry.index + 1} to position ${to + 1}.`);
  }
  const ordered = split
    ? indices.map((i) => entries.find((e) => e.index === i)).filter(Boolean)
    : entries;
  const labels = ordered.map((e) =>
    split ? String(e.index + 1) : `F${e.fileIndex + 1}:P${e.index + 1}`,
  );
  return (
    <section
      id="pdf-previews"
      className="pdf-previews"
      aria-label="PDF page previews"
    >
      <h2>
        {readOnly
          ? "Preview PDF pages"
          : id === "organize-pdf"
            ? "Arrange your pages"
            : split
              ? "Choose your pages"
              : "Preview merge order"}
      </h2>
      <p className="preview-help">
        {readOnly
          ? "Preview every page before compression. Click a thumbnail to zoom."
          : "Drag the grip to reorder pages, or use the arrow buttons. Uncheck pages to remove them where selection is available."}
      </p>
      <p className="preview-help" role="status">
        {pdf.error ||
          (!pdf.ready
            ? "Loading page previews…"
            : status ||
              `${ordered.length} pages ${split ? "selected" : readOnly ? "to compress" : "to merge"}`)}
      </p>
      {files.map((f, i) => (
        <section
          className="preview-group file-legend"
          key={i}
          style={{ "--file-color": colors[i % colors.length] }}
        >
          <h3>
            {i + 1}. {f.name}
          </h3>
        </section>
      ))}
      <div className="page-toolbar" hidden={readOnly}>
        {split &&
          [
            ["Select all", new Set(entries.map((e) => e.index))],
            ["Deselect all", new Set()],
            [
              "Invert selection",
              new Set(
                entries
                  .filter((e) => !selected.has(e.index))
                  .map((e) => e.index),
              ),
            ],
          ].map(([label, set]) => (
            <button
              key={label}
              className="secondary"
              disabled={disabled}
              onClick={() => choose(set)}
            >
              {label}
            </button>
          ))}
        <button
          className="secondary"
          disabled={disabled || !history.length}
          onClick={() => {
            const prev = history.at(-1);
            setHistory((h) => h.slice(0, -1));
            commit(prev.entries, prev.pages);
            setStatus("Previous change restored.");
          }}
        >
          ↶ Undo
        </button>
        <button
          className="secondary"
          disabled={disabled || entries.every((e, i) => e.original === i)}
          onClick={() => {
            remember();
            const next = [...entries].sort((a, b) => a.original - b.original);
            commit(
              next,
              next
                .filter((e) => selected.has(e.index))
                .map((e) => e.index + 1)
                .join(", "),
            );
          }}
        >
          Reset order
        </button>
      </div>
      <div className="page-thumbnails">
        {entries.map((entry, i) => (
          <figure
            key={entry.key}
            className="page-thumbnail"
            style={{ "--file-color": colors[entry.fileIndex % colors.length] }}
            onDragOver={(e) => {
              if (!disabled && !readOnly) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged.current) move(dragged.current, i);
              dragged.current = null;
            }}
          >
            <div className="page-caption">
              {split && (
                <label className="page-select">
                  <input
                    type="checkbox"
                    aria-label={`Select page ${entry.index + 1}`}
                    disabled={disabled}
                    checked={selected.has(entry.index)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(entry.index);
                      else next.delete(entry.index);
                      choose(next);
                    }}
                  />
                </label>
              )}
              <span>Page {entry.index + 1}</span>
              <small>F{entry.fileIndex + 1}</small>
            </div>
            <button
              className="thumbnail-image"
              disabled={disabled}
              aria-label={`Zoom ${entry.file.name} page ${entry.index + 1}`}
              onClick={() => setZoom(entry)}
            >
              {entry.blob ? (
                <BlobImage
                  blob={entry.blob}
                  alt={`${entry.file.name}, page ${entry.index + 1}`}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${rotation % 180 ? 0.7 : 1})`,
                  }}
                />
              ) : (
                "Preview unavailable"
              )}
            </button>
            <div className="page-move-controls" hidden={readOnly}>
              <button
                className="page-grip"
                draggable={!disabled}
                disabled={disabled}
                aria-label={`Drag ${entry.file.name} page ${entry.index + 1}`}
                onDragStart={(e) => {
                  dragged.current = entry;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", entry.key);
                }}
              >
                ⠿
              </button>
              <button
                className="secondary"
                disabled={disabled || i === 0}
                aria-label={`Move ${entry.file.name} page ${entry.index + 1} earlier`}
                onClick={() => move(entry, i - 1)}
              >
                ←
              </button>
              <button
                className="page-position"
                disabled={disabled}
                aria-label={`Move ${entry.file.name} page ${entry.index + 1} to position`}
                onClick={() => setMoving(entry)}
              >
                {i + 1} / {entries.length}
              </button>
              <button
                className="secondary"
                disabled={disabled || i === entries.length - 1}
                aria-label={`Move ${entry.file.name} page ${entry.index + 1} later`}
                onClick={() => move(entry, i + 1)}
              >
                →
              </button>
            </div>
          </figure>
        ))}
      </div>
      <details className="page-order-summary" hidden={readOnly}>
        <summary>
          Output order: {labels.slice(0, 8).join(", ") || "No pages selected"}
          {labels.length > 8 ? "… (show all)" : ""}
        </summary>
        <p>{labels.join(" → ") || "Select at least one page."}</p>
      </details>
      {zoom && (
        <Zoom entry={zoom} rotation={rotation} onClose={() => setZoom(null)} />
      )}
      {moving && (
        <MoveDialog
          position={entries.indexOf(moving)}
          count={entries.length}
          onMove={(to) => move(moving, to)}
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}
