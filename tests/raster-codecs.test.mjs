import test from "node:test";
import assert from "node:assert/strict";
import { encodeRaster } from "../src/raster-output-codecs.js";

function canvas(width, height, rgba) {
  return {
    width, height,
    getContext: () => ({
      getImageData: () => ({ data: Uint8ClampedArray.from(rgba) }),
    }),
  };
}

test("BMP writes padded bottom-up BGR rows and flattens alpha onto white", async () => {
  const source = canvas(1, 2, [255, 0, 0, 255, 0, 0, 255, 0]);
  const result = await encodeRaster(source, "image/bmp");
  const bytes = new Uint8Array(await result.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(result.type, "image/bmp");
  assert.equal(new TextDecoder().decode(bytes.slice(0, 2)), "BM");
  assert.equal(view.getUint32(2, true), 62);
  assert.equal(view.getUint32(10, true), 54);
  assert.equal(view.getUint32(18, true), 1);
  assert.equal(view.getUint32(22, true), 2);
  assert.equal(view.getUint16(28, true), 24);
  assert.deepEqual([...bytes.slice(54)], [255, 255, 255, 0, 0, 0, 255, 0]);
});

test("ICO wraps one transparent PNG at no more than 256 pixels", async () => {
  const originalDocument = globalThis.document;
  let drawn;
  let target;
  globalThis.document = {
    createElement: () => (target = {
      width: 0, height: 0,
      getContext: () => ({ drawImage: (...args) => { drawn = args; } }),
      toBlob: callback => callback(new Blob([Uint8Array.of(137, 80, 78, 71)], { type: "image/png" })),
    }),
  };
  try {
    const source = canvas(800, 400, []);
    const result = await encodeRaster(source, "image/x-icon");
    const bytes = new Uint8Array(await result.arrayBuffer());
    const view = new DataView(bytes.buffer);
    assert.equal(view.getUint16(2, true), 1);
    assert.equal(view.getUint16(4, true), 1);
    assert.deepEqual([...bytes.slice(6, 8)], [0, 0]);
    assert.equal(view.getUint32(14, true), 4);
    assert.equal(view.getUint32(18, true), 22);
    assert.deepEqual(drawn.slice(1), [0, 64, 256, 128]);
    assert.deepEqual([...bytes.slice(22)], [137, 80, 78, 71]);
    assert.equal(target.width, 1, "temporary canvas released");
  } finally {
    globalThis.document = originalDocument;
  }
});

test("GIF writes a single frame with dimensions and a transparent index", async () => {
  const source = canvas(2, 1, [0, 0, 0, 255, 255, 0, 0, 0]);
  const result = await encodeRaster(source, "image/gif");
  const bytes = new Uint8Array(await result.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(result.type, "image/gif");
  assert.equal(new TextDecoder().decode(bytes.slice(0, 6)), "GIF89a");
  assert.equal(view.getUint16(6, true), 2);
  assert.equal(view.getUint16(8, true), 1);
  assert.equal(bytes.at(-1), 0x3b);
  const tableSize = 3 * (2 ** ((bytes[10] & 7) + 1));
  const control = 13 + tableSize;
  assert.deepEqual([...bytes.slice(control, control + 3)], [0x21, 0xf9, 4]);
  assert.equal(bytes[control + 3] & 1, 1);
  assert.equal(bytes[control + 6], 0);
});

test("raster encoders reject oversized output and cancelled jobs", async () => {
  await assert.rejects(encodeRaster(canvas(12001, 1, []), "image/bmp"), /25 megapixels/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(encodeRaster(canvas(1, 1, []), "image/bmp", 1, controller.signal), { name: "AbortError" });
  await assert.rejects(encodeRaster(canvas(1, 1, []), "image/png"), /Choose BMP, ICO or GIF/);
});
