import { useEffect, useRef, useState } from "react";
import { cropBox, dragCrop, clamp } from "../src/image-geometry.js";
export default function ImageManipulator({
  file,
  kind,
  values,
  onValues,
  busy,
  previewZoom = false,
}) {
  const [viewWidth, setViewWidth] = useState(500);
  const viewZoom = previewZoom ? Number(values["image-zoom"] || 100) : 100;
  const panX = previewZoom ? Number(values["image-pan-x"] || 0) : 0;
  const panY = previewZoom ? Number(values["image-pan-y"] || 0) : 0;
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const board = useRef(null);
  const [image, setImage] = useState(null),
    [error, setError] = useState("");
  const canvas = useRef(null),
    surface = useRef(null),
    active = useRef(null);
  const lock = !!values.keepProportions;
  const crop = kind === "crop-image",
    angle = crop ? Number(values.rotation) : 0;
  const width = image
      ? angle % 180
        ? image.naturalHeight
        : image.naturalWidth
      : 1,
    height = image
      ? angle % 180
        ? image.naturalWidth
        : image.naturalHeight
      : 1;
  const rect = {
    x: Number(values["crop-x"] || 0),
    y: Number(values["crop-y"] || 0),
    w: Number(values["crop-w"] || 1),
    h: Number(values["crop-h"] || 1),
  };
  const fitWidth = Math.min(viewWidth, (380 * width) / height);
  const fitHeight = (fitWidth * height) / width;
  useEffect(() => {
    if (!previewZoom || !board.current) return;
    const measure = () => {
      const style = getComputedStyle(board.current);
      setViewWidth(
        Math.max(
          1,
          board.current.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight),
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board.current);
    measure();
    return () => observer.disconnect();
  }, [previewZoom]);
  const factor =
    {
      px: 1,
      cm: Number(values.dpi) / 2.54,
      mm: Number(values.dpi) / 25.4,
      in: Number(values.dpi),
    }[values.unit] || 1;
  const w = Number(values.width) * factor,
    h = Number(values.height) * factor;
  const updateRect = (r) =>
    onValues(
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => ["crop-" + k, String(v)]),
      ),
    );
  function dimensions(w, h) {
    const scale = Math.min(
      1,
      12000 / Math.max(w, h),
      Math.sqrt(25000000 / (w * h)),
    );
    onValues({
      width: String(
        Math.max(0.1, (w * scale) / factor).toFixed(
          values.unit === "px" ? 0 : 3,
        ),
      ),
      height: String(
        Math.max(0.1, (h * scale) / factor).toFixed(
          values.unit === "px" ? 0 : 3,
        ),
      ),
    });
  }
  useEffect(() => {
    let dead = false;
    const url = URL.createObjectURL(file),
      im = new Image();
    im.src = url;
    im.decode()
      .then(() => {
        if (!dead) setImage(im);
      })
      .catch(() => {
        if (!dead) setError("Unable to load editing controls.");
      });
    return () => {
      dead = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => {
    if (!image) return;
    const c = canvas.current,
      scale = Math.min(
        1,
        Math.min(2400, (900 * viewZoom) / 100) / width,
        Math.min(2400, (600 * viewZoom) / 100) / height,
      );
    c.width = Math.round(width * scale);
    c.height = Math.round(height * scale);
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2 + panX * c.width, c.height / 2 + panY * c.height);
    ctx.scale(viewZoom / 100, viewZoom / 100);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(
      image,
      (-image.naturalWidth * scale) / 2,
      (-image.naturalHeight * scale) / 2,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
  }, [image, angle, viewZoom, panX, panY]);
  useEffect(() => {
    if (image && crop)
      updateRect(
        cropBox(width, height, values.ratio, Number(values.zoom) || 100),
      );
  }, [image, angle, values.ratio, values.zoom]);
  const ratio =
    values.ratio === "free"
      ? null
      : ((values.ratio === "original" ? width / height : Number(values.ratio)) *
          height) /
        width;
  function camera(zoom, x = panX, y = panY) {
    const z = clamp(zoom, 100, 400),
      limit = (z / 100 - 1) / 2;
    onValues({
      "image-zoom": String(z),
      "image-pan-x": String(clamp(x, -limit, limit)),
      "image-pan-y": String(clamp(y, -limit, limit)),
    });
  }
  function zoomTo(zoom) {
    camera(zoom, (panX * zoom) / viewZoom, (panY * zoom) / viewZoom);
  }
  useEffect(() => {
    const element = board.current;
    if (!previewZoom || !element) return;
    const wheel = (event) => {
      if (
        !element.contains(document.activeElement) ||
        busy ||
        !image ||
        !event.deltaY
      )
        return;
      event.preventDefault();
      const bounds = surface.current.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      const zoom = clamp(viewZoom + (event.deltaY < 0 ? 25 : -25), 100, 400);
      const factor = zoom / viewZoom;
      camera(zoom, x - (x - panX) * factor, y - (y - panY) * factor);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [previewZoom, busy, image, viewZoom, panX, panY, onValues]);
  function start(e) {
    if (busy || !image || e.button !== 0) return;
    const handle = e.target.dataset.handle || "move";
    if (previewZoom) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          zoom: viewZoom,
          x: panX,
          y: panY,
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          bounds: surface.current.getBoundingClientRect(),
        };
        active.current = null;
        return;
      }
    }
    if (!crop && handle === "move") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      handle: previewZoom && handle === "move" ? "pan" : handle,
      panX,
      panY,
      rect,
      bounds: surface.current.getBoundingClientRect(),
      w,
      h,
    };
  }
  function move(e) {
    if (busy) return;
    if (previewZoom && pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && pointers.current.size === 2) {
        const [p, q] = [...pointers.current.values()],
          a = pinch.current;
        const z = clamp(
            (a.zoom * Math.hypot(p.x - q.x, p.y - q.y)) /
              Math.max(1, a.distance),
            100,
            400,
          ),
          factor = z / a.zoom;
        const ax = (a.cx - a.bounds.left) / a.bounds.width - 0.5,
          ay = (a.cy - a.bounds.top) / a.bounds.height - 0.5;
        camera(
          z,
          ax - (ax - a.x) * factor + ((p.x + q.x) / 2 - a.cx) / a.bounds.width,
          ay - (ay - a.y) * factor + ((p.y + q.y) / 2 - a.cy) / a.bounds.height,
        );
        return;
      }
    }
    const a = active.current;
    if (!a || a.id !== e.pointerId || busy) return;
    const dx = (e.clientX - a.x) / a.bounds.width,
      dy = (e.clientY - a.y) / a.bounds.height;
    if (a.handle === "pan") camera(viewZoom, a.panX + dx, a.panY + dy);
    else if (crop) updateRect(dragCrop(a.rect, a.handle, dx, dy, ratio));
    else {
      const nw = Math.max(1, a.w * (1 + dx));
      dimensions(nw, lock ? (nw * a.h) / a.w : Math.max(1, a.h * (1 + dy)));
    }
  }
  function end(e) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    if (e.type === "pointercancel") {
      if (a.handle === "pan") camera(viewZoom, a.panX, a.panY);
      else if (crop) updateRect(a.rect);
      else dimensions(a.w, a.h);
    }
    active.current = null;
  }
  function key(e) {
    if (busy || !image || !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    const dx =
        (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) *
        (e.shiftKey ? 10 : 1),
      dy =
        (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0) *
        (e.shiftKey ? 10 : 1);
    if (previewZoom && !e.target.dataset.handle)
      camera(viewZoom, panX + dx / width, panY + dy / height);
    else if (crop)
      updateRect(
        dragCrop(
          rect,
          e.target.dataset.handle || "move",
          dx / width,
          dy / height,
          ratio,
        ),
      );
    else {
      const nw = Math.max(1, w + dx + (lock ? dy : 0));
      dimensions(nw, lock ? (nw * h) / w : Math.max(1, h + dy));
    }
  }
  const reset = () => {
    if (crop) {
      onValues({
        zoom: "100",
        "image-zoom": "100",
        "image-pan-x": "0",
        "image-pan-y": "0",
      });
      updateRect(cropBox(width, height, values.ratio, 100));
    } else dimensions(width, height);
  };
  return (
    <section
      className={
        "image-manipulator " +
        (crop ? "crop-manipulator" : "resize-manipulator")
      }
    >
      <p>
        {error ||
          (crop
            ? "Drag edges to crop freely. Use the arrows to rotate 90°. Rotating resets the crop selection."
            : "Drag the corner or use the size slider. Exact dimensions remain available below.")}
      </p>
      {crop && (
        <div className="crop-rotation-bar">
          <button
            className="secondary"
            disabled={busy}
            aria-label="Rotate image left 90 degrees"
            onClick={() => onValues({ rotation: String((angle + 270) % 360) })}
          >
            ↶ Rotate left
          </button>
          <button
            className="secondary"
            disabled={busy}
            aria-label="Rotate image right 90 degrees"
            onClick={() => onValues({ rotation: String((angle + 90) % 360) })}
          >
            ↷ Rotate right
          </button>
          <button className="secondary" disabled={busy} onClick={reset}>
            Reset crop
          </button>
        </div>
      )}
      {previewZoom && (
        <div
          className="preview-zoom-controls"
          aria-label="Preview zoom controls"
        >
          <button
            type="button"
            disabled={viewZoom <= 100 || busy}
            aria-label="Zoom out"
            onClick={() => zoomTo(Math.max(100, viewZoom - 25))}
          >
            −
          </button>
          <input
            type="range"
            min="100"
            max="400"
            step="25"
            aria-label="Image zoom"
            value={viewZoom}
            disabled={busy}
            onChange={(e) => zoomTo(+e.target.value)}
          />
          <button
            type="button"
            disabled={viewZoom >= 400 || busy}
            aria-label="Zoom in"
            onClick={() => zoomTo(Math.min(400, viewZoom + 25))}
          >
            +
          </button>
          <output aria-live="polite">{viewZoom}%</output>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              camera(100, 0, 0);
              board.current?.scrollTo(0, 0);
            }}
          >
            Fit image
          </button>
        </div>
      )}
      <div
        ref={board}
        className={
          "manipulator-board" + (previewZoom ? " preview-zoom-viewport" : "")
        }
        tabIndex={previewZoom ? 0 : undefined}
        onPointerDownCapture={
          previewZoom
            ? () => board.current?.focus({ preventScroll: true })
            : undefined
        }
        aria-label={previewZoom ? "Image crop preview" : undefined}
      >
        <div
          style={
            previewZoom
              ? {
                  width: viewWidth,
                  height: fitHeight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }
              : { display: "contents" }
          }
        >
          <div
            className="manipulator-surface"
            ref={surface}
            style={{
              ...(previewZoom
                ? {
                    flexShrink: 0,
                    maxWidth: "none",
                    maxHeight: "none",
                    height: fitHeight,
                  }
                : {}),
              aspectRatio: crop ? String(width / height) : String(w / h || 1),
              width: previewZoom
                ? fitWidth
                : crop
                  ? `min(100%, ${(380 * width) / height}px)`
                  : `min(${Math.max(15, Math.min(1, w / width) * 90)}%, ${(380 * w) / h}px)`,
            }}
          >
            <canvas
              ref={canvas}
              aria-label="Image editing surface"
              style={
                !crop
                  ? {
                      objectFit:
                        values.fit === "cover"
                          ? "cover"
                          : values.fit === "stretch"
                            ? "fill"
                            : "contain",
                    }
                  : undefined
              }
            />
            <div
              className="manipulator-box"
              tabIndex={0}
              role="group"
              aria-label={
                crop
                  ? previewZoom
                    ? "Crop area. Drag or use arrow keys to reposition the image."
                    : "Crop area. Drag or use arrow keys to move."
                  : "Resize frame"
              }
              data-free={values.ratio === "free"}
              style={
                crop
                  ? {
                      left: rect.x * 100 + "%",
                      top: rect.y * 100 + "%",
                      width: rect.w * 100 + "%",
                      height: rect.h * 100 + "%",
                    }
                  : undefined
              }
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onLostPointerCapture={end}
              onKeyDown={key}
            >
              {(crop
                ? ["nw", "ne", "sw", "se", "n", "s", "e", "w"]
                : ["se"]
              ).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  className={"image-handle " + handle}
                  data-handle={handle}
                  disabled={busy}
                  aria-label={
                    (crop ? "Crop " : "Resize ") +
                    handle +
                    " corner; use arrow keys for precision"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {previewZoom && (
        <p className="preview-zoom-hint">
          Click the image, then scroll to zoom. You can also pinch or use + / −.
          Drag inside the frame to reposition; drag its handles to crop.
        </p>
      )}
      <div className="manipulator-toolbar">
        {!crop && (
          <>
            <label>
              <input
                type="checkbox"
                checked={lock}
                onChange={(e) =>
                  onValues({ keepProportions: e.target.checked })
                }
              />{" "}
              Keep proportions
            </label>
            <label>
              Size (% of original width)
              <input
                type="range"
                min="5"
                max="200"
                step="1"
                aria-label="Resize scale"
                disabled={busy}
                value={clamp((w / width) * 100 || 100, 5, 200)}
                onChange={(e) => {
                  const nw = (width * Number(e.target.value)) / 100;
                  dimensions(nw, lock ? (nw * h) / w : h);
                }}
              />
            </label>
            <button className="secondary" disabled={busy} onClick={reset}>
              Original size
            </button>
          </>
        )}
        <span role="status">
          {crop
            ? `${angle}° rotation · Crop: ${Math.round((rect.w * width) / (viewZoom / 100))} × ${Math.round((rect.h * height) / (viewZoom / 100))} px`
            : `Output: ${Math.round(w) || 0} × ${Math.round(h) || 0} px`}
        </span>
      </div>
    </section>
  );
}
