const { test, expect } = require("playwright/test");
const path = require("node:path");
for (const route of ["resize-image", "compress-pdf", "contact"])
  test(route + " layout", async ({ page }) => {
    await page.goto("/" + route);
    await page.addStyleTag({
      content: "nextjs-portal{display:none!important}",
    });
    await page.locator(".site-header").waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (route === "compress-pdf") {
      await page
        .locator("#upload")
        .setInputFiles(path.join(__dirname, "two-pages.pdf"));
      await page.locator(".thumbnail-image img").first().waitFor();
      await expect(page.locator("#process")).toBeEnabled();
    }
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      await page.evaluate(() => innerWidth),
    );
    await expect(page).toHaveScreenshot(route + ".png", {
      mask: [page.locator(".app-status")],
    });
  });
