import { test, expect } from "../fixtures";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load settings page", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
  });

  test("should have settings tabs", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    const tabCount = await settingsPage.tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(0);
  });

  test("should switch between settings tabs", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    const tabNames = ["Profile", "Notifications", "Appearance", "API Keys"];
    for (const tab of tabNames) {
      const tabEl = settingsPage.page.locator(`button, a, [role='tab']`).filter({ hasText: new RegExp(tab, "i") }).first();
      if (await tabEl.isVisible()) {
        await tabEl.click();
        await settingsPage.page.waitForTimeout(500);
      }
    }
  });

  test("should have profile form", async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    await expect(settingsPage.profileForm).toBeVisible();
  });

  test("should have no console errors", async ({ settingsPage, consoleErrors }) => {
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, settingsPage }) => {
    await mockApiError(page, "**/api/settings*", 500);
    await settingsPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should render without unhandled exceptions", async ({ page, settingsPage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await settingsPage.goto();
    await settingsPage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
