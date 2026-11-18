import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const node = process.execPath;
const next = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const playwright = fileURLToPath(
  new URL("../node_modules/playwright/cli.js", import.meta.url),
);
const rows = [];
let environment = { ...process.env };
if (!environment.CHROME_PATH && process.platform === "win32")
  environment.CHROME_PATH =
    "C:/Program Files/Google/Chrome/Application/chrome.exe";

async function check(name, args) {
  const started = Date.now();
  console.log(`\nChecking ${name}…`);
  await new Promise((resolve, reject) => {
    const child = spawn(node, args, {
      cwd: root,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      rows.push({
        name,
        passed: code === 0,
        seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
      });
      code === 0 ? resolve() : reject(Error(`${name} failed (exit ${code}).`));
    });
  });
}

async function freePort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

let server, log;
try {
  await mkdir(new URL("../ui-audit/checks/", import.meta.url), {
    recursive: true,
  });
  for (const file of [
    "src/processing.js",
    "src/tool-settings.js",
    "server/contact.js",
  ])
    await check(`syntax ${file}`, ["--check", file]);
  await check("prepare production assets", ["scripts/prepare-next.mjs"]);
  await check("production build", [next, "build", "--webpack"]);
  await check("offline assets", ["scripts/build-pwa.mjs"]);
  const tests = (await readdir(new URL("../tests/", import.meta.url)))
    .filter((file) => file.endsWith(".test.mjs"))
    .map((file) => `tests/${file}`);
  await check("unit and generated-content tests", ["--test", ...tests]);

  const port = await freePort();
  environment.TEST_URL = `http://127.0.0.1:${port}`;
  log = createWriteStream(
    new URL("../ui-audit/checks/server.log", import.meta.url),
  );
  server = spawn(
    node,
    [next, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: environment,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.pipe(log, { end: false });
  server.stderr.pipe(log, { end: false });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Production server did not become ready.")),
      30000,
    );
    server.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(Error(`Production server exited (${code}).`));
    });
    const ready = (data) => {
      if (data.toString().includes("Ready in")) {
        clearTimeout(timer);
        server.stdout.off("data", ready);
        resolve();
      }
    };
    server.stdout.on("data", ready);
  });
  for (const file of [
    "pdf-previews",
    "next",
    "all-tools",
    "ui",
    "workflow",
    "combined",
    "pdf-workbench",
    "productivity",
  ])
    await check(`${file} browser`, [`tests/${file}.browser.cjs`]);
  await check("desktop and mobile visual regressions", [
    playwright,
    "test",
    "--config",
    "playwright.visual.config.cjs",
  ]);
  console.log("\nAll checks passed.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server?.kill();
  log?.end();
  await writeFile(
    new URL("../ui-audit/checks/results.json", import.meta.url),
    JSON.stringify(
      { checkedAt: new Date().toISOString(), rows, passed: !process.exitCode },
      null,
      2,
    ),
  );
}
