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
    assert.equal(await page.locator("select").count(), 0);
    assert.equal(await page.locator(".studio-card:visible").count(), 0);
    await page
      .locator("#studio-upload")
      .setInputFiles(path.join(__dirname, "photo.png"));
    const readImage = () =>
      page.locator(".studio-download").evaluate(async (a) => {
        const b = await (await fetch(a.href)).blob();
        const bitmap = await createImageBitmap(b);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        const result = {
          type: b.type,
          size: b.size,
          width: bitmap.width,
          height: bitmap.height,
          center: Array.from(
            ctx.getImageData(
              Math.floor(bitmap.width / 2),
              Math.floor(bitmap.height / 2),
              1,
              1,
            ).data,
          ),
        };
        bitmap.close();
        return result;
      });
    await page.locator(".studio-download").waitFor();
    assert.equal(await page.locator(".studio-card:visible").count(), 3);
    const original = await readImage();
    const resize = page
      .locator(".studio-card")
      .filter({ has: page.locator("legend", { hasText: /^Resize image$/ }) });
    await resize.getByRole("button", { name: "Pixels", exact: true }).click();
    await page.locator("#studio-resize-image-width").fill("240");
    await page.locator("#studio-resize-image-height").fill("180");
    await page
      .getByRole("button", { name: "Apply resize image", exact: true })
      .click();
    await page.locator(".studio-download").waitFor();
    assert.equal((await readImage()).width, 240);
    assert.equal((await readImage()).height, 180);
    await page.getByRole("slider", { name: "brightness", exact: true }).focus();
    await page.keyboard.press("Home");
    await page
      .getByRole("button", { name: "Flip horizontal", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Apply effects", exact: true })
        .count(),
      0,
    );
    await page.locator(".studio-download").waitFor();
    assert.equal((await readImage()).width, 240);
    assert.deepEqual((await readImage()).center.slice(0, 3), [0, 0, 0]);
    await page
      .getByRole("button", { name: "Reset effects", exact: true })
      .click();
    await page.locator(".studio-download").waitFor();
    assert.notDeepEqual((await readImage()).center.slice(0, 3), [0, 0, 0]);
    await page.getByRole("slider", { name: "brightness", exact: true }).focus();
    await page.keyboard.press("Home");
    await page.locator(".studio-download").waitFor();
    assert.deepEqual((await readImage()).center.slice(0, 3), [0, 0, 0]);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.notDeepEqual((await readImage()).center.slice(0, 3), [0, 0, 0]);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal((await readImage()).width, original.width);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    assert.equal((await readImage()).width, 240);
    await page.locator(".studio-more > summary").click();
    const convert = page
      .locator(".studio-card")
      .filter({ has: page.locator("legend", { hasText: /^Convert image$/ }) });
    await convert.getByRole("button", { name: "WebP", exact: true }).click();
    await page
      .getByRole("button", { name: "Apply convert image", exact: true })
      .click();
    await page.locator(".studio-download").waitFor();
    assert.equal((await readImage()).type, "image/webp");
    assert.equal((await readImage()).width, 240);
    await page.locator(".studio-more > summary").click();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector(".studio-controls").scrollTop = 0;
    });
    await page.screenshot({
      path: "ui-audit/image-studio-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "ui-audit/image-studio-mobile.png",
      fullPage: true,
    });
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
