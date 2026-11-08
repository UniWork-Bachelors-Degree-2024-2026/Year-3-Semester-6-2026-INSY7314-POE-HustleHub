// Playwright settings for the frontend integration tests (Playwright, 2026a).
const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const backendDir = path.join(__dirname, "..", "backend");
const frontendDir = path.join(__dirname, "..", "frontend");
const isCI = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: "./tests",
  // Tests run one at a time because the marketplace flow builds on itself
  fullyParallel: false,
  workers: 1,
  // A leftover test.only fails the pipeline (Playwright, 2026b).
  forbidOnly: isCI,
  // No retries, the tests change accounts and data so a rerun would not start from the same state
  retries: 0,
  // Two minutes per test, well above the slowest test, so a slow CI runner cannot cause a timeout
  timeout: 120000,
  expect: { timeout: 10000 },
  reporter: isCI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  globalSetup: require.resolve("./global-setup.js"),
  use: {
    baseURL: "https://localhost:5173",
    // The certificates are self-signed
    ignoreHTTPSErrors: true,
    // Keep a trace, screenshot and video of failed tests (Playwright, 2026c).
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the API and the built React app before the tests (Playwright, 2026d).
  webServer: [
    {
      name: "API",
      command: "node app.js",
      cwd: backendDir,
      url: "https://localhost:3000/api/health",
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 60000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        PORT: "3000",
        NODE_ENV: "test",
        EMAIL_PROVIDER: "console",
        ALLOWED_ORIGINS: "https://localhost:5173",
        // Higher limits so the tests are not rate limited
        API_RATE_LIMIT_MAX: "5000",
        AUTH_RATE_LIMIT_MAX: "500",
        OTP_RATE_LIMIT_MAX: "500",
        ACCOUNT_RATE_LIMIT_MAX: "500",
        BOOKING_RATE_LIMIT_MAX: "500",
      },
    },
    {
      name: "React app",
      // Production build, so the production security headers are tested
      command: "npm run build && npm run preview",
      cwd: frontendDir,
      url: "https://localhost:5173",
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 180000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});

// Reference List:
// Playwright, 2026a. Installation. [online] Available at: <https://playwright.dev/docs/intro> [Accessed 7 November 2026].
// Playwright, 2026b. Test configuration. [online] Available at: <https://playwright.dev/docs/test-configuration> [Accessed 7 November 2026].
// Playwright, 2026c. Trace viewer. [online] Available at: <https://playwright.dev/docs/trace-viewer> [Accessed 7 November 2026].
// Playwright, 2026d. Web server. [online] Available at: <https://playwright.dev/docs/test-webserver> [Accessed 7 November 2026].
