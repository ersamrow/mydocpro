import test from "node:test";
import assert from "node:assert/strict";
import jpeg from "jpeg-js";
import {
  jpegSampling,
  jpegWithRgbProfile,
  padJpegToBytes,
  setImageDensity,
} from "../src/image-metadata.js";

const pixels = new Uint8Array(140 * 60 * 4);
for (let i = 0; i < pixels.length; i += 4) {
  pixels[i] = pixels[i + 1] = pixels[i + 2] = i % 31 ? 255 : 20;
  pixels[i + 3] = 255;
}
const encoded = jpeg.encode({ data: pixels, width: 140, height: 60 }, 100).data;

// Synthetic profile bytes exercise transport; browser tests verify colour decoding.
function rgbProfile(length = 132) {
  const bytes = Uint8Array.from({ length }, (_, index) => index % 251);
  new DataView(bytes.buffer).setUint32(0, length);
  bytes.set(new TextEncoder().encode("RGB "), 16);
  bytes.set(new TextEncoder().encode("acsp"), 36);
  return bytes;
}

function jpegHeaders(bytes) {
  const headers = [];
  let offset = 2;
  while (bytes[offset + 1] !== 0xda && bytes[offset + 1] !== 0xd9) {
    assert.equal(bytes[offset], 0xff);
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    assert.ok(length >= 2 && offset + length + 2 <= bytes.length);
    headers.push({
      marker: bytes[offset + 1],
      data: bytes.subarray(offset + 4, offset + length + 2),
      raw: bytes.subarray(offset, offset + length + 2),
    });
    offset += length + 2;
  }
  return { headers, scan: bytes.subarray(offset) };
}

const isIcc = ({ marker, data }) =>
  marker === 0xe2 &&
  new TextDecoder().decode(data.subarray(0, 12)) === "ICC_PROFILE\0";

test("JPEG ICC segments round-trip profile bytes at APP2 boundaries without changing image data", async () => {
  const original = jpegHeaders(encoded);
  for (const length of [132, 65519, 65520, 131038, 131039]) {
    // Exercise a view with a nonzero byte offset, as a PDF decoder may return.
    const storage = new Uint8Array(length + 7);
    storage.set(rgbProfile(length), 7);
    const profile = storage.subarray(7);
    const blob = jpegWithRgbProfile(encoded, profile);
    assert.equal(blob.type, "image/jpeg");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { headers, scan } = jpegHeaders(bytes);
    const chunks = headers.filter(isIcc);
    assert.equal(chunks.length, Math.ceil(length / 65519));
    for (const [index, { data }] of chunks.entries()) {
      assert.equal(data[12], index + 1);
      assert.equal(data[13], chunks.length);
      assert.ok(data.length <= 65533);
    }
    assert.deepEqual(
      Buffer.concat(chunks.map(({ data }) => data.subarray(14))),
      Buffer.from(profile),
    );
    assert.deepEqual(scan, new Uint8Array(original.scan));
    assert.deepEqual(
      headers.filter((header) => !isIcc(header)).map(({ raw }) => raw),
      original.headers.map(({ raw }) => new Uint8Array(raw)),
    );
    assert.deepEqual(
      jpeg.decode(bytes, { useTArray: true }).data,
      jpeg.decode(encoded, { useTArray: true }).data,
    );
  }
});

test("PDF ICC profile replaces all embedded ICC chunks and retains unrelated APP2 metadata", async () => {
  const unrelated = Uint8Array.of(255, 226, 0, 6, 77, 80, 70, 0);
  const source = new Uint8Array(
    await new Blob([
      encoded.subarray(0, 2),
      unrelated,
      encoded.subarray(2),
    ]).arrayBuffer(),
  );
  const previous = new Uint8Array(
    await jpegWithRgbProfile(source, rgbProfile(140000)).arrayBuffer(),
  );
  const profile = rgbProfile(536);
  const bytes = new Uint8Array(
    await jpegWithRgbProfile(previous, profile).arrayBuffer(),
  );
  const { headers, scan } = jpegHeaders(bytes);
  const chunks = headers.filter(isIcc);
  assert.equal(chunks.length, 1);
  assert.deepEqual(chunks[0].data.subarray(14), profile);
  assert.deepEqual(
    headers.find(({ marker, data }) => marker === 0xe2 && data[0] === 77).raw,
    unrelated,
  );
  assert.deepEqual(scan, new Uint8Array(jpegHeaders(encoded).scan));
});

test("JPEG ICC insertion rejects truncated, mismatched, non-RGB, and oversized profiles", () => {
  const wrongSignature = rgbProfile();
  wrongSignature[36] = 0;
  const cmyk = rgbProfile();
  cmyk.set(new TextEncoder().encode("CMYK"), 16);
  for (const profile of [
    new Uint8Array(),
    rgbProfile().subarray(0, 127),
    rgbProfile(536).subarray(0, 535),
    wrongSignature,
    cmyk,
    rgbProfile(4 * 1024 * 1024 + 1),
  ]) {
    assert.throws(
      () => jpegWithRgbProfile(encoded, profile),
      /Unsupported RGB colour profile/,
    );
  }
});

test("JPEG ICC insertion rejects broken JPEG headers and non-RGB frame components", () => {
  const gray = new Uint8Array(encoded);
  const frameOffset = gray.findIndex(
    (value, index) => value === 255 && gray[index + 1] === 192,
  );
  assert.ok(frameOffset > 0);
  gray[frameOffset + 9] = 1;
  assert.throws(
    () => jpegWithRgbProfile(gray, rgbProfile()),
    /three colour components/,
  );
  for (const bytes of [new Uint8Array(), encoded.subarray(0, 10)])
    assert.throws(() => jpegWithRgbProfile(bytes, rgbProfile()), /JPG/);
});

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
