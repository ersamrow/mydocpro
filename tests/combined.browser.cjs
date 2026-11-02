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
    const viewport = page.locator(".preview-zoom-viewport");
    await viewport.scrollIntoViewIfNeeded();
    await viewport.click({ position: { x: 8, y: 8 } });
    await page.mouse.wheel(0, -100);
    await page.waitForFunction(
      () => document.querySelector('[aria-label="Image zoom"]').value === "125",
    );
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(
      () => document.querySelector('[aria-label="Image zoom"]').value === "100",
    );
    await page.getByRole("button", { name: "Fit image", exact: true }).focus();
    await viewport.dispatchEvent("wheel", { deltaY: -100 });
    assert.equal(
      await page
        .getByRole("slider", { name: "Image zoom", exact: true })
        .inputValue(),
      "100",
    );
    const frameBefore = await page.locator(".manipulator-box").boundingBox();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    const frameAfter = await page.locator(".manipulator-box").boundingBox();
    assert.equal(frameBefore.width, frameAfter.width);
    assert.equal(frameBefore.height, frameAfter.height);
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    assert.equal(
      await page
        .getByRole("slider", { name: "Image zoom", exact: true })
        .inputValue(),
      "100",
    );
    await page.locator(".manipulator-box").scrollIntoViewIfNeeded();
    const box = await page.locator(".manipulator-box").boundingBox();
    const session = await page.context().newCDPSession(page);
    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: cx - 30, y: cy, id: 1 },
        { x: cx + 30, y: cy, id: 2 },
      ],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: cx - 60, y: cy, id: 1 },
        { x: cx + 60, y: cy, id: 2 },
      ],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.ok(
      Number(
        await page
          .getByRole("slider", { name: "Image zoom", exact: true })
          .inputValue(),
      ) > 150,
    );
    await session.detach();
    await page.getByRole("button", { name: "Fit image", exact: true }).click();
    for (let i = 0; i < 4; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.deepEqual(await readImage(), original);
    await page
      .getByRole("button", { name: "Apply crop & rotate", exact: true })
      .click();
    await page.locator(".studio-download").waitFor();
    assert.equal((await readImage()).width, Math.round(original.width / 2));
    assert.equal((await readImage()).height, Math.round(original.height / 2));
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal((await readImage()).width, original.width);
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
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base + "/pdf-toolkit");
    await page.screenshot({
      path: "ui-audit/pdf-toolkit-desktop.png",
      fullPage: true,
    });
    assert.equal(await page.locator(".pdf-task-grid button").count(), 7);
    await page
      .locator(".pdf-task-grid")
      .getByRole("button", { name: /Merge PDF/ })
      .click();
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
    await page
      .locator(".pdf-task-grid")
      .getByRole("button", { name: /Split PDF/ })
      .click();
    assert.match(
      await page.locator(".combined-start [role=status]").textContent(),
      /first uploaded file/,
    );
    await page
      .locator(".pdf-task-grid")
      .getByRole("button", { name: /Image to PDF/ })
      .click();
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
    await page.screenshot({
      path: "ui-audit/pdf-toolkit-mobile.png",
      fullPage: true,
    });
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
