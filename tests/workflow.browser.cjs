const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const base = process.env.TEST_URL || "http://127.0.0.1:3000";
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/resize-image");
    assert.equal(await p.locator("#width-slider").getAttribute("max"), "30");
    await p.locator("#unit").selectOption("px");
    assert.equal(await p.locator("#width-slider").getAttribute("max"), "4000");
    await p.locator("#width").fill("5000");
    assert.equal(await p.locator("#width-slider").inputValue(), "5000");
    await p.goto(base + "/compress-image");
    await p.getByRole("button", { name: "Under 200 KB", exact: true }).click();
    assert.equal(await p.locator("#target").inputValue(), "200");
    await p.goto(base + "/convert-image");
    await p.locator("#format").selectOption("image/png");
    assert.equal(await p.locator("#quality").count(), 0);
    await p.locator("#format").selectOption("image/jpeg");
    await p.getByRole("button", { name: "High quality", exact: true }).click();
    assert.equal(await p.locator("#quality").inputValue(), "92");
    await p.locator("#upload").setInputFiles(path.join(__dirname, "photo.png"));
    await p.locator(".image-edit-stage img").waitFor();
    await p.locator("#process").click();
    await p
      .locator(".results-summary h2")
      .filter({ hasText: "Your files are ready" })
      .waitFor();
    assert.match(
      await p.locator(".results-summary").innerText(),
      /Original:.*Output:/s,
    );
    assert.equal(
      await p.locator(".settings-disclosure").getAttribute("open"),
      null,
    );
    await p.locator(".settings-disclosure>summary").click();
    assert.ok(await p.locator("#quality").isVisible());
    await p.goto(base + "/compress-pdf");
    await p
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "two-pages.pdf"));
    await p.locator(".quality-preview>summary").click();
    await p.locator(".quality-preview img").waitFor();
    await p.locator("#process:enabled").waitFor();
    await p.locator("#process").click();
    await p
      .locator(".results-summary h2")
      .filter({ hasText: "Your files are ready" })
      .waitFor();
    await p.locator(".output").first().waitFor();
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Workflow checks passed: slider ranges, presets, format controls, live image/PDF previews, result sizes, mobile collapse and downloads.",
    );
  } finally {
    await b.close();
  }
})();
