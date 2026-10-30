import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { routeIds } from "../src/routes.js";
async function walk(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory())
      files.push(
        ...(await walk(
          new URL(entry.name + "/", root),
          prefix + entry.name + "/",
        )),
      );
    else if (!entry.name.endsWith(".map") && entry.name !== "sw.js")
      files.push(prefix + entry.name);
  }
  return files.sort();
}
const root = new URL("../", import.meta.url),
  hash = createHash("sha256"),
  build = (await readFile(new URL(".next/BUILD_ID", root), "utf8")).trim();
const assets = [];
for (const [folder, url] of [
  ["public/", "/"],
  [".next/static/", "/_next/static/"],
])
  for (const file of await walk(new URL(folder, root))) {
    assets.push(url + file.split("/").map(encodeURIComponent).join("/"));
    hash.update(await readFile(new URL(folder + file, root)));
  }
const routes = routeIds.map((id) => "/" + id);
const data = routeIds.map((id) => `/_next/data/${build}/${id || "index"}.json`);
const paths = [...routes, ...data, ...assets];
for (const id of routeIds)
  hash.update(
    await readFile(
      new URL(".next/server/pages/" + (id || "index") + ".html", root),
    ),
  );
const template = await readFile(
  new URL("scripts/sw-template.js", root),
  "utf8",
);
hash.update(template).update(JSON.stringify(paths));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  new URL("public/sw.js", root),
  template
    .replace("__CACHE_NAME__", JSON.stringify("mydocpro-" + version))
    .replace("__PRECACHE__", JSON.stringify(paths))
    .replace("__ROUTES__", JSON.stringify(routes)),
);
await writeFile(
  new URL("public/sitemap.xml", root),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    routes
      .map((path) => `<url><loc>https://mydocpro.co.in${path}</loc></url>`)
      .join("") +
    "</urlset>",
);
await writeFile(
  new URL("public/robots.txt", root),
  "User-agent: *\nAllow: /\nSitemap: https://mydocpro.co.in/sitemap.xml\n",
);
console.log(
  `PWA: ${paths.length} routes, page data and assets cached (${version}).`,
);
