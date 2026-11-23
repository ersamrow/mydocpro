import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routeIds, publicPageSeo } from "../src/routes.js";
import { siteOrigin } from "../src/seo.js";

export const indexNowEndpoint = "https://api.indexnow.org/indexnow";
export const keyLocation = siteOrigin + "/mydocpro-indexnow.txt";
const publicUrls = new Set(
  routeIds
    .map(publicPageSeo)
    .filter((page) => page.known && !page.robots.split(",").includes("noindex"))
    .map((page) => page.url),
);

export function createPayload(key, urls = []) {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key))
    throw Error("IndexNow key must contain 8–128 letters, numbers or dashes.");
  const urlList = [
    ...new Set(
      urls.length
        ? urls.map((url) => {
            const canonical = new URL(url, siteOrigin + "/").href;
            if (!publicUrls.has(canonical))
              throw Error(`Not a public canonical MyDocPro URL: ${url}`);
            return canonical;
          })
        : publicUrls,
    ),
  ];
  if (!urlList.length || urlList.length > 10000)
    throw Error("Submit between 1 and 10,000 public URLs per request.");
  return { host: new URL(siteOrigin).host, key, keyLocation, urlList };
}

export async function submitPayload(payload, fetchImpl = fetch) {
  const verification = await fetchImpl(payload.keyLocation, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (
    verification.status !== 200 ||
    (await verification.text()).trim() !== payload.key
  )
    throw Error(
      "Deploy public/mydocpro-indexnow.txt first: the live key file is missing or does not match. No URLs were submitted.",
    );
  const response = await fetchImpl(indexNowEndpoint, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (response.status !== 200 && response.status !== 202)
    throw Error(
      `IndexNow returned HTTP ${response.status}. Check the key, URL list and service limits before retrying.`,
    );
  return response.status;
}

async function main(args) {
  if (args.includes("--help")) {
    console.log(
      "Preview all public URLs: npm run indexnow\nPreview changed URLs: npm run indexnow -- /contact /help /updates\nSubmit after deployment: npm run indexnow -- --submit /contact /help /updates\nInitial full submission: npm run indexnow -- --all --submit",
    );
    return;
  }
  const unknown = args.find(
    (arg) => arg.startsWith("--") && !["--all", "--submit"].includes(arg),
  );
  if (unknown) throw Error(`Unknown option: ${unknown}`);
  const urls = args.filter((arg) => !arg.startsWith("--"));
  if (args.includes("--all") && urls.length)
    throw Error("Use --all or a list of changed URLs, not both.");
  const key = (
    await readFile(
      new URL("../public/mydocpro-indexnow.txt", import.meta.url),
      "utf8",
    )
  ).trim();
  const payload = createPayload(key, urls);
  if (!args.includes("--submit")) {
    console.log(
      "DRY RUN: no network requests or submissions. Deploy first, then add --submit.",
    );
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const status = await submitPayload(payload);
  console.log(
    `${payload.urlList.length} URLs received by IndexNow (HTTP ${status}). ${status === 202 ? "Key validation is pending. " : ""}Receipt does not guarantee crawling or indexing.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
