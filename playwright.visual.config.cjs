const { defineConfig } = require("playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "*.visual.spec.cjs",
  outputDir: "./ui-audit/visual-results",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:3000",
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH ||
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
    reducedMotion: "reduce",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.005 },
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 900 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
