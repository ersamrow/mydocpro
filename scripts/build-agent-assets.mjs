import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { routeIds, publicPageSeo } from "../src/routes.js";
import { sitePages } from "../src/site-content.js";

const output = new URL("../public/", import.meta.url);
const pages = routeIds.map(publicPageSeo);
const links = pages
  .slice(1)
  .map((page) => `- [${page.name}](${page.url}): ${page.description}`);
const markdown = [
  "# MyDocPro",
  "",
  "> " + pages[0].description,
  "",
  "## Tools and site information",
  "",
  ...links,
  "",
].join("\n");
// Use source history so rebuilding an unchanged site preserves modification dates.
const root = fileURLToPath(new URL("../", import.meta.url));
function contentDate(paths, firstPublished = "2026-11-16") {
  try {
    return (
      execFileSync("git", ["log", "-1", "--format=%cs", "--", ...paths], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || firstPublished
    );
  } catch {
    // Source archives may omit Git history.
    return firstPublished;
  }
}
const shared = ["src/seo.js", "components/Shared.js", "components/Header.js"];
const infoDate = contentDate([
  ...shared,
  "src/site-content.js",
  "components/InformationPage.js",
]);
const toolDate = contentDate([
  ...shared,
  "src/tools.js",
  "src/tool-guides.js",
  "src/tool-guide-details.js",
  "components/Tool*.js*",
  "components/*Workspace.js*",
  "components/Image*.js",
  "components/Pdf*.js",
]);
const homeDate = contentDate([...shared, "components/Home.js", "src/tools.js"]);
const examDate = contentDate(
  [
    "src/data/exams.js",
    "src/exam-seo.js",
    "components/Exam*.js",
    "src/exam-output.js",
  ],
  "2026-11-17",
);
const entries = routeIds.map((id, index) => {
  const date = !id
    ? homeDate
    : Object.hasOwn(sitePages, id)
      ? infoDate
      : id.startsWith("exam-photo/")
        ? examDate
        : toolDate;
  return `  <url><loc>${pages[index].url}</loc><lastmod>${date}</lastmod></url>`;
});
await Promise.all([
  writeFile(new URL("index.md", output), markdown),
  writeFile(new URL("llms.txt", output), markdown),
  writeFile(
    new URL("robots.txt", output),
    "User-agent: *\nContent-Signal: search=yes, ai-train=no\nAllow: /\nSitemap: https://mydocpro.co.in/sitemap.xml\n",
  ),
  writeFile(
    new URL("sitemap.xml", output),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      "</urlset>",
      "",
    ].join("\n"),
  ),
]);
