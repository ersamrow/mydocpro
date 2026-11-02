import { useEffect, useRef, useState } from "react";
import { pdfRenderer, pageIndices } from "../src/processing.js";
import { isBackdropClick, useDialogFocus } from "./dialog.js";
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
  useDialogFocus(dialog);
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
        if (isBackdropClick(e)) onClose();
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
function MoveDialog({ position, count, entry, onMove, onClose }) {
  const ref = useRef(null),
    [value, setValue] = useState(position + 1);
  useDialogFocus(ref);
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
        <p className="move-page-context">
          {entry.file.name} · Page {entry.index + 1}
          <br />
          Currently at position {position + 1} of {count}
        </p>
        <label>
          Pick a new position
          <select
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {Array.from({ length: count }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
                {i === 0
                  ? " — First page"
                  : i === count - 1
                    ? " — Last page"
                    : ""}
                {i === position ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Move here
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
    [previewPage, setPreviewPage] = useState(0),
    [mergePreviewSize, setMergePreviewSize] = useState(6),
    [status, setStatus] = useState("");
  const dragged = useRef(null),
    skipSort = useRef(false),
    previousPages = useRef(values.pages);
  const split = ["split-pdf", "organize-pdf", "pdf-to-image"].includes(id),
    readOnly = id === "compress-pdf",
    compact = id === "merge-pdf",
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
    if (!compact) return;
    const media = window.matchMedia("(max-width: 650px)");
    const updatePreviewSize = () => {
      setMergePreviewSize(media.matches ? 4 : 6);
      setPreviewPage(0);
    };
    updatePreviewSize();
    media.addEventListener("change", updatePreviewSize);
    return () => media.removeEventListener("change", updatePreviewSize);
  }, [compact]);
  useEffect(() => {
    let disposed = false,
      task,
      doc;
    onPdf({ entries: [], ready: false, error: "" });
    setHistory([]);
    setZoom(null);
    setMoving(null);
    setPreviewPage(0);
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
    if (compact) setPreviewPage(Math.floor(to / mergePreviewSize));
  }
  const ordered = split
    ? indices.map((i) => entries.find((e) => e.index === i)).filter(Boolean)
    : entries;
  const labels = ordered.map((e) =>
    split ? String(e.index + 1) : `F${e.fileIndex + 1}:P${e.index + 1}`,
  );
  const previewPageCount = Math.max(
      1,
      Math.ceil(entries.length / mergePreviewSize),
    ),
    currentPreviewPage = Math.min(previewPage, previewPageCount - 1),
    previewStart = compact ? currentPreviewPage * mergePreviewSize : 0,
    visibleEntries = compact
      ? entries.slice(previewStart, previewStart + mergePreviewSize)
      : entries;
  return (
    <section
      id="pdf-previews"
      className={"pdf-previews" + (compact ? " merge-previews" : "")}
      aria-label="PDF page previews"
    >
      {compact ? (
        <div className="merge-preview-heading">
          <h2>Page order</h2>
          <span className="merge-page-count">{entries.length} pages</span>
        </div>
      ) : (
        <h2>
          {readOnly
            ? "Preview PDF pages"
            : id === "organize-pdf"
              ? "Arrange your pages"
              : split
                ? "Choose your pages"
                : "Preview merge order"}
        </h2>
      )}
      <p className="preview-help">
        {compact
          ? "Drag a card or use arrows to reorder. Click a preview to zoom."
          : readOnly
            ? "Preview every page before compression. Click a thumbnail to zoom."
            : "Drag the grip to reorder pages, or use the arrow buttons. Uncheck pages to remove them where selection is available."}
      </p>
      <p
        className="preview-help"
        role="status"
        hidden={compact && pdf.ready && !pdf.error && !status}
      >
        {pdf.error ||
          (!pdf.ready
            ? "Loading page previews…"
            : status ||
              `${ordered.length} pages ${split ? "selected" : readOnly ? "to compress" : "to merge"}`)}
      </p>
      {!compact &&
        files.map((f, i) => (
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
      {compact && entries.length > mergePreviewSize && (
        <nav
          className="merge-preview-pagination"
          aria-label="PDF preview pages"
        >
          <span role="status">
            Showing {previewStart + 1}–
            {Math.min(previewStart + mergePreviewSize, entries.length)} of{" "}
            {entries.length}
          </span>
          <div>
            <button
              className="secondary"
              disabled={currentPreviewPage === 0}
              onClick={() => setPreviewPage(currentPreviewPage - 1)}
              aria-label="Previous page previews"
            >
              ←
            </button>
            <label>
              <span className="merge-pagination-label">Preview group</span>
              <select
                value={currentPreviewPage}
                onChange={(e) => setPreviewPage(Number(e.target.value))}
              >
                {Array.from({ length: previewPageCount }, (_, n) => (
                  <option key={n} value={n}>
                    {n + 1} / {previewPageCount}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={currentPreviewPage >= previewPageCount - 1}
              onClick={() => setPreviewPage(currentPreviewPage + 1)}
              aria-label="Next page previews"
            >
              →
            </button>
          </div>
        </nav>
      )}
      <div className="page-thumbnails">
        {visibleEntries.map((entry, localIndex) => {
          const i = previewStart + localIndex;
          return (
            <figure
              key={entry.key}
              className="page-thumbnail"
              draggable={compact && !disabled}
              onDragStart={
                compact
                  ? (e) => {
                      if (disabled) {
                        e.preventDefault();
                        return;
                      }
                      dragged.current = entry;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", entry.key);
                    }
                  : undefined
              }
              onDragEnd={
                compact
                  ? () => {
                      dragged.current = null;
                    }
                  : undefined
              }
              style={{
                "--file-color": colors[entry.fileIndex % colors.length],
              }}
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
                <span>{compact ? `#${i + 1}` : `Page ${entry.index + 1}`}</span>
                <small>
                  {compact
                    ? `Page ${entry.index + 1}`
                    : `F${entry.fileIndex + 1}`}
                </small>
              </div>
              {compact && (
                <div className="merge-page-source" title={entry.file.name}>
                  {entry.file.name}
                </div>
              )}
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
                {!compact && (
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
                )}
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
                  {compact ? (
                    <span className="page-position-dots" aria-hidden="true">
                      ⠿
                    </span>
                  ) : (
                    `${i + 1} / ${entries.length}`
                  )}
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
          );
        })}
      </div>
      <details className="page-order-summary" hidden={readOnly}>
        <summary>
          {compact ? (
            "View complete merge order"
          ) : (
            <>
              Output order:{" "}
              {labels.slice(0, 8).join(", ") || "No pages selected"}
              {labels.length > 8 ? "… (show all)" : ""}
            </>
          )}
        </summary>
        {compact ? (
          <ol className="merge-readable-order">
            {ordered.map((entry) => (
              <li key={entry.key}>
                {entry.file.name} <span>· Page {entry.index + 1}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>{labels.join(" → ") || "Select at least one page."}</p>
        )}
      </details>
      {zoom && (
        <Zoom entry={zoom} rotation={rotation} onClose={() => setZoom(null)} />
      )}
      {moving && (
        <MoveDialog
          entry={moving}
          position={entries.indexOf(moving)}
          count={entries.length}
          onMove={(to) => move(moving, to)}
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}
