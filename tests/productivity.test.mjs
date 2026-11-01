import test from "node:test";
import assert from "node:assert/strict";
import { zipOutputs } from "../src/zip.js";
import { checkpoint } from "../src/file-validation.js";
test("ZIP preserves file bytes, UTF-8 names, checksums and duplicate names", async () => {
  const zip = await zipOutputs([
    { name: "é.txt", blob: new Blob(["123456789"]) },
    { name: "é.txt", blob: new Blob(["second"]) },
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer()),
    v = new DataView(bytes.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(14, true), 0xcbf43926);
  const n = v.getUint16(26, true);
  assert.equal(new TextDecoder().decode(bytes.slice(30, 30 + n)), "é.txt");
  assert.equal(
    new TextDecoder().decode(bytes.slice(30 + n, 30 + n + 9)),
    "123456789",
  );
  const end = bytes.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  assert.equal(v.getUint16(end + 10, true), 2);
  assert.ok(new TextDecoder().decode(bytes).includes("2-é.txt"));
});
test("Cancelled checkpoints reject before continuing processing", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(checkpoint(controller.signal), { name: "AbortError" });
});
