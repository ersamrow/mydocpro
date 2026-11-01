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
    const p = await b.newPage({
      viewport: { width: 390, height: 900 },
      acceptDownloads: true,
    });
    const base = process.env.TEST_URL || "http://127.0.0.1:3000";
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/convert-image");
    await p.locator("#quality").fill("75");
    await p.getByRole("button", { name: "Undo settings", exact: true }).click();
    assert.equal(await p.locator("#quality").inputValue(), "92");
    await p.locator("#quality").fill("80");
    await p.getByLabel("Remember settings on this device").check();
    await p.reload();
    assert.equal(await p.locator("#quality").inputValue(), "80");
    await p
      .getByRole("button", { name: "Reset settings", exact: true })
      .click();
    assert.equal(await p.locator("#quality").inputValue(), "92");
    assert.equal(
      await p.getByLabel("Remember settings on this device").isChecked(),
      false,
    );
    await p.locator("#upload").setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("bad image"),
    });
    await p
      .locator("#status")
      .filter({ hasText: "not a supported image" })
      .waitFor();
    assert.equal(await p.locator("#process").isDisabled(), true);
    await p
      .locator("#upload")
      .setInputFiles([
        path.join(__dirname, "photo.png"),
        path.join(__dirname, "photo.png"),
      ]);
    await p.locator(".image-edit-stage img").waitFor();
    await p
      .getByRole("button", { name: "Compare before / after", exact: true })
      .click();
    await p.locator(".before-after figure img").waitFor();
    await p.locator("#process:enabled").click();
    await p
      .locator(".results-summary h2")
      .filter({ hasText: "Your files are ready" })
      .waitFor();
    assert.equal(await p.locator(".output").count(), 2);
    const names = await p
      .locator(".output")
      .evaluateAll((els) => els.map((el) => el.download));
    assert.equal(new Set(names).size, 2);
    await p
      .getByRole("button", { name: "Prepare all files as ZIP", exact: true })
      .click();
    const download = p.waitForEvent("download");
    await p.getByRole("link", { name: "Download ZIP ↓", exact: true }).click();
    await (
      await download
    ).saveAs(path.join(__dirname, "../ui-audit/batch-check.zip"));
    for (const tool of ["resize-image", "compress-image"]) {
      await p.goto(base + "/" + tool);
      await p
        .locator("#upload")
        .setInputFiles([
          path.join(__dirname, "photo.png"),
          path.join(__dirname, "photo.png"),
        ]);
      await p.locator("#process:enabled").click();
      await p
        .locator(".results-summary h2")
        .filter({ hasText: "Your files are ready" })
        .waitFor();
      assert.equal(await p.locator(".output").count(), 2, tool);
    }
    await p.goto(base + "/compress-image");
    await p
      .locator("#upload")
      .setInputFiles(
        Array.from({ length: 12 }, () => path.join(__dirname, "photo.png")),
      );
    await p.locator("#process:enabled").click();
    await p
      .getByRole("button", { name: "Cancel processing", exact: true })
      .click();
    await p
      .locator("#status")
      .filter({ hasText: "Processing cancelled" })
      .waitFor();
    assert.equal(await p.locator("#process").isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log(
      "Productivity checks passed: undo/reset, saved preferences, invalid files, comparison, batch results, ZIP download and cancellation.",
    );
  } finally {
    await b.close();
  }
})();
