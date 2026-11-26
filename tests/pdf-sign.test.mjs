import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import {
  displayToUser,
  displayedSize,
  placement,
  exportSignedPdf,
  keyOutPaper,
} from "../src/pdf-sign.js";

test("displayToUser maps the displayed top-left corner for each rotation", () => {
  // Unrotated 200 × 100 page.
  assert.deepEqual(displayToUser(0, 200, 100, 0, 0), [0, 100]);
  assert.deepEqual(displayToUser(90, 200, 100, 0, 0), [0, 0]);
  assert.deepEqual(displayToUser(180, 200, 100, 0, 0), [200, 0]);
  assert.deepEqual(displayToUser(270, 200, 100, 0, 0), [200, 100]);
});

test("displayToUser maps displayed bottom-right to a user-space corner", () => {
  const corners = [
    [0, 0],
    [200, 0],
    [0, 100],
    [200, 100],
  ];
  for (const r of [0, 90, 180, 270]) {
    const [W, H] = displayedSize(r, 200, 100);
    const [x, y] = displayToUser(r, 200, 100, W, H);
    assert.ok(corners.some(([cx, cy]) => cx === x && cy === y), `rotation ${r}`);
  }
  assert.deepEqual(displayToUser(90, 200, 100, 100, 200), [200, 100]);
});

test("image placement anchors at the displayed bottom-left", () => {
  const item = { type: "signature", x: 10, y: 20, w: 50, h: 20 };
  const at = placement(item, 0, 200, 100);
  assert.deepEqual([at.x, at.y, at.width, at.height], [10, 60, 50, 20]);
});

test("exports text, check and signature onto rotated pages", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 100]).setRotation(degrees(90));
  pdf.addPage([200, 100]);
  const file = new File([await pdf.save()], "in.pdf", {
    type: "application/pdf",
  });
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
  const out = await exportSignedPdf(file, [
    { type: "text", page: 0, x: 10, y: 10, size: 12, text: "Hello" },
    { type: "check", page: 1, x: 20, y: 20, w: 18, h: 18 },
    { type: "signature", page: 1, x: 50, y: 40, w: 40, h: 20, png },
  ]);
  const saved = await PDFDocument.load(await out.arrayBuffer());
  assert.equal(saved.getPageCount(), 2);
  assert.equal(saved.getPage(0).getRotation().angle, 90);
});

test("rejects empty edits and unsupported characters", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const file = new File([await pdf.save()], "in.pdf");
  await assert.rejects(exportSignedPdf(file, []), /Add a signature/);
  await assert.rejects(
    exportSignedPdf(file, [
      { type: "text", page: 0, x: 0, y: 0, size: 12, text: "नमस्ते" },
    ]),
    /Western European/,
  );
});

test("keyOutPaper clears light pixels and keeps ink", () => {
  const data = new Uint8ClampedArray([255, 255, 255, 255, 10, 10, 10, 255]);
  keyOutPaper(data);
  assert.equal(data[3], 0);
  assert.equal(data[7], 255);
});
