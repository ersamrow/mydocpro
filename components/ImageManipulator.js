import { useEffect, useRef, useState } from "react";
import { cropBox, dragCrop, clamp } from "../src/image-geometry.js";
export default function ImageManipulator({
  file,
  kind,
  values,
  onValues,
  busy,
}) {
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
      scale = Math.min(1, 900 / width, 600 / height);
    c.width = Math.round(width * scale);
    c.height = Math.round(height * scale);
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(
      image,
      (-image.naturalWidth * scale) / 2,
      (-image.naturalHeight * scale) / 2,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
    if (crop)
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
  function start(e) {
    if (busy || !image || e.button !== 0) return;
    const handle = e.target.dataset.handle || "move";
    if (!crop && handle === "move") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      handle,
      rect,
      bounds: surface.current.getBoundingClientRect(),
      w,
      h,
    };
  }
  function move(e) {
    const a = active.current;
    if (!a || a.id !== e.pointerId || busy) return;
    const dx = (e.clientX - a.x) / a.bounds.width,
      dy = (e.clientY - a.y) / a.bounds.height;
    if (crop) updateRect(dragCrop(a.rect, a.handle, dx, dy, ratio));
    else {
      const nw = Math.max(1, a.w * (1 + dx));
      dimensions(nw, lock ? (nw * a.h) / a.w : Math.max(1, a.h * (1 + dy)));
    }
  }
  function end(e) {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    if (e.type === "pointercancel") {
      if (crop) updateRect(a.rect);
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
    if (crop)
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
      onValues({ zoom: "100" });
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
      <div className="manipulator-board">
        <div
          className="manipulator-surface"
          ref={surface}
          style={{
            aspectRatio: crop ? String(width / height) : String(w / h || 1),
            width: crop
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
                ? "Crop area. Drag or use arrow keys to move."
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
            {(crop ? ["nw", "ne", "sw", "se", "n", "s", "e", "w"] : ["se"]).map(
              (handle) => (
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
              ),
            )}
          </div>
        </div>
      </div>
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
            ? `${angle}° rotation · Crop: ${Math.round(rect.w * width)} × ${Math.round(rect.h * height)} px`
            : `Output: ${Math.round(w) || 0} × ${Math.round(h) || 0} px`}
        </span>
      </div>
    </section>
  );
}
