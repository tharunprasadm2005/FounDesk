import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: "./tests/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 90000,
  expect: { timeout: 20000 },

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL: "https://foundesk.onrender.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20000,
    navigationTimeout: 60000,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "auth-setup",
      testDir: "./tests",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "firefox",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["Desktop Firefox"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "webkit",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["Desktop Safari"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "chromium-tablet",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["Galaxy Tab S4"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "chromium-mobile",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["Pixel 5"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "webkit-mobile",
      testIgnore: /landing\.spec|auth\.spec/,
      use: {
        ...devices["iPhone 16 Pro Max"],
        storageState: path.resolve(__dirname, "tests/.auth/user.json"),
      },
      dependencies: ["auth-setup"],
    },
    {
      name: "public-pages",
      testMatch: /landing|auth\.spec/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: path.resolve(__dirname, "tests/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "tests/global-teardown.ts"),
});
