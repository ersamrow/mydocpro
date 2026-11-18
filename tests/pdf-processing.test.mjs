import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import { pageIndices } from "../src/page-indices.js";
import { processPdf } from "../src/pdf-processing.js";

async function sourceFile() {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 10; i++) {
    const page = pdf.addPage([300 + i, 400]);
    page.drawText(`Source page ${i + 1}`);
    if (i === 0) page.setRotation(degrees(90));
  }
  return new File([await pdf.save()], "ten-pages.pdf", {
    type: "application/pdf",
  });
}

test("page ranges preserve descending order and explain missing pages", () => {
  assert.deepEqual(pageIndices("5-2, 10", 10), [4, 3, 2, 1, 9]);
  assert.throws(
    () => pageIndices("15", 10),
    /Page 15 doesn't exist – this PDF has 10 pages/,
  );
  assert.throws(() => pageIndices("15-2", 10), /Page 15 doesn't exist/);
  assert.throws(() => pageIndices("0", 10), /Page numbers start at 1/);
  assert.throws(() => pageIndices("1-999999999", 10), /doesn't exist/);
});

test("split every N preserves page order and the smaller final part", async () => {
  const source = await sourceFile();
  const outputs = [];
  await processPdf(
    "split-pdf",
    [source],
    { pages: "all", mode: "every", every: "3" },
    {
      onOutput: (blob, name) => outputs.push({ blob, name }),
    },
  );
  assert.equal(outputs.length, 4);
  const counts = [];
  const widths = [];
  for (const output of outputs) {
    const pdf = await PDFDocument.load(await output.blob.arrayBuffer());
    counts.push(pdf.getPageCount());
    widths.push(...pdf.getPages().map((page) => page.getWidth()));
  }
  assert.deepEqual(counts, [3, 3, 3, 1]);
  assert.deepEqual(
    widths,
    Array.from({ length: 10 }, (_, i) => 300 + i),
  );
  assert.equal(outputs[3].name, "ten-pages_part-4.pdf");
});

test("organize applies individual rotations on top of existing and global rotation", async () => {
  let result;
  await processPdf(
    "organize-pdf",
    [await sourceFile()],
    {
      pages: "3-1",
      rotation: "90",
      pageRotations: { 0: 90, 2: 180 },
    },
    {
      onOutput: (blob) => {
        result = blob;
      },
    },
  );
  const pdf = await PDFDocument.load(await result.arrayBuffer());
  assert.deepEqual(
    pdf.getPages().map((page) => page.getWidth()),
    [302, 301, 300],
  );
  assert.deepEqual(
    pdf.getPages().map((page) => page.getRotation().angle),
    [270, 90, 270],
  );
});

test("already-small PDFs produce no download", async () => {
  let emitted = false;
  const result = await processPdf(
    "compress-pdf",
    [await sourceFile()],
    { target: "100" },
    {
      onOutput: () => {
        emitted = true;
      },
    },
  );
  assert.equal(emitted, false);
  assert.equal(result.skipped, true);
  assert.match(result.message, /already small/);
});

test("split rejects fractional N and cancellation before emitting a file", async () => {
  const source = await sourceFile();
  const options = { onOutput: () => assert.fail("Unexpected output") };
  await assert.rejects(
    processPdf(
      "split-pdf",
      [source],
      { pages: "all", mode: "every", every: "1.5" },
      options,
    ),
    /whole number/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    processPdf(
      "split-pdf",
      [source],
      { pages: "all", mode: "each" },
      { ...options, signal: controller.signal },
    ),
    { name: "AbortError" },
  );
});
