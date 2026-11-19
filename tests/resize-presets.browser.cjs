const { chromium } = require("playwright");
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
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(base + "/resize-image");
    const html = await response.text();
    assert.match(html, /Photo sizes in CM, MM and pixels/);
    assert.match(html, /413 × 531/);
    assert.match(html, /Max size \(KB, optional\)/);
    assert.equal(
      await page.title(),
      "Resize Image in CM, MM & Pixels Free | MyDocPro",
    );
    assert.ok((await page.title()).length < 60);
    assert.ok(
      (await page.locator('meta[name="description"]').getAttribute("content"))
        .length < 155,
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      "https://mydocpro.co.in/resize-image",
    );
    await page
      .getByRole("heading", {
        name: "How to resize an image in cm or mm",
        exact: true,
      })
      .waitFor();

    // Presets work before upload, without navigating or discarding the user's file.
    await page
      .getByRole("button", { name: "2 × 2 inches", exact: true })
      .click();
    assert.equal(await page.locator("#width").inputValue(), "50.8");
    assert.equal(await page.locator("#height").inputValue(), "50.8");
    assert.equal(page.url(), base + "/resize-image");
    await page
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "photo.png"));
    await page.locator("#maxKB").fill("50");
    await page.locator("#fit").selectOption("cover");
    const cases = [
      ["35x45", "35", "45", 413, 531],
      ["25x35", "25", "35", 295, 413],
      ["20x25", "20", "25", 236, 295],
      ["2inch", "50.8", "50.8", 600, 600],
      ["20x45", "20", "45", 236, 531],
    ];
    for (const [id, width, height, pixelsW, pixelsH] of cases) {
      // Exercise unit conversion and a previous non-default DPI before selecting.
      await page.locator("#unit").selectOption("in");
      await page.locator("#dpi").fill("150");
      const preset = page.locator(
        `.ui-options-card [data-resize-preset="${id}"]`,
      );
      await preset.click();
      assert.equal(await preset.getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator("#unit").inputValue(), "mm");
      assert.equal(await page.locator("#width").inputValue(), width);
      assert.equal(await page.locator("#height").inputValue(), height);
      assert.equal(await page.locator("#dpi").inputValue(), "300");
      assert.equal(await page.locator("#maxKB").inputValue(), "50");
      assert.equal(await page.locator("#fit").inputValue(), "cover");
      assert.equal(await page.locator("#format").inputValue(), "image/jpeg");
      await page.locator("#process").click();
      const link = page.locator(".process-actions a[download]").first();
      await link.waitFor();
      const result = await link.evaluate(async (a) => {
        const blob = await (await fetch(a.href)).blob();
        const bitmap = await createImageBitmap(blob);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const result = {
          width: bitmap.width,
          height: bitmap.height,
          size: blob.size,
          type: blob.type,
          density: [...bytes.slice(13, 18)],
        };
        bitmap.close();
        return result;
      });
      assert.equal(result.width, pixelsW, id);
      assert.equal(result.height, pixelsH, id);
      assert.equal(result.type, "image/jpeg");
      assert.ok(result.size <= 50000, id);
      assert.deepEqual(result.density, [1, 1, 44, 1, 44]);
    }
    // Keyboard activation and physical-unit equivalence retain the chosen size.
    const firstPreset = page.locator(
      '.ui-options-card [data-resize-preset="35x45"]',
    );
    await firstPreset.focus();
    await page.keyboard.press("Enter");
    await page.locator("#unit").selectOption("cm");
    assert.equal(await page.locator("#width").inputValue(), "3.5");
    assert.equal(await page.locator("#height").inputValue(), "4.5");
    assert.equal(await firstPreset.getAttribute("aria-pressed"), "true");
    await page.locator("#format").selectOption("image/png");
    await firstPreset.click();
    assert.equal(await page.locator("#format").inputValue(), "image/png");
    await page.locator("#maxKB").fill("1");
    const noisy = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 100;
      const x = c.getContext("2d"),
        image = x.createImageData(100, 100);
      let seed = 12345;
      for (let i = 0; i < image.data.length; i++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        image.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
      }
      x.putImageData(image, 0, 0);
      return c.toDataURL().split(",")[1];
    });
    await page.locator("#upload").setInputFiles({
      name: "detail.png",
      mimeType: "image/png",
      buffer: Buffer.from(noisy, "base64"),
    });
    await page.locator("#process").click();
    await page
      .getByRole("alert")
      .filter({
        hasText: "Cannot reach this file size at the requested dimensions",
      })
      .waitFor();
    assert.equal(await page.locator(".process-actions a[download]").count(), 0);
    assert.equal(await page.locator("#width").inputValue(), "35");
    assert.equal(await page.locator("#height").inputValue(), "45");
    for (const viewport of [320, 360, 1280]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        String(viewport),
      );
    }
    for (const [id, anchor] of [
      ["compress-image", "Resize your photo in cm or mm and set a KB limit"],
      [
        "exam-photo",
        "set custom photo dimensions in centimetres or millimetres",
      ],
      ["passport-sheet", "Resize a single photo in cm or mm"],
    ]) {
      await page.goto(base + "/" + id);
      assert.equal(
        await page
          .getByRole("link", { name: anchor, exact: true, includeHidden: true })
          .getAttribute("href"),
        "/resize-image",
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Resizer SEO and presets passed: static content/metadata/canonical, all five exact-size 300 DPI downloads, KB limits, preserved settings, keyboard controls, mobile widths and contextual links.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
