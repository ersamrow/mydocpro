import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { routeIds } from "../src/routes.js";
import {
  createPayload,
  submitPayload,
  indexNowEndpoint,
  keyLocation,
} from "../scripts/indexnow.mjs";

const key = "indexnow-test-key-123456";

test("IndexNow includes current canonical routes and deduplicates changed pages", () => {
  const all = createPayload(key);
  assert.equal(all.host, "mydocpro.co.in");
  assert.equal(all.keyLocation, keyLocation);
  assert.equal(all.urlList.length, routeIds.length);
  assert.ok(all.urlList.includes("https://mydocpro.co.in/"));
  assert.ok(all.urlList.includes("https://mydocpro.co.in/exam-photo/ssc"));
  assert.deepEqual(
    createPayload(key, ["/contact", "https://mydocpro.co.in/contact", "/help"])
      .urlList,
    ["https://mydocpro.co.in/contact", "https://mydocpro.co.in/help"],
  );
});

test("IndexNow rejects invalid keys, external URLs, noncanonical URLs and private endpoints", () => {
  for (const invalid of ["short", "a".repeat(129), "key with spaces"])
    assert.throws(() => createPayload(invalid), /IndexNow key/);
  for (const url of [
    "https://other.example/",
    "http://mydocpro.co.in/",
    "/contact/",
    "/help#download",
    "/compress-image?kb=20",
    "/api/contact",
    "/missing",
    "/ads.txt",
  ])
    assert.throws(() => createPayload(key, [url]), /Not a public canonical/);
});

test("missing or mismatched live verification file prevents any POST", async () => {
  for (const response of [
    new Response("missing", { status: 404 }),
    new Response("wrong-key"),
  ]) {
    const calls = [];
    await assert.rejects(
      submitPayload(createPayload(key), async (...args) => {
        calls.push(args);
        return response;
      }),
      /Deploy public\/mydocpro-indexnow.txt first/,
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], keyLocation);
    assert.equal(calls[0][1].redirect, "error");
    assert.ok(calls[0][1].signal instanceof AbortSignal);
  }
});

test("verified IndexNow submissions send expected JSON and distinguish receipt statuses", async () => {
  for (const status of [200, 202]) {
    const payload = createPayload(key, ["/contact"]),
      calls = [];
    assert.equal(
      await submitPayload(payload, async (url, options) => {
        calls.push({ url, options });
        return calls.length === 1
          ? new Response(key + "\n")
          : new Response("", { status });
      }),
      status,
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, indexNowEndpoint);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(calls[1].options.redirect, "error");
    assert.equal(
      calls[1].options.headers["Content-Type"],
      "application/json; charset=utf-8",
    );
    assert.deepEqual(JSON.parse(calls[1].options.body), payload);
  }
});

test("IndexNow failures surface without repeated submissions", async () => {
  let calls = 0;
  await assert.rejects(
    submitPayload(createPayload(key), async () => {
      calls++;
      return calls === 1
        ? new Response(key)
        : new Response("", { status: 429 });
    }),
    /HTTP 429/,
  );
  assert.equal(calls, 2);
});

test("checked-in verification key is valid and CLI defaults to a dry run", async () => {
  const realKey = (
    await readFile(
      new URL("../public/mydocpro-indexnow.txt", import.meta.url),
      "utf8",
    )
  ).trim();
  assert.match(realKey, /^[a-f0-9]{32}$/);
  const output = execFileSync(
    process.execPath,
    ["scripts/indexnow.mjs", "/contact", "/help", "/updates"],
    {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
    },
  );
  assert.match(output, /^DRY RUN: no network requests or submissions/);
  const payload = JSON.parse(output.slice(output.indexOf("{")));
  assert.deepEqual(
    payload,
    createPayload(realKey, ["/contact", "/help", "/updates"]),
  );
});
