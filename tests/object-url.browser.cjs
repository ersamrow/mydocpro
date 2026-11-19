const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { webpack } = require("next/dist/compiled/webpack/webpack");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve(__dirname, "..");
  const output = path.join(root, "ui-audit", "object-url");
  await fs.mkdir(output, { recursive: true });
  const entry = path.join(output, "probe.cjs");
  await fs.writeFile(
    entry,
    `
    const React = require("react");
    const { createRoot } = require("react-dom/client");
    const { useObjectUrl } = require(${JSON.stringify(path.join(root, "components/useObjectUrl.js"))});
    window.renderedUrls = [];
    window.revokedUrls = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = url => { window.revokedUrls.push(url); revoke(url); };
    window.firstBlob = new Blob([new Uint8Array(1024 * 1024)], { type: "application/pdf" });
    window.secondBlob = new Blob(["replacement"], { type: "application/pdf" });
    function Probe() {
      const [blob, setBlob] = React.useState(null);
      window.changeBlob = setBlob;
      const url = useObjectUrl(blob);
      window.renderedUrls.push(url);
      return React.createElement("output", { id: "url" }, url);
    }
    window.Probe = Probe;
    window.readResource = () => {
      function find(node) {
        if (!node) return;
        if (node.type === Probe) return node;
        return find(node.child) || find(node.sibling);
      }
      return find(window.fiberRoot.current).memoizedState.next.memoizedState;
    };
    const tree = createRoot(document.getElementById("root"));
    window.unmountProbe = () => tree.unmount();
    tree.render(React.createElement(React.StrictMode, null, React.createElement(Probe)));
  `,
  );
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "development",
      devtool: false,
      target: "web",
      entry,
      output: { path: output, filename: "probe.bundle.js" },
      resolve: { modules: [path.join(root, "node_modules")] },
    });
    compiler.run((error, stats) =>
      compiler.close(() => {
        if (error) reject(error);
        else if (stats.hasErrors())
          reject(Error(stats.toString({ all: false, errors: true })));
        else resolve();
      }),
    );
  });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.evaluate(() => {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        inject: () => 1,
        onCommitFiberRoot: (_, root) => {
          window.fiberRoot = root;
        },
        onCommitFiberUnmount: () => {},
      };
    });
    await page.addScriptTag({ path: path.join(output, "probe.bundle.js") });
    await page.waitForFunction(
      () => window.changeBlob && window.readResource() === null,
    );
    const set = async (key) => {
      await page.evaluate(
        (key) => window.changeBlob(key ? window[key] : null),
        key,
      );
      await page.waitForFunction(
        (key) =>
          key
            ? window.readResource()?.blob === window[key] &&
              !!document.querySelector("#url").textContent
            : window.readResource() === null &&
              document.querySelector("#url").textContent === "",
        key,
      );
      return page.locator("#url").textContent();
    };
    const first = await set("firstBlob");
    await set(null);
    assert.ok(
      await page.evaluate((url) => window.revokedUrls.includes(url), first),
    );
    assert.equal(await page.evaluate(() => window.readResource()), null);
    const start = await page.evaluate(() => window.renderedUrls.length);
    const reused = await set("firstBlob");
    assert.notEqual(reused, first);
    assert.ok(
      await page.evaluate(
        ({ start, first }) => !window.renderedUrls.slice(start).includes(first),
        { start, first },
      ),
    );
    const second = await set("secondBlob");
    assert.notEqual(second, reused);
    assert.ok(
      await page.evaluate((url) => window.revokedUrls.includes(url), reused),
    );
    assert.equal(
      await page.evaluate(
        async (url) => (await (await fetch(url)).blob()).size,
        second,
      ),
      11,
    );
    await page.evaluate(() => window.unmountProbe());
    assert.ok(
      await page.evaluate((url) => window.revokedUrls.includes(url), second),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Object URL regression passed: cleared Blob released from React state, old URL revoked, same Blob reused with a fresh URL, replacement readable, unmount cleanup, Strict Mode.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
