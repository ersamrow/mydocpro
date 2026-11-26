import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, ToolLayout, ActionBar } from "./ui.js";
import TrustBadges from "./TrustBadges.js";
import Dropzone from "./Dropzone.js";
import ToolGuide from "./ToolGuide.js";
import { Icon } from "./Shared.js";
import { useObjectUrl } from "./useObjectUrl.js";
import { inspectFiles } from "../src/file-validation.js";
import { size } from "../src/tool-settings.js";
import { downloadName } from "../src/download-name.js";
import {
  applyFilter,
  detectDocumentQuad,
  insetQuad,
  isConvex,
  outputSize,
  warpPerspective,
} from "../src/scan-image.js";
import { buildScanPdf, MAX_SCAN_PAGES } from "../src/scan-pdf.js";

const FILTERS = [
  ["enhanced", "Enhanced"],
  ["bw", "Black & white"],
  ["original", "Original"],
];
const SOURCE_SIDE = 2400;
let nextId = 1;

function canvasOf(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
const toBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("This browser could not save the scan."))),
      type,
      quality,
    ),
  );

// Warp, clean up and rotate one page into a JPEG.
async function render(page) {
  const [w, h] = outputSize(page.quad);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const warped = warpPerspective(page.source, page.quad, w, h);
  applyFilter(warped, page.filter);
  const flat = canvasOf(w, h);
  flat
    .getContext("2d")
    .putImageData(new ImageData(warped.data, w, h), 0, 0);
  const turns = ((page.rotation % 360) + 360) % 360;
  let out = flat;
  if (turns) {
    out = canvasOf(turns % 180 ? h : w, turns % 180 ? w : h);
    const x = out.getContext("2d");
    x.translate(out.width / 2, out.height / 2);
    x.rotate((turns * Math.PI) / 180);
    x.drawImage(flat, -w / 2, -h / 2);
  }
  const blob = await toBlob(out, "image/jpeg", 0.85);
  return { blob, width: out.width, height: out.height };
}

async function loadPage(file) {
  const { normalizeImageFile } = await import("../src/image-processing.js");
  const normalized = await normalizeImageFile(file);
  const bitmap = await createImageBitmap(normalized).catch(() => {
    throw Error(`${file.name} could not be opened. Choose another photo.`);
  });
  const scale = Math.min(1, SOURCE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)),
    height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = canvasOf(width, height),
    context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const source = context.getImageData(0, 0, width, height);
  const preview = canvasOf(
    Math.min(width, 1000),
    Math.round((height * Math.min(width, 1000)) / width),
  );
  preview.getContext("2d").drawImage(canvas, 0, 0, preview.width, preview.height);
  const found = detectDocumentQuad(source);
  return {
    id: nextId++,
    name: file.name,
    source,
    previewBlob: await toBlob(preview, "image/jpeg", 0.8),
    quad: found || insetQuad(width, height, 0.04),
    detected: Boolean(found),
    filter: "enhanced",
    rotation: 0,
  };
}

function CornerEditor({ page, onChange }) {
  const svg = useRef(null),
    active = useRef(-1);
  const previewUrl = useObjectUrl(page.previewBlob);
  const { width, height } = page.source;
  const r = Math.max(width, height) * 0.022;
  const point = (event) => {
    const m = svg.current.getScreenCTM().inverse();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m);
    return [
      Math.min(width, Math.max(0, p.x)),
      Math.min(height, Math.max(0, p.y)),
    ];
  };
  const move = (index, to) =>
    onChange({ quad: page.quad.map((q, i) => (i === index ? to : q)), detected: false });
  const names = ["Top left", "Top right", "Bottom right", "Bottom left"];
  const valid = isConvex(page.quad);
  return (
    <div className="scan-editor">
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        className="scan-svg"
        role="group"
        aria-label="Page corners. Drag each handle to a corner of the page."
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerMove={(e) => active.current >= 0 && move(active.current, point(e))}
        onPointerUp={() => (active.current = -1)}
        onPointerCancel={() => (active.current = -1)}
      >
        {previewUrl && <image href={previewUrl} width={width} height={height} />}
        <polygon
          points={page.quad.map((q) => q.join(",")).join(" ")}
          className={valid ? "scan-quad" : "scan-quad scan-bad"}
        />
        {page.quad.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            className="scan-handle"
            tabIndex={0}
            role="slider"
            aria-label={`${names[i]} corner`}
            aria-valuetext={`${Math.round((x / width) * 100)}% across, ${Math.round((y / height) * 100)}% down`}
            onPointerDown={(e) => {
              e.preventDefault();
              active.current = i;
              svg.current.setPointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
              if (!d) return;
              e.preventDefault();
              const step = Math.max(width, height) * (e.shiftKey ? 0.02 : 0.004);
              move(i, [
                Math.min(width, Math.max(0, x + d[0] * step)),
                Math.min(height, Math.max(0, y + d[1] * step)),
              ]);
            }}
          />
        ))}
      </svg>
      {!valid && (
        <p className="scan-warning" role="alert">
          The corners cross over. Drag them back to the page corners.
        </p>
      )}
    </div>
  );
}

function Thumb({ page, index, count, selected, onSelect, onMove, onRemove }) {
  const url = useObjectUrl(page.result?.blob);
  return (
    <li className={`scan-thumb${selected ? " scan-selected" : ""}`}>
      <button
        type="button"
        className="scan-thumb-image"
        aria-pressed={selected}
        aria-label={`Edit page ${index + 1}`}
        onClick={onSelect}
      >
        {url ? <img src={url} alt={`Page ${index + 1}`} /> : <span>…</span>}
      </button>
      <div className="scan-thumb-actions">
        <span>{index + 1}</span>
        <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => onMove(-1)}>←</button>
        <button type="button" aria-label="Move later" disabled={index === count - 1} onClick={() => onMove(1)}>→</button>
        <button type="button" aria-label={`Remove page ${index + 1}`} onClick={onRemove}>×</button>
      </div>
    </li>
  );
}

export default function ScanPdf({ heading }) {
  const [pages, setPages] = useState([]),
    [selected, setSelected] = useState(null),
    [pageSize, setPageSize] = useState("a4");
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Take a photo or choose pictures of your pages."),
    [error, setError] = useState(false);
  const [pdf, setPdf] = useState(null),
    pdfUrl = useObjectUrl(pdf);
  const camera = useRef(null),
    alive = useRef(true),
    timers = useRef(new Map()),
    pagesRef = useRef([]);
  pagesRef.current = pages;
  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
    };
  }, []);
  const report = (message, isError = false) => {
    setStatus(message);
    setError(isError);
  };
  const patch = useCallback((id, changes, rerender = true) => {
    setPdf(null);
    setPages((all) => all.map((p) => (p.id === id ? { ...p, ...changes } : p)));
    if (!rerender) return;
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(async () => {
        const page = pagesRef.current.find((p) => p.id === id);
        if (!page || !isConvex(page.quad)) return;
        try {
          const result = await render(page);
          if (alive.current)
            setPages((all) => all.map((p) => (p.id === id ? { ...p, result } : p)));
        } catch (e) {
          if (alive.current) report(e.message, true);
        }
      }, 180),
    );
  }, []);
  async function add(files) {
    const room = MAX_SCAN_PAGES - pagesRef.current.length;
    if (room <= 0) return report(`You can scan up to ${MAX_SCAN_PAGES} pages at once.`, true);
    setBusy(true);
    let added = 0,
      first = null,
      skipped = 0;
    for (const file of files.slice(0, room)) {
      try {
        if (file.size > 25 * 1048576) throw Error(`${file.name} is over 25 MB.`);
        await inspectFiles([file], false);
        const page = await loadPage(file);
        page.result = await render(page);
        if (!alive.current) return;
        first = first ?? page.id;
        setPdf(null);
        setPages((all) => all.concat(page));
        added++;
      } catch (e) {
        skipped++;
        report(e.message, true);
      }
    }
    if (!alive.current) return;
    setBusy(false);
    if (first !== null) setSelected(first);
    if (added)
      report(
        `${added} ${added === 1 ? "page" : "pages"} added.` +
          (files.length > room ? ` Only the first ${room} fit.` : "") +
          (skipped ? ` ${skipped} could not be used.` : "") +
          " Check each page's corners, then create your PDF.",
      );
  }
  function move(index, delta) {
    setPdf(null);
    setPages((all) => {
      const next = all.slice();
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  function remove(id) {
    setPdf(null);
    setPages((all) => all.filter((p) => p.id !== id));
    setSelected((current) => (current === id ? null : current));
  }
  async function create() {
    setBusy(true);
    try {
      const out = await buildScanPdf(
        pages.map((p) => ({ ...p.result })),
        { pageSize },
      );
      if (!alive.current) return;
      setPdf(out);
      report("Your PDF is ready. Download it and check every page.");
    } catch (e) {
      report(e.message, true);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const current = pages.find((p) => p.id === selected);
  const index = pages.findIndex((p) => p.id === selected);
  const outName = downloadName("", "scan.pdf");
  return (
    <ToolLayout className="workspace tool-workspace scan-pdf">
      <div className="tool-heading">
        <Button as={Link} className="back" href="/">
          <Icon name="grid2x2" />
          All tools
        </Button>
        <h1>{heading}</h1>
        <p className="intro">
          Photograph paper documents and turn them into a clean, flat PDF. The
          photos are processed in your browser and never uploaded.
        </p>
        <TrustBadges toolId="scan-pdf" />
      </div>
      <Card className="scan-add">
        <h2>1. Add your pages</h2>
        <div className="scan-add-row">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => camera.current?.click()}
          >
            Take a photo
          </Button>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-label="Take a photo of a page"
            onChange={(e) => {
              add(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          <Dropzone
            accept="image/*"
            multiple
            disabled={busy}
            onFiles={add}
            title="Choose pictures or drop them here"
            buttonLabel="Choose pictures"
            hint="JPG, PNG, WebP or HEIC. Up to 20 pages."
          />
        </div>
        <p className={error ? "scan-status scan-warning" : "scan-status"} role="status">
          {busy ? "Working…" : status}
        </p>
      </Card>
      {current && (
        <Card className="scan-adjust" aria-label={`Adjust page ${index + 1}`}>
          <h2>2. Adjust page {index + 1}</h2>
          <div className="scan-panels">
            <div>
              <p className="scan-hint">
                Drag the four dots to the corners of the page.
                {current.detected
                  ? " The page was found automatically."
                  : ""}
              </p>
              <CornerEditor page={current} onChange={(c) => patch(current.id, c)} />
              <div className="scan-buttons">
                <Button
                  onClick={() => {
                    const found = detectDocumentQuad(current.source);
                    patch(current.id, {
                      quad: found || insetQuad(current.source.width, current.source.height, 0.04),
                      detected: Boolean(found),
                    });
                    if (!found) report("No page edges were found. Drag the corners yourself.", true);
                  }}
                >
                  Auto-detect
                </Button>
                <Button
                  onClick={() =>
                    patch(current.id, {
                      quad: insetQuad(current.source.width, current.source.height, 0),
                      detected: false,
                    })
                  }
                >
                  Whole photo
                </Button>
              </div>
            </div>
            <div>
              <p className="scan-hint">Result</p>
              <ResultPreview page={current} />
              <div className="scan-buttons" role="group" aria-label="Filter">
                {FILTERS.map(([id, label]) => (
                  <Button
                    key={id}
                    aria-pressed={current.filter === id}
                    onClick={() => patch(current.id, { filter: id })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="scan-buttons">
                <Button onClick={() => patch(current.id, { rotation: current.rotation - 90 })}>
                  ↺ Rotate left
                </Button>
                <Button onClick={() => patch(current.id, { rotation: current.rotation + 90 })}>
                  ↻ Rotate right
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      {pages.length > 0 && (
        <Card className="scan-pages">
          <h2>{current ? "3." : "2."} Your pages</h2>
          <ul className="scan-list">
            {pages.map((page, i) => (
              <Thumb
                key={page.id}
                page={page}
                index={i}
                count={pages.length}
                selected={page.id === selected}
                onSelect={() => setSelected(page.id)}
                onMove={(d) => move(i, d)}
                onRemove={() => remove(page.id)}
              />
            ))}
          </ul>
          <label className="scan-size">
            Page size
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value);
                setPdf(null);
              }}
            >
              <option value="a4">A4 with a small margin</option>
              <option value="fit">Same size as the scan</option>
            </select>
          </label>
        </Card>
      )}
      {pages.length > 0 && (
        <ActionBar>
          <span>
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </span>
          {pdf && pdfUrl ? (
            <Button as="a" variant="primary" href={pdfUrl} download={outName}>
              Download PDF ({size(pdf.size)})
            </Button>
          ) : (
            <Button variant="primary" disabled={busy} onClick={create}>
              {busy ? "Working…" : "Create PDF"}
            </Button>
          )}
        </ActionBar>
      )}
      <ToolGuide id="scan-pdf" />
    </ToolLayout>
  );
}

function ResultPreview({ page }) {
  const url = useObjectUrl(page.result?.blob);
  return url ? (
    <img className="scan-result" src={url} alt="Corrected page preview" />
  ) : (
    <p className="scan-hint">Preparing…</p>
  );
}
