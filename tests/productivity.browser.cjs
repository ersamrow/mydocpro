const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      acceptDownloads: true,
    });
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const image = path.join(__dirname, "photo.png");
    await page.goto(base + "/convert-image");
    await page.locator("#upload").setInputFiles(image);
    await page.locator("#process:enabled").waitFor();
    await page.locator(".settings-disclosure > summary").click();
    await page.locator("#quality").fill("75");
    await page
      .getByRole("button", { name: "Undo settings", exact: true })
      .click();
    assert.equal(await page.locator("#quality").inputValue(), "92");
    await page.locator("#quality").fill("80");
    await page.getByLabel("Remember settings on this device").check();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("mydocpro:preferences:convert-image"))
          ?.quality === "80",
    );
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("#quality")?.value === "80",
    );
    await page.locator("#upload").setInputFiles(image);
    await page.locator("#process:enabled").waitFor();
    await page.locator(".settings-disclosure > summary").click();
    await page
      .getByRole("button", { name: "Reset settings", exact: true })
      .click();
    assert.equal(await page.locator("#quality").inputValue(), "92");
    assert.equal(
      await page.getByLabel("Remember settings on this device").isChecked(),
      false,
    );
    await page.goto(base + "/convert-image");
    await page.locator("#upload").setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("bad image"),
    });
    await page
      .locator("#status")
      .filter({ hasText: "not a supported image" })
      .waitFor();
    assert.equal(
      await page.locator("#process").count(),
      0,
      "No action bar is shown before a valid upload",
    );
    await page.locator("#upload").setInputFiles([image, image]);
    await page.locator("#process:enabled").click();
    await page
      .locator(".ui-result-heading")
      .filter({ hasText: "Conversion complete" })
      .waitFor();
    // Outputs are added one image at a time, so wait for the second one.
    await page.locator(".result-preview").nth(1).waitFor();
    assert.equal(await page.locator(".result-preview").count(), 2);
    const names = await page
      .locator(".result-preview a[download]")
      .evaluateAll((links) => links.map((link) => link.download));
    assert.equal(
      new Set(names).size,
      2,
      "Duplicate input filenames produce distinct output names",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download all (ZIP)", exact: true })
      .click();
    const zip = await download;
    assert.equal(zip.suggestedFilename(), "mydocpro-files.zip");
    await fs.mkdir(path.join(__dirname, "../ui-audit"), { recursive: true });
    const zipPath = path.join(__dirname, "../ui-audit/batch-check.zip");
    await zip.saveAs(zipPath);
    const zipBytes = await fs.readFile(zipPath);
    assert.equal(zipBytes.readUInt32LE(0), 0x04034b50);
    assert.equal(
      zipBytes.readUInt16LE(zipBytes.length - 12),
      2,
      "ZIP contains both files",
    );
    await page.goto(base + "/resize-image");
    await page.locator("#upload").setInputFiles(image);
    await page.locator(".ui-preview-details > summary").click();
    await page
      .getByRole("button", { name: "Compare before / after", exact: true })
      .click();
    await page.locator(".before-after img").nth(1).waitFor();
    assert.equal(await page.locator(".before-after img").count(), 2);
    assert.equal(
      await page.locator(".before-after figcaption").innerText(),
      "Before",
    );
    assert.equal(await page.locator(".comparison-label").innerText(), "After");
    for (const tool of ["resize-image", "compress-image"]) {
      await page.goto(base + "/" + tool);
      await page.locator("#upload").setInputFiles([image, image]);
      await page.locator("#process:enabled").click();
      await page
        .locator(".results-summary h2")
        .filter({ hasText: "Your files are ready" })
        .waitFor();
      assert.equal(await page.locator(".result-preview").count(), 2, tool);
    }
    await page.goto(base + "/compress-image");
    await page
      .locator("#upload")
      .setInputFiles(Array.from({ length: 12 }, () => image));
    await page.locator("#process:enabled").click();
    await page
      .getByRole("button", { name: "Cancel processing", exact: true })
      .click();
    await page
      .locator("#status")
      .filter({ hasText: "Processing cancelled" })
      .waitFor();
    assert.equal(await page.locator("#process").isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log(
      "Productivity checks passed: undo/reset, saved preferences, invalid uploads, comparison, batch names, single-click ZIP contents and cancellation.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
