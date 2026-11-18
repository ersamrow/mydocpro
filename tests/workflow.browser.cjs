const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const image = path.join(__dirname, "photo.png");
    await page.goto(base + "/resize-image");
    await page.locator("#upload").setInputFiles(image);
    await page.locator("#process:enabled").waitFor();
    assert.equal(await page.locator("#width-slider").getAttribute("max"), "30");
    await page.locator("#unit").selectOption("px");
    assert.equal(
      await page.locator("#width-slider").getAttribute("max"),
      "4000",
    );
    await page.locator("#width").fill("5000");
    assert.equal(await page.locator("#width-slider").inputValue(), "5000");
    await page.goto(base + "/compress-image");
    await page.getByRole("button", { name: "200 KB", exact: true }).click();
    assert.equal(await page.locator("#target").inputValue(), "200");
    await page.goto(base + "/convert-image");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    assert.equal(await page.locator("#quality").count(), 0);
    await page.getByRole("button", { name: "JPG", exact: true }).click();
    await page.locator("#quality").fill("92");
    assert.equal(
      await page
        .getByRole("slider", { name: "Image quality", exact: true })
        .inputValue(),
      "92",
    );
    await page.locator("#upload").setInputFiles(image);
    await page.locator("#process:enabled").waitFor();
    assert.equal(
      await page.getByRole("button", { name: "PNG", exact: true }).count(),
      0,
      "Original format is not offered as a conversion",
    );
    await page.locator("#process").click();
    await page
      .locator(".ui-result-heading")
      .filter({ hasText: "Conversion complete" })
      .waitFor();
    const link = page.locator(".ui-action-bar a[download]");
    await link.waitFor();
    assert.equal(
      await link.evaluate(
        async (element) => (await (await fetch(element.href)).blob()).type,
      ),
      "image/jpeg",
    );
    assert.match(
      await page.locator(".ui-result-heading").innerText(),
      /original.*converted/s,
    );
    assert.equal(
      await page.locator(".settings-disclosure").getAttribute("open"),
      null,
    );
    await page.locator(".settings-disclosure > summary").click();
    assert.ok(await page.locator("#output-name").isVisible());
    assert.ok(
      await page.locator("#quality").isVisible(),
      "Quality stays outside the filename disclosure",
    );
    await page.goto(base + "/compress-pdf");
    await page
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "two-pages.pdf"));
    await page.locator(".quality-preview>summary").click();
    await page.locator(".quality-preview img").waitFor();
    await page.locator("#process:enabled").click();
    await page.waitForFunction(
      () =>
        !document.querySelector(".processing-progress") &&
        (document.querySelector(".result-preview") ||
          document
            .querySelector("#status")
            ?.textContent.includes("already small")),
    );
    const status = await page.locator("#status").innerText();
    if (status.includes("already small"))
      assert.equal(
        await page
          .locator(".ui-action-bar a[download],#outputs a[download]")
          .count(),
        0,
      );
    else {
      await page.locator(".ui-action-bar a[download]").waitFor();
      assert.equal(await page.locator(".result-preview").count(), 1);
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Workflow checks passed: slider ranges, KB presets, format buttons, quality slider, original-format hiding, compact preferences, PDF preview and downloads.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
