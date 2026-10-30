const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext(),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    const ids = [
      "compress-image",
      "resize-image",
      "convert-image",
      "crop-image",
      "merge-pdf",
      "split-pdf",
      "compress-pdf",
      "jpg-to-pdf",
      "exam-photo",
      "signature",
      "passport-sheet",
      "pdf-to-image",
      "organize-pdf",
      "name-date",
      "join-images",
      "white-background",
    ];
    await page.goto(base);
    await page.locator("#search").waitFor();
    await page.evaluate(() => (window.navigationSentinel = 42));
    for (const id of ids) {
      if (page.url() !== base + "/") {
        await page.locator(".brand").first().click();
        await page.locator("#search").waitFor();
      }
      await page.locator(`.card[href="/${id}"]`).click();
      await page.locator("#upload").waitFor();
      assert.equal(
        await page.evaluate(() => window.navigationSentinel),
        42,
        "Next Link must keep the same document",
      );
      const pdf = [
        "merge-pdf",
        "split-pdf",
        "compress-pdf",
        "pdf-to-image",
        "organize-pdf",
      ].includes(id);
      const file = path.join(__dirname, pdf ? "two-pages.pdf" : "photo.png"),
        inputs = [file];
      if (id === "merge-pdf") inputs.push(path.join(__dirname, "one-page.pdf"));
      if (id === "join-images" || id === "jpg-to-pdf")
        inputs.push(path.join(__dirname, "photo.png"));
      await page.locator("#upload").setInputFiles(inputs);
      if (id === "name-date") await page.locator("#name").fill("Example User");
      if (id === "crop-image") {
        await page.locator(".manipulator-surface canvas").waitFor();
        await page
          .getByRole("button", {
            name: "Rotate image right 90 degrees",
            exact: true,
          })
          .click();
        assert.equal(await page.locator("#rotation").inputValue(), "90");
        const handle = page.getByRole("button", {
          name: "Crop se corner; use arrow keys for precision",
          exact: true,
        });
        await handle.focus();
        await page.keyboard.press("ArrowLeft");
        const box = await page
          .locator(".manipulator-box")
          .getAttribute("style");
        assert.ok(!box.includes("width: 100%"));
      }
      if (id === "resize-image") {
        await page.locator("#unit").selectOption("px");
        await page.locator("#width").fill("120");
        await page.locator("#height").fill("100");
        await page.getByLabel("Keep proportions").check();
        await page.locator("#width").fill("240");
        assert.equal(Number(await page.locator("#height").inputValue()), 200);
      }
      await page.locator("#output-name").fill("converted");
      await page.waitForFunction(
        () => !document.querySelector("#process").disabled,
      );
      await page.locator("#process").click();
      await page
        .locator("#outputs a[download]")
        .first()
        .waitFor({ timeout: 60000 });
      await page.waitForFunction(
        () => !document.querySelector("#process").disabled,
        {},
        { timeout: 60000 },
      );
      const results = await page
        .locator("#outputs a")
        .evaluateAll(async (links) =>
          Promise.all(
            links.map(async (a) => {
              const b = await (await fetch(a.href)).blob();
              return {
                name: a.download,
                type: b.type,
                size: b.size,
                bytes:
                  b.type === "application/pdf"
                    ? Array.from(new Uint8Array(await b.arrayBuffer()))
                    : null,
              };
            }),
          ),
        );
      assert.ok(
        results.every((r) => r.size > 0 && r.name.startsWith("converted")),
        id,
      );
      if (
        [
          "merge-pdf",
          "split-pdf",
          "compress-pdf",
          "jpg-to-pdf",
          "organize-pdf",
        ].includes(id)
      ) {
        const doc = await PDFDocument.load(Uint8Array.from(results[0].bytes));
        assert.equal(
          doc.getPageCount(),
          id === "merge-pdf" ? 3 : id === "split-pdf" ? 1 : 2,
          id,
        );
      }
      if (id === "pdf-to-image") assert.equal(results.length, 2);
      if (id === "passport-sheet")
        assert.deepEqual(
          await page.locator("#outputs img").evaluate(async (im) => {
            await im.decode();
            return [im.naturalWidth, im.naturalHeight];
          }),
          [1200, 1800],
        );
      console.log(id + ": React navigation and output verified");
    }
    await page.locator(".brand").first().click();
    await page.locator("#search").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-app-status]")?.textContent ===
        "Ready offline",
      {},
      { timeout: 60000 },
    );
    await context.setOffline(true);
    await page.locator('.card[href="/resize-image"]').click();
    await page.locator("#width").waitFor();
    assert.equal(await page.evaluate(() => window.navigationSentinel), 42);
    await page.locator(".brand").first().click();
    await page.locator("#search").waitFor();
    await context.setOffline(false);
    const invalid = await context.request.post(base + "/api/contact", {
      data: {},
      headers: { Accept: "application/json" },
    });
    assert.equal(invalid.status(), 400);
    assert.equal(
      (await context.request.get(base + "/api/contact")).status(),
      405,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.card[href="/crop-image"]').click();
    await page
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "photo.png"));
    await page.locator(".manipulator-box").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Mobile page must not overflow horizontally",
    );
    await page.screenshot({
      path: path.join(__dirname, "../react-mobile-preview.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "All 16 tools, SPA navigation, offline navigation, API validation and mobile layout passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
