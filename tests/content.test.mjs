import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { routeIds } from "../src/routes.js";
import { pageSeo } from "../src/seo.js";
import { guides } from "../src/tool-guides.js";
const root = new URL("../.next/server/pages/", import.meta.url);
test("every page is pre-rendered with unique SEO, content and valid links", async () => {
  const titles = new Set();
  for (const id of routeIds) {
    const html = await readFile(
        new URL((id || "index") + ".html", root),
        "utf8",
      ),
      m = pageSeo(id);
    assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1, id);
    assert.ok(html.includes(`rel="canonical" href="${m.url}"`), id);
    const title = html.match(/<title[^>]*>(.*?)<\/title>/)[1];
    assert.ok(!titles.has(title));
    titles.add(title);
    const schema = JSON.parse(
      html.match(/<script id="site-schema"[^>]*>(.*?)<\/script>/)[1],
    );
    assert.deepEqual(schema, m.schema);
    assert.ok(html.includes(`property="og:url" content="${m.url}"`));
    if (guides[id]) assert.ok(html.includes('aria-label="Tool guidance"'));
    for (const [, href] of html.matchAll(/href="\/([^"#?]*)"/g))
      if (!href.includes(".") && !href.startsWith("_next/"))
        assert.ok(routeIds.includes(href), id + ": " + href);
  }
});
test("React renders interactive controls before hydration and 404 is non-indexable", async () => {
  const html = await readFile(new URL("resize-image.html", root), "utf8");
  assert.match(html, /id="upload"/);
  assert.match(html, /id="width"/);
  assert.match(html, /id="process"/);
  const contact = await readFile(new URL("contact.html", root), "utf8");
  assert.match(contact, /action="\/api\/contact"/);
  assert.match(contact, /name="message"/);
  const missing = await readFile(new URL("404.html", root), "utf8");
  assert.match(missing, /noindex/);
  assert.ok(!missing.includes('id="site-schema"'));
  for (const id of ["404", "constructor", "__proto__"])
    assert.equal(pageSeo(id).known, false);
});
test("sitemap covers every public route", async () => {
  const xml = await readFile(
    new URL("../public/sitemap.xml", import.meta.url),
    "utf8",
  );
  assert.equal([...xml.matchAll(/<loc>/g)].length, routeIds.length);
  for (const id of routeIds)
    assert.ok(xml.includes(`https://mydocpro.co.in/${id}</loc>`));
});
