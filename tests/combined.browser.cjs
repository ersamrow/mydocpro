const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");
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
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    await page.goto(base + "/image-editor");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("#combined-operation option").count(), 10);
    await page
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "photo.png"));
    await page.locator("#combined-operation").selectOption("convert-image");
    await page.locator("#format").selectOption("image/png");
    await page.locator("#process").click();
    await page.locator("#outputs a.result-download").first().waitFor();
    const image = await page
      .locator("#outputs a.result-download")
      .first()
      .evaluate(async (a) => {
        const b = await (await fetch(a.href)).blob();
        return { type: b.type, size: b.size };
      });
    assert.equal(image.type, "image/png");
    assert.ok(image.size > 0);
    await page.locator("#combined-operation").selectOption("resize-image");
    assert.equal(await page.locator("#outputs a.result-download").count(), 0);
    await page.goto(base + "/pdf-toolkit");
    assert.equal(await page.locator("#combined-operation option").count(), 6);
    await page
      .locator("#upload")
      .setInputFiles([
        path.join(__dirname, "two-pages.pdf"),
        path.join(__dirname, "one-page.pdf"),
      ]);
    await page.locator("#process").click();
    await page.locator("#outputs a.result-download").first().waitFor();
    const bytes = await page
      .locator("#outputs a.result-download")
      .first()
      .evaluate(async (a) =>
        Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
      );
    assert.equal(
      (await PDFDocument.load(Uint8Array.from(bytes))).getPageCount(),
      3,
    );
    await page.locator("#combined-operation").selectOption("split-pdf");
    assert.match(
      await page.locator(".combined-start [role=status]").textContent(),
      /first uploaded file/,
    );
    await page.locator("#combined-operation").selectOption("jpg-to-pdf");
    assert.equal(
      await page.locator("#upload").getAttribute("accept"),
      "image/jpeg,image/png,image/webp",
    );
    assert.ok(await page.locator("#dropzone").isVisible());
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Combined workspaces: uploads, switching, image/PDF outputs and mobile layout passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
