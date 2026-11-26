import test from "node:test";
import assert from "node:assert/strict";
import { cornerMean, maskToAlpha } from "../src/background-removal.js";

test("maskToAlpha is opaque for confident subject and clear for background", () => {
  const alpha = maskToAlpha(new Float32Array([0, 0.1, 0.5, 0.9, 1]), {
    edge: 20,
  });
  assert.equal(alpha[0], 0);
  assert.equal(alpha[1], 0);
  assert.equal(alpha[4], 255);
  assert.equal(alpha[3], 255);
  assert.ok(alpha[2] > 100 && alpha[2] < 155);
});

test("cutout size shifts the transition point", () => {
  const values = new Float32Array([0.4]);
  const grown = maskToAlpha(values, { edge: 0, shift: 30 })[0];
  const shrunk = maskToAlpha(values, { edge: 0, shift: -30 })[0];
  assert.equal(grown, 255);
  assert.equal(shrunk, 0);
});

test("cornerMean detects which polarity the model used", () => {
  const width = 20,
    height = 20,
    values = new Float32Array(width * height);
  for (let y = 5; y < 15; y++)
    for (let x = 5; x < 15; x++) values[y * width + x] = 1;
  assert.equal(cornerMean(values, width, height), 0);
  const inverted = values.map((value) => 1 - value);
  assert.equal(cornerMean(inverted, width, height), 1);
});
