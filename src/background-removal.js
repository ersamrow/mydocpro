import { throwIfCancelled, checkpoint } from "./file-validation.js";

// On-device person segmentation (MediaPipe selfie segmenter, Apache-2.0).
// The model and WebAssembly runtime are served from this site; no image is
// uploaded. Both are loaded on first use only.
const WASM_BASE = "/mediapipe";
const MODEL_URL = "/models/selfie_segmenter.tflite";
const SEGMENT_LONG_SIDE = 1024;

export const backgroundColours = {
  transparent: null,
  white: "#ffffff",
  blue: "#2f6fcb",
  "light-blue": "#a9cdf0",
  red: "#c8102e",
  grey: "#d9d9d9",
};

let segmenter;
function loadSegmenter() {
  if (!segmenter)
    segmenter = (async () => {
      const { FilesetResolver, ImageSegmenter } =
        await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    })().catch((error) => {
      segmenter = null;
      throw Error(
        "The background remover could not load. Check your connection and try again.",
        { cause: error },
      );
    });
  return segmenter;
}

// Mean confidence in the four corner patches. The model's output polarity is
// detected from this because a photo's corners are almost always background.
export function cornerMean(values, width, height) {
  const w = Math.max(1, Math.round(width * 0.1)),
    h = Math.max(1, Math.round(height * 0.1));
  let sum = 0,
    count = 0;
  for (const y0 of [0, height - h])
    for (const x0 of [0, width - w])
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          sum += values[y * width + x];
          count++;
        }
  return sum / count;
}

// Converts model confidence (0–1, person) into 8-bit alpha. `edge` (0–100)
// widens the soft transition; `shift` (-50…50) grows or shrinks the subject.
export function maskToAlpha(values, { edge = 30, shift = 0 } = {}) {
  const centre = Math.min(0.95, Math.max(0.05, 0.5 - shift / 100)),
    half = 0.02 + (Math.min(100, Math.max(0, edge)) / 100) * 0.3,
    low = Math.max(0, centre - half),
    high = Math.min(1, centre + half);
  const alpha = new Uint8ClampedArray(values.length);
  for (let i = 0; i < values.length; i++) {
    const t = Math.min(1, Math.max(0, (values[i] - low) / (high - low)));
    alpha[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return alpha;
}

function scratch(width, height) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

// Returns a new canvas the size of `source` with the background replaced.
export async function removeBackground(source, options = {}, signal) {
  throwIfCancelled(signal);
  const { background = "transparent", edge = 30, shift = 0 } = options;
  if (!Object.hasOwn(backgroundColours, background))
    throw Error("Choose a supported background colour.");
  const scale = Math.min(
    1,
    SEGMENT_LONG_SIDE / Math.max(source.width, source.height),
  );
  const small = scratch(source.width * scale, source.height * scale);
  small.getContext("2d").drawImage(source, 0, 0, small.width, small.height);
  const model = await loadSegmenter();
  await checkpoint(signal);
  const result = model.segment(small);
  let values;
  try {
    const mask = result.confidenceMasks?.[0];
    if (!mask) throw Error("The background remover returned no result.");
    values = Float32Array.from(mask.getAsFloat32Array());
  } finally {
    result.close();
  }
  await checkpoint(signal);
  if (cornerMean(values, small.width, small.height) > 0.5)
    for (let i = 0; i < values.length; i++) values[i] = 1 - values[i];
  const alpha = maskToAlpha(values, { edge, shift });
  const maskSmall = scratch(small.width, small.height),
    maskContext = maskSmall.getContext("2d"),
    pixels = maskContext.createImageData(small.width, small.height);
  for (let i = 0; i < alpha.length; i++) pixels.data[i * 4 + 3] = alpha[i];
  maskContext.putImageData(pixels, 0, 0);
  const output = scratch(source.width, source.height),
    context = output.getContext("2d");
  const cutout = scratch(source.width, source.height),
    cutoutContext = cutout.getContext("2d");
  cutoutContext.drawImage(source, 0, 0);
  cutoutContext.imageSmoothingQuality = "high";
  cutoutContext.globalCompositeOperation = "destination-in";
  cutoutContext.drawImage(maskSmall, 0, 0, cutout.width, cutout.height);
  const fill = backgroundColours[background];
  if (fill) {
    context.fillStyle = fill;
    context.fillRect(0, 0, output.width, output.height);
  }
  context.drawImage(cutout, 0, 0);
  maskSmall.width = maskSmall.height = small.width = small.height = 1;
  cutout.width = cutout.height = 1;
  throwIfCancelled(signal);
  return output;
}
