const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const assert = require("node:assert/strict");
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
    page.on("pageerror", (e) => errors.push(e.message));
    const a = await PDFDocument.create(),
      b = await PDFDocument.create();
    a.addPage([100, 400]);
    a.addPage([200, 400]);
    b.addPage([300, 400]);
    await page.goto(
      (process.env.TEST_URL || "http://127.0.0.1:4173") + "/pdf-toolkit",
    );
    await page.locator("#workbench-upload").setInputFiles([
      {
        name: "a.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(await a.save()),
      },
      {
        name: "b.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(await b.save()),
      },
    ]);
    const make = page.getByRole("button", {
      name: "Create PDF from selected pages",
      exact: true,
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".page-select input").length === 3 &&
        !document.querySelector(".page-select input").disabled,
    );
    assert.equal(await page.locator(".page-thumbnail:visible").count(), 3);
    await page
      .getByRole("button", { name: "Deselect all", exact: true })
      .click();
    assert.ok(await make.isDisabled());
    await page.getByRole("button", { name: "Select all", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Select a.pdf page 1", exact: true })
      .uncheck();
    assert.ok(
      await page
        .getByRole("checkbox", { name: "Select b.pdf page 1", exact: true })
        .isChecked(),
    );
    await page
      .getByRole("button", { name: "Move b.pdf page 1 earlier", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Move b.pdf page 1 earlier", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Rotate b.pdf page 1 clockwise",
        exact: true,
      })
      .click();
    await make.click();
    const output = page.getByRole("link", {
      name: "Download PDF",
      exact: true,
    });
    await output.waitFor();
    const bytes = await output.evaluate(async (a) =>
      Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
    );
    const result = await PDFDocument.load(Uint8Array.from(bytes));
    assert.deepEqual(
      result.getPages().map((p) => p.getWidth()),
      [300, 200],
    );
    assert.deepEqual(
      result.getPages().map((p) => p.getRotation().angle),
      [90, 0],
    );
    await page
      .getByRole("checkbox", { name: "Select a.pdf page 1", exact: true })
      .check();
    assert.equal(
      await output.count(),
      0,
      "Editing pages invalidates the old download",
    );
    await page.screenshot({
      path: "ui-audit/pdf-workbench-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "ui-audit/pdf-workbench-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PDF workspace: multi-file previews, selection, order, rotation, export and mobile layout passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
