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
    const { routeIds } = await import("../src/routes.js");
    const page = await browser.newPage({ hasTouch: true }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.TEST_URL || "http://127.0.0.1:4173";
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of [320, 1440].includes(width)
        ? routeIds
        : ["", "contact", "resize-image", "organize-pdf"]) {
        await page.goto(base + "/" + id);
        await page.locator(".site-header").waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${id} overflows at ${width}px`,
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    assert.match(
      await page
        .locator(".card h3")
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily),
      /sans-serif/,
    );
    await page.locator("[data-install-app]").click();
    let bounds = await page.locator(".pwa-dialog").boundingBox();
    await page.mouse.click(bounds.x + 5, bounds.y + 5);
    assert.ok(
      await page.locator(".pwa-dialog").isVisible(),
      "Inner dialog padding must not close it",
    );
    await page.mouse.click(2, 2);
    assert.ok(
      !(await page.locator(".pwa-dialog").isVisible()),
      "Backdrop closes the install dialog",
    );
    await page.goto(base + "/organize-pdf");
    await page
      .locator("#upload")
      .setInputFiles(path.join(__dirname, "two-pages.pdf"));
    await page.waitForFunction(() =>
      document
        .querySelector("#output-summary")
        ?.textContent.includes("selected"),
    );
    for (const target of await page
      .locator(".page-move-controls button")
      .evaluateAll((els) =>
        els.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
      ))
      assert.ok(
        target.width >= 44 && target.height >= 44,
        "Touch target must be at least 44px",
      );
    await page.locator(".thumbnail-image").first().click();
    await page.locator(".page-zoom-dialog canvas").waitFor();
    bounds = await page.locator(".page-zoom-dialog").boundingBox();
    await page.mouse.click(bounds.x + 3, bounds.y + 3);
    assert.ok(await page.locator(".page-zoom-dialog").isVisible());
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() =>
      document.activeElement.classList.contains("thumbnail-image"),
    );
    await page.locator(".page-position").first().click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForFunction(() =>
      document.activeElement.classList.contains("page-position"),
    );
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector("footer").getBoundingClientRect().bottom <=
          document.querySelector(".process-actions").getBoundingClientRect()
            .top,
      ),
      "Fixed action bar must not cover footer",
    );
    assert.deepEqual(errors, []);
    console.log(
      "UI checks passed: all routes at 320/1440px, representative routes at 390/768/1024px, dialogs, keyboard focus, touch targets and fixed action bar.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
