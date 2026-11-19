import test from "node:test";
import assert from "node:assert/strict";
import { whitenConnectedBackground } from "../src/image-processing.js";

function fixture(paint) {
  const width = 100,
    height = 100;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set([...paint(x, y), 255], (y * width + x) * 4);
  let writes = 0;
  return {
    canvas: {
      width,
      height,
      getContext: () => ({
        getImageData: () => ({ data }),
        putImageData: () => {
          writes++;
        },
      }),
    },
    pixel: (x, y) =>
      Array.from(data.slice((y * width + x) * 4, (y * width + x) * 4 + 3)),
    writes: () => writes,
  };
}

test("dominant border background whitens when hair and skin touch photo edges", async () => {
  const f = fixture((x, y) =>
    y < 10 ? [30, 25, 20] : y >= 90 ? [190, 140, 100] : [80, 130, 180],
  );
  await whitenConnectedBackground(f.canvas, 35);
  assert.deepEqual(f.pixel(50, 50), [255, 255, 255]);
  assert.deepEqual(f.pixel(50, 5), [30, 25, 20]);
  assert.deepEqual(f.pixel(50, 95), [190, 140, 100]);
});

test("enclosed pale subject details retain their original colour", async () => {
  const f = fixture((x, y) =>
    x >= 25 && x < 75 && y >= 20 && y < 80
      ? x >= 35 && x < 65 && y >= 30 && y < 50
        ? [220, 220, 220]
        : [30, 30, 30]
      : [220, 220, 220],
  );
  await whitenConnectedBackground(f.canvas, 35);
  assert.deepEqual(f.pixel(0, 0), [255, 255, 255]);
  assert.deepEqual(f.pixel(30, 60), [30, 30, 30]);
  assert.deepEqual(f.pixel(50, 40), [220, 220, 220]);
});

test("higher tolerance includes a connected shadow without changing dark details", async () => {
  const paint = (x, y) =>
    x >= 35 && x < 65 && y >= 35 && y < 65
      ? [30, 30, 30]
      : x >= 15 && x < 85 && y < 30
        ? [195, 195, 195]
        : [220, 220, 220];
  const gentle = fixture(paint),
    balanced = fixture(paint);
  await whitenConnectedBackground(gentle.canvas, 15);
  await whitenConnectedBackground(balanced.canvas, 35);
  assert.deepEqual(gentle.pixel(50, 15), [195, 195, 195]);
  assert.deepEqual(balanced.pixel(50, 15), [255, 255, 255]);
  assert.deepEqual(balanced.pixel(50, 50), [30, 30, 30]);
});

test("already cancelled whitening rejects before modifying the canvas", async () => {
  const f = fixture(() => [220, 220, 220]);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    whitenConnectedBackground(f.canvas, 0, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(f.writes(), 0);
});

test("almost identical border colours are not split into separate background clusters", async () => {
  const f = fixture((x, y) => {
    const gray = y >= 70 ? 30 : 223 + ((x + y) % 2);
    return [gray, gray, gray];
  });
  await whitenConnectedBackground(f.canvas, 35);
  assert.deepEqual(f.pixel(50, 30), [255, 255, 255]);
  assert.deepEqual(f.pixel(50, 80), [30, 30, 30]);
});
