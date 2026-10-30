const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const { version } = require("pdfjs-dist/package.json");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    const workers = [];
    page.on("worker", (worker) => workers.push(worker.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    // Reproduce the deployment's broken legacy URL; previews must not use it.
    await page.route("**/pdf.worker.min.mjs", (route) =>
      route.fulfill({
        contentType: "text/plain",
        body: "// Legacy worker unavailable",
      }),
    );
    const workerResponse = await page.request.get(
      `${process.env.TEST_URL || "http://127.0.0.1:4173"}/pdf.worker-${version}.js`,
    );
    assert.equal(workerResponse.status(), 200);
    assert.match(
      workerResponse.headers()["content-type"],
      /^(text|application)\/javascript/,
    );
    for (const tool of [
      "organize-pdf",
      "compress-pdf",
      "pdf-to-image",
      "split-pdf",
      "merge-pdf",
    ]) {
      await page.goto(
        `${process.env.TEST_URL || "http://127.0.0.1:4173"}/${tool}`,
      );
      await page
        .locator("#upload")
        .setInputFiles([
          path.join(__dirname, "two-pages.pdf"),
          ...(tool === "merge-pdf"
            ? [path.join(__dirname, "one-page.pdf")]
            : []),
        ]);
      await page.waitForFunction(
        () =>
          document.querySelector("#output-summary")?.textContent &&
          !document
            .querySelector("#output-summary")
            .textContent.includes("Loading"),
      );
      assert.equal(
        await page.locator(".page-thumbnail img").count(),
        tool === "merge-pdf" ? 3 : 2,
      );
      assert.equal(await page.locator("#process").isEnabled(), true);
      if (tool === "compress-pdf") {
        assert.equal(await page.locator(".page-toolbar").isVisible(), false);
        assert.equal(
          await page.locator(".page-move-controls").first().isVisible(),
          false,
        );
      }
      if (tool === "organize-pdf") {
        await page
          .getByRole("button", {
            name: "Move two-pages.pdf page 2 earlier",
            exact: true,
          })
          .click();
        assert.equal(await page.locator("#pages").inputValue(), "2, 1");
        await page
          .getByRole("checkbox", { name: "Select page 1", exact: true })
          .uncheck();
        assert.equal(await page.locator("#pages").inputValue(), "2");
        await page.locator("#rotation").selectOption("90");
        assert.match(
          await page
            .locator(".page-thumbnail img")
            .first()
            .getAttribute("style"),
          /rotate\(90deg\)/,
        );
        await page
          .getByRole("button", { name: "Deselect all", exact: true })
          .click();
        assert.equal(await page.locator("#process").isDisabled(), true);
        await page.getByRole("button", { name: "↶ Undo", exact: true }).click();
        assert.equal(await page.locator("#pages").inputValue(), "2");
      }
      await page.locator(".thumbnail-image").first().click();
      await page.locator(".page-zoom-dialog canvas").waitFor();
      await page.getByRole("button", { name: "Close", exact: true }).click();
      console.log(`${tool}: thumbnails, controls and zoom passed`);
    }
    assert.deepEqual(errors, []);
    assert.ok(
      workers.some((url) => url.endsWith(`/pdf.worker-${version}.js`)),
      "PDF rendering must use the versioned module worker",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
