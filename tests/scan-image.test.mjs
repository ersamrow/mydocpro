import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFilter,
  detectDocumentQuad,
  insetQuad,
  isConvex,
  outputSize,
  warpPerspective,
} from "../src/scan-image.js";

function image(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set([...paint(x, y), 255], (y * width + x) * 4);
  return { data, width, height };
}
const pixel = (img, x, y) =>
  Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3));

test("warp of the full frame reproduces the source", () => {
  const src = image(40, 30, (x, y) => [x * 6, y * 8, 100]);
  const quad = [
    [0, 0],
    [40, 0],
    [40, 30],
    [0, 30],
  ];
  const out = warpPerspective(src, quad, 40, 30);
  for (const [x, y] of [
    [5, 5],
    [20, 15],
    [35, 25],
  ])
    for (let c = 0; c < 3; c++)
      assert.ok(Math.abs(pixel(out, x, y)[c] - pixel(src, x, y)[c]) <= 2);
});

test("warp flattens a skewed page into a rectangle", () => {
  // Left half of the page is black, right half white, drawn as a trapezoid.
  const quad = [
    [30, 20],
    [170, 40],
    [160, 130],
    [20, 150],
  ];
  const src = image(200, 170, (x, y) => {
    const inside = x > 15 && x < 175 && y > 15 && y < 155;
    if (!inside) return [90, 90, 90];
    const t = (x - 25) / 140;
    return t < 0.5 ? [0, 0, 0] : [255, 255, 255];
  });
  const out = warpPerspective(src, quad, 100, 120);
  assert.ok(pixel(out, 15, 60)[0] < 40);
  assert.ok(pixel(out, 85, 60)[0] > 215);
});

test("crossed corners are rejected", () => {
  const bad = [
    [0, 0],
    [10, 10],
    [10, 0],
    [0, 10],
  ];
  assert.equal(isConvex(bad), false);
  assert.throws(() => warpPerspective(image(20, 20, () => [0, 0, 0]), bad, 10, 10), /cross/);
});

test("detectDocumentQuad finds a bright page on a dark table", () => {
  const src = image(240, 180, (x, y) => {
    const inside = x > 40 && x < 200 && y > 30 && y < 150;
    return inside ? [235, 235, 230] : [40, 35, 30];
  });
  const quad = detectDocumentQuad(src);
  assert.ok(quad, "a page should be found");
  const [tl, , br] = quad;
  assert.ok(Math.abs(tl[0] - 41) < 6 && Math.abs(tl[1] - 31) < 6);
  assert.ok(Math.abs(br[0] - 200) < 6 && Math.abs(br[1] - 150) < 6);
});

test("detectDocumentQuad returns null when there is no page", () => {
  assert.equal(detectDocumentQuad(image(200, 150, () => [120, 120, 120])), null);
});

test("outputSize keeps proportions and caps the long side", () => {
  const [w, h] = outputSize(insetQuad(6000, 4000, 0), 2400);
  assert.equal(w, 2400);
  assert.equal(h, 1600);
});

test("filters whiten paper and darken ink", () => {
  const make = () =>
    image(60, 60, (x, y) => (x > 25 && x < 30 ? [40, 40, 50] : [190, 185, 175]));
  for (const mode of ["enhanced", "bw"]) {
    const out = applyFilter(make(), mode);
    assert.ok(pixel(out, 5, 30)[0] > 235, `${mode} paper`);
    assert.ok(pixel(out, 27, 30)[0] < 90, `${mode} ink`);
  }
  assert.deepEqual(pixel(applyFilter(make(), "original"), 5, 30), [190, 185, 175]);
});
