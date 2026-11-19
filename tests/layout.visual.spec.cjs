const { test, expect } = require("playwright/test");
const path = require("node:path");
const fixture = (name) => path.join(__dirname, name);

test.beforeEach(async ({ page }) => {
  // External advertising and offline installation are tested separately. They
  // must not change a local component/layout snapshot between runs.
  await page.route(
    /googlesyndication|googletagmanager|google-analytics/,
    (route) => route.abort(),
  );
});

for (const route of [
  "resize-image",
  "compress-pdf",
  "contact",
  "convert-image",
  "image-editor",
  "pdf-toolkit",
])
  test(route + " layout", async ({ page }) => {
    await page.goto("/" + route);
    await page.addStyleTag({
      content: "nextjs-portal{display:none!important}",
    });
    await page.locator(".site-header").waitFor();
    await page.evaluate(async () => {
      await document.fonts.load('700 24px "DM Sans Headings"');
      await document.fonts.ready;
    });
    if (route === "resize-image") {
      await page.locator("#upload").setInputFiles(fixture("photo.png"));
      await expect(page.locator("#process")).toBeEnabled();
      await expect(page.locator(".ui-preview-details")).not.toHaveAttribute(
        "open",
      );
      await expect(
        page.getByText("Set exact dimensions in the options.", {
          exact: false,
        }),
      ).toBeVisible();
      await page.locator(".ui-settings--compact").scrollIntoViewIfNeeded();
    }
    if (route === "compress-pdf") {
      await page.locator("#upload").setInputFiles(fixture("two-pages.pdf"));
      await page.locator(".thumbnail-image img").first().waitFor();
      await expect(page.locator("#process")).toBeEnabled();
      await page.locator(".ui-settings--compact").scrollIntoViewIfNeeded();
    }
    if (["resize-image", "compress-pdf"].includes(route)) {
      const preview = await page.locator(".merge-canvas").boundingBox();
      const options = await page
        .locator(".merge-controls > .ui-options-card")
        .boundingBox();
      if (page.viewportSize().width >= 900)
        expect(
          preview.x,
          "Desktop settings sit beside the preview",
        ).toBeGreaterThanOrEqual(options.x + options.width);
      else
        expect(
          options.y,
          "Mobile settings follow the preview",
        ).toBeGreaterThanOrEqual(preview.y + preview.height);
    }
    if (route === "convert-image") {
      await page.locator("#upload").setInputFiles(fixture("photo.png"));
      await page.getByRole("button", { name: "WebP", exact: true }).click();
      await page.locator("#process:enabled").click();
      await expect(page.locator(".ui-result-heading")).toContainText(
        "Conversion complete",
      );
      await expect(page.locator(".ui-action-bar a[download]")).toBeVisible();
      await page.locator(".convert-options").scrollIntoViewIfNeeded();
    }
    if (route === "image-editor") {
      await page.locator("#studio-upload").setInputFiles(fixture("photo.png"));
      await expect(page.locator(".studio-download")).toBeVisible();
      await page.locator(".studio-edit-toolbar").scrollIntoViewIfNeeded();
    }
    if (route === "pdf-toolkit") {
      await page
        .locator("#workbench-upload")
        .setInputFiles(fixture("two-pages.pdf"));
      await expect(
        page.locator(".ui-action-bar button.ui-button--primary"),
      ).toBeEnabled();
      await page.locator(".ui-action-bar").scrollIntoViewIfNeeded();
    }
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      await page.evaluate(() => innerWidth),
    );
    const actionBar = page.locator(".ui-action-bar");
    if (await actionBar.count()) {
      await expect(actionBar).toHaveCSS("position", "sticky");
      const bounds = await actionBar.boundingBox();
      expect(
        bounds.height,
        "Floating controls stay compact",
      ).toBeLessThanOrEqual(120);
    }
    for (const button of await page.locator(".ui-button:visible").all()) {
      const bounds = await button.boundingBox();
      expect(
        bounds.height,
        "Shared buttons retain accessible touch height",
      ).toBeGreaterThanOrEqual(44);
    }
    await expect(page).toHaveScreenshot(route + ".png", {
      mask: [page.locator(".app-status")],
    });
  });
