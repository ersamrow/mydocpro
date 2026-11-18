import test from "node:test";
import assert from "node:assert/strict";
import jpeg from "jpeg-js";
import {
  jpegSampling,
  padJpegToBytes,
  setImageDensity,
} from "../src/image-metadata.js";

const pixels = new Uint8Array(140 * 60 * 4);
for (let i = 0; i < pixels.length; i += 4) {
  pixels[i] = pixels[i + 1] = pixels[i + 2] = i % 31 ? 255 : 20;
  pixels[i + 3] = 255;
}
const encoded = jpeg.encode({ data: pixels, width: 140, height: 60 }, 100).data;

test("JPEG COM padding preserves decoded pixels and dimensions across segment boundaries", async () => {
  const source = new Blob([encoded], { type: "image/jpeg" });
  const original = jpeg.decode(encoded, { useTArray: true });
  assert.equal(await jpegSampling(source), "4:4:4");
  for (const target of [11000, 100000, 200000]) {
    const padded = await padJpegToBytes(source, target);
    assert.equal(padded.size, Math.max(target, source.size));
    const decoded = jpeg.decode(new Uint8Array(await padded.arrayBuffer()), {
      useTArray: true,
    });
    assert.equal(decoded.width, 140);
    assert.equal(decoded.height, 60);
    assert.deepEqual(decoded.data, original.data);
  }
});

test("JPEG density records chosen DPI without changing image data", async () => {
  const blob = await setImageDensity(
    new Blob([encoded], { type: "image/jpeg" }),
    300,
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(13, 18)], [1, 1, 44, 1, 44]);
  assert.deepEqual(
    jpeg.decode(bytes, { useTArray: true }).data,
    jpeg.decode(encoded, { useTArray: true }).data,
  );
});
