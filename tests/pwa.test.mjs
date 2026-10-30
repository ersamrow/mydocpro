import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { routeIds } from "../src/routes.js";
const root = new URL("../", import.meta.url),
  script = await readFile(new URL("public/sw.js", root), "utf8");
function worker({ badAsset, badMime } = {}) {
  let online = true;
  const handlers = {},
    stores = new Map([
      ["other-app", new Map()],
      ["mydocpro-old", new Map()],
    ]);
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (key) => stores.delete(key),
    open: async (key) => {
      if (!stores.has(key)) stores.set(key, new Map());
      const map = stores.get(key);
      return {
        put: async (k, v) => map.set(k, v.clone()),
        match: async (k) => map.get(k)?.clone(),
      };
    },
  };
  class LocalRequest extends Request {
    constructor(url, options) {
      super(new URL(url, "https://example.test"), options);
    }
  }
  async function fetch(request) {
    if (!online) throw Error("Offline");
    const path = decodeURIComponent(
      new URL(
        typeof request === "string" ? request : request.url,
        "https://example.test",
      ).pathname,
    );
    if (path === badAsset)
      return new Response("<html>Sign in</html>", {
        headers: { "content-type": "text/html" },
      });
    let file;
    if (routeIds.includes(path.slice(1)))
      file = ".next/server/pages/" + (path.slice(1) || "index") + ".html";
    else if (path.startsWith("/_next/static/"))
      file = ".next/static/" + path.slice("/_next/static/".length);
    else if (path.startsWith("/_next/data/"))
      file = ".next/server/pages/" + path.split("/").slice(4).join("/");
    else file = "public" + path;
    return new Response(await readFile(new URL(file, root)), {
      headers: {
        "content-type":
          path === badMime
            ? "text/plain"
            : file.endsWith(".html")
              ? "text/html"
              : /\.m?js$/.test(file)
                ? "text/javascript"
                : "application/octet-stream",
      },
    });
  }
  const self = {
    location: { origin: "https://example.test" },
    clients: { claim: async () => {} },
    addEventListener: (type, fn) => (handlers[type] = fn),
  };
  vm.runInNewContext(script, {
    self,
    caches,
    fetch,
    Request: LocalRequest,
    Response,
    URL,
    Set,
    Promise,
    Error,
  });
  return {
    stores,
    offline: () => (online = false),
    event: async (type, extra = {}) => {
      let job, result;
      handlers[type]?.({
        ...extra,
        waitUntil: (p) => (job = p),
        respondWith: (p) => (result = p),
      });
      await job;
      return await result;
    },
  };
}
test("offline cache contains route-specific React HTML, page data and Next chunks", async () => {
  const w = worker();
  await w.event("install");
  await w.event("activate");
  assert.ok(w.stores.has("other-app"));
  assert.ok(!w.stores.has("mydocpro-old"));
  let report;
  await w.event("message", {
    data: { type: "OFFLINE_STATUS" },
    ports: [{ postMessage: (r) => (report = r) }],
  });
  assert.equal(report.ready, true);
  w.offline();
  for (const id of routeIds) {
    const response = await w.event("fetch", {
      request: {
        url: "https://example.test/" + id + "?test=1",
        method: "GET",
        mode: "navigate",
      },
    });
    const html = await response.text();
    const data = JSON.parse(
      html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/)[1],
    );
    assert.equal(data.props.pageProps.id, id);
  }
  const precache = JSON.parse(script.match(/const PRECACHE\s*=\s*(.*);/)[1]);
  assert.ok(precache.some((url) => url.includes("%5B")));
  assert.ok(precache.some((url) => url.startsWith("/_next/data/")));
  for (const url of precache.filter(
    (url) => url.startsWith("/_next/") || url === "/pdf.worker.min.mjs",
  )) {
    const response = await w.event("fetch", {
      request: {
        url: "https://example.test" + url,
        method: "GET",
        mode: "cors",
      },
    });
    assert.ok((await response.arrayBuffer()).byteLength > 0, url);
  }
});
test("contact, user files, ads and unknown routes are excluded", async () => {
  const w = worker();
  await w.event("install");
  for (const url of [
    "/api/contact",
    "/api/contact.php",
    "/private.pdf",
    "/missing",
  ])
    assert.equal(
      await w.event("fetch", {
        request: {
          url: "https://example.test" + url,
          method: "GET",
          mode: "navigate",
        },
      }),
      undefined,
    );
  assert.ok(!script.includes('.php"'));
});
test("bad content or incorrect worker MIME aborts cache installation", async () => {
  for (const config of [
    { badAsset: "/manifest.webmanifest" },
    { badMime: "/pdf.worker.min.mjs" },
  ]) {
    const w = worker(config);
    await assert.rejects(w.event("install"));
    assert.deepEqual([...w.stores.keys()].sort(), [
      "mydocpro-old",
      "other-app",
    ]);
  }
});
