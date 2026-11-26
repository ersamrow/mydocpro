// Pure pixel helpers for the document scanner. Images are plain
// { data: Uint8ClampedArray (RGBA), width, height } so they run in Node tests.

// Corners are [tl, tr, br, bl] as [x, y] pairs in source pixels.

function solve(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

// Homography taking the output rectangle (0,0)-(w,h) onto the source quad.
export function homography(quad, width, height) {
  const from = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const matrix = [],
    vector = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i],
      [u, v] = quad[i];
    matrix.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    vector.push(v);
  }
  const h = solve(matrix, vector);
  if (!h) throw Error("The selected corners do not form a valid page shape.");
  return h;
}

export function quadArea(quad) {
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = quad[i],
      [x2, y2] = quad[(i + 1) % 4];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function isConvex(quad) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = quad[i],
      [bx, by] = quad[(i + 1) % 4],
      [cx, cy] = quad[(i + 2) % 4];
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (cross === 0) return false;
    if (!sign) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

export function outputSize(quad, maxSide = 2400) {
  const d = (a, b) => Math.hypot(quad[a][0] - quad[b][0], quad[a][1] - quad[b][1]);
  let w = Math.max(d(0, 1), d(3, 2)),
    h = Math.max(d(0, 3), d(1, 2));
  const scale = Math.min(1, maxSide / Math.max(w, h, 1));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

export function warpPerspective(src, quad, outWidth, outHeight) {
  if (!isConvex(quad)) throw Error("The corners cross over. Drag them back to the page corners.");
  const h = homography(quad, outWidth, outHeight);
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  const { data, width, height } = src;
  for (let y = 0; y < outHeight; y++)
    for (let x = 0; x < outWidth; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      const w = h[6] * px + h[7] * py + 1;
      const u = (h[0] * px + h[1] * py + h[2]) / w - 0.5,
        v = (h[3] * px + h[4] * py + h[5]) / w - 0.5;
      const x0 = Math.floor(u),
        y0 = Math.floor(v),
        fx = u - x0,
        fy = v - y0;
      const at = (cx, cy) =>
        (Math.min(height - 1, Math.max(0, cy)) * width +
          Math.min(width - 1, Math.max(0, cx))) *
        4;
      const i00 = at(x0, y0),
        i10 = at(x0 + 1, y0),
        i01 = at(x0, y0 + 1),
        i11 = at(x0 + 1, y0 + 1),
        o = (y * outWidth + x) * 4;
      for (let c = 0; c < 3; c++)
        out[o + c] =
          data[i00 + c] * (1 - fx) * (1 - fy) +
          data[i10 + c] * fx * (1 - fy) +
          data[i01 + c] * (1 - fx) * fy +
          data[i11 + c] * fx * fy;
      out[o + 3] = 255;
    }
  return { data: out, width: outWidth, height: outHeight };
}

const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

export function otsu(histogram, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0,
    weightB = 0,
    best = 0,
    threshold = 128;
  for (let t = 0; t < 256; t++) {
    weightB += histogram[t];
    if (!weightB) continue;
    const weightF = total - weightB;
    if (!weightF) break;
    sumB += t * histogram[t];
    const between =
      weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

// Finds the largest bright region (the paper) and returns its four extreme
// corners, or null when nothing page-like is found.
export function detectDocumentQuad(src) {
  const { data, width, height } = src;
  const step = Math.max(1, Math.ceil(Math.max(width, height) / 160));
  const w = Math.floor(width / step),
    h = Math.floor(height / step);
  if (w < 8 || h < 8) return null;
  const gray = new Uint8Array(w * h),
    histogram = new Array(256).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0,
        n = 0;
      for (let dy = 0; dy < step; dy += Math.max(1, step >> 1))
        for (let dx = 0; dx < step; dx += Math.max(1, step >> 1)) {
          sum += luma(data, ((y * step + dy) * width + x * step + dx) * 4);
          n++;
        }
      gray[y * w + x] = Math.round(sum / n);
      histogram[gray[y * w + x]]++;
    }
  const threshold = otsu(histogram, w * h);
  const paper = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) paper[i] = gray[i] > threshold ? 1 : 0;
  const label = new Int32Array(w * h);
  let bestId = 0,
    bestSize = 0,
    nextId = 0;
  const stack = [];
  for (let start = 0; start < paper.length; start++) {
    if (!paper[start] || label[start]) continue;
    const id = ++nextId;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const index = stack.pop(),
        x = index % w;
      size++;
      for (const next of [
        x > 0 ? index - 1 : -1,
        x < w - 1 ? index + 1 : -1,
        index >= w ? index - w : -1,
        index < w * h - w ? index + w : -1,
      ])
        if (next >= 0 && paper[next] && !label[next]) {
          label[next] = id;
          stack.push(next);
        }
    }
    if (size > bestSize) {
      bestSize = size;
      bestId = id;
    }
  }
  const fraction = bestSize / (w * h);
  if (fraction < 0.15 || fraction > 0.97) return null;
  let tl = null,
    tr = null,
    br = null,
    bl = null;
  const score = { tl: Infinity, tr: -Infinity, br: -Infinity, bl: Infinity };
  for (let i = 0; i < label.length; i++) {
    if (label[i] !== bestId) continue;
    const x = i % w,
      y = (i / w) | 0,
      s = x + y,
      d = x - y;
    if (s < score.tl) ((score.tl = s), (tl = [x, y]));
    if (d > score.tr) ((score.tr = d), (tr = [x, y]));
    if (s > score.br) ((score.br = s), (br = [x, y]));
    if (d < score.bl) ((score.bl = d), (bl = [x, y]));
  }
  // Cell centres, so the crop sits just inside the paper rather than
  // including a sliver of the table behind it.
  const quad = [tl, tr, br, bl].map(([x, y]) => [
    Math.min(width, Math.max(0, (x + 0.5) * step)),
    Math.min(height, Math.max(0, (y + 0.5) * step)),
  ]);
  if (!isConvex(quad) || quadArea(quad) < width * height * 0.15) return null;
  return quad;
}

export function insetQuad(width, height, fraction = 0.05) {
  const x = width * fraction,
    y = height * fraction;
  return [
    [x, y],
    [width - x, y],
    [width - x, height - y],
    [x, height - y],
  ];
}

// Evens out shadows by dividing each pixel by a local estimate of the paper
// brightness (block maxima, bilinearly interpolated).
export function flattenIllumination(img) {
  const { data, width, height } = img;
  const cells = 24,
    bw = Math.max(1, Math.ceil(width / cells)),
    bh = Math.max(1, Math.ceil(height / cells)),
    gw = Math.ceil(width / bw),
    gh = Math.ceil(height / bh);
  const bg = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      const values = [];
      for (let y = gy * bh; y < Math.min(height, (gy + 1) * bh); y += 2)
        for (let x = gx * bw; x < Math.min(width, (gx + 1) * bw); x += 2)
          values.push(luma(data, (y * width + x) * 4));
      values.sort((a, b) => a - b);
      bg[gy * gw + gx] = values[Math.floor(values.length * 0.9)] || 255;
    }
  const sample = (fx, fy) => {
    const x = Math.min(gw - 1, Math.max(0, fx)),
      y = Math.min(gh - 1, Math.max(0, fy)),
      x0 = Math.floor(x),
      y0 = Math.floor(y),
      x1 = Math.min(gw - 1, x0 + 1),
      y1 = Math.min(gh - 1, y0 + 1),
      tx = x - x0,
      ty = y - y0;
    return (
      bg[y0 * gw + x0] * (1 - tx) * (1 - ty) +
      bg[y0 * gw + x1] * tx * (1 - ty) +
      bg[y1 * gw + x0] * (1 - tx) * ty +
      bg[y1 * gw + x1] * tx * ty
    );
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const paper = Math.max(40, sample(x / bw - 0.5, y / bh - 0.5)),
        gain = 255 / paper,
        i = (y * width + x) * 4;
      data[i] *= gain;
      data[i + 1] *= gain;
      data[i + 2] *= gain;
    }
  return img;
}

export function applyFilter(img, mode) {
  if (mode === "original") return img;
  flattenIllumination(img);
  const { data } = img,
    histogram = new Array(256).fill(0);
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4)
    histogram[Math.round(luma(data, i))]++;
  if (mode === "bw") {
    const t = Math.min(200, Math.max(90, otsu(histogram, total) + 8));
    for (let i = 0; i < data.length; i += 4) {
      const x = Math.min(1, Math.max(0, (luma(data, i) - (t - 25)) / 35));
      data[i] = data[i + 1] = data[i + 2] = x * x * (3 - 2 * x) * 255;
    }
    return img;
  }
  // Enhanced colour: stretch levels so paper is white and ink is deep.
  let seen = 0,
    low = 0,
    high = 255;
  for (let v = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen >= total * 0.01) {
      low = v;
      break;
    }
  }
  seen = 0;
  for (let v = 255; v >= 0; v--) {
    seen += histogram[v];
    if (seen >= total * 0.2) {
      high = v;
      break;
    }
  }
  high = Math.max(high, low + 40);
  const range = high - low;
  for (let i = 0; i < data.length; i += 4)
    for (let c = 0; c < 3; c++)
      data[i + c] = ((data[i + c] - low) / range) * 255;
  return img;
}
