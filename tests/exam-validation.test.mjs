import test from "node:test";
import assert from "node:assert/strict";
import { exams } from "../src/data/exams.js";
import {
  checkDocument,
  readDensity,
  sniffKind,
  verdict,
} from "../src/exam-validation.js";

const doc = (slug, type) =>
  exams.find((exam) => exam.slug === slug).documents.find((d) => d.type === type);
const status = (checks, id) => checks.find((check) => check.id === id)?.status;

test("a JPG inside the size range passes", () => {
  const checks = checkDocument(doc("neet-ug", "photo"), {
    kind: "jpeg",
    size: 100 * 1024,
    width: 300,
    height: 400,
  });
  assert.equal(status(checks, "format"), "pass");
  assert.equal(status(checks, "size"), "pass");
  assert.equal(verdict(checks), "pass");
});

test("wrong type and oversize files fail with clear details", () => {
  const checks = checkDocument(doc("neet-ug", "photo"), {
    kind: "png",
    size: 500 * 1024,
    width: 300,
    height: 400,
  });
  assert.equal(status(checks, "format"), "fail");
  assert.equal(status(checks, "size"), "fail");
  assert.match(checks[0].detail, /PNG/);
  assert.equal(verdict(checks), "fail");
});

test("files right at a limit warn instead of passing", () => {
  const checks = checkDocument(doc("neet-ug", "photo"), {
    kind: "jpeg",
    size: 199 * 1024,
    width: 300,
    height: 400,
  });
  assert.equal(status(checks, "size"), "warn");
  assert.equal(verdict(checks), "warn");
});

test("preferred dimensions only warn, hard minimums fail", () => {
  const ibps = checkDocument(doc("ibps", "photo"), {
    kind: "jpeg",
    size: 30 * 1024,
    width: 400,
    height: 500,
  });
  assert.equal(status(ibps, "dimensions"), "warn");
  assert.equal(verdict(ibps), "warn");
  const exact = checkDocument(doc("ibps", "photo"), {
    kind: "jpeg",
    size: 30 * 1024,
    width: 200,
    height: 230,
  });
  assert.equal(status(exact, "dimensions"), "pass");
});

test("an exclusive maximum rejects a file exactly at the limit", () => {
  const certificate = doc("rrb-ntpc", "certificate");
  const at = checkDocument(certificate, { kind: "pdf", size: 400 * 1024 });
  assert.equal(status(at, "size"), "fail");
  const under = checkDocument(certificate, { kind: "pdf", size: 200 * 1024 });
  assert.equal(verdict(under), "pass");
});

test("file type is detected from content, not the name", () => {
  assert.equal(sniffKind(Uint8Array.of(255, 216, 255, 224)), "jpeg");
  assert.equal(
    sniffKind(Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)),
    "png",
  );
  assert.equal(sniffKind(new TextEncoder().encode("%PDF-1.7")), "pdf");
  assert.equal(sniffKind(Uint8Array.of(1, 2, 3, 4)), null);
});

test("JFIF and PNG pixel density are read", () => {
  const jfif = new Uint8Array(32);
  jfif.set([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 200, 0, 200]);
  assert.equal(readDensity(jfif, "jpeg"), 200);
  const png = new Uint8Array(64);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer);
  view.setUint32(8, 9);
  png.set([112, 72, 89, 115], 12);
  view.setUint32(16, 7874);
  view.setUint32(20, 7874);
  png[24] = 1;
  assert.equal(readDensity(png, "png"), 200);
});
