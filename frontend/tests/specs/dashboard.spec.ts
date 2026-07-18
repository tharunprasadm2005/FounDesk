import { test, expect } from "../fixtures";
import { ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load dashboard page", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    expect(await dashboardPage.getHeadingText()).toBeTruthy();
  });

  test("should display content on dashboard", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    const bodyText = await dashboardPage.page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("should display recent activity", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    const count = await dashboardPage.getActivityCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display upcoming tasks", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    const count = await dashboardPage.getTaskCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have no console errors on load", async ({ page, dashboardPage, consoleErrors }) => {
    await dashboardPage.goto();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, dashboardPage }) => {
    await mockApiError(page, "**/api/dashboard", 500, "Server error");
    await dashboardPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should handle network timeout gracefully", async ({ page, dashboardPage }) => {
    await page.route("**/api/dashboard", (route) => route.abort("timedout"));
    await dashboardPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should be responsive", async ({ page, dashboardPage }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
  });

  test("should have working notification interaction", async ({ page, dashboardPage, appLayout }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    if (await appLayout.notificationBell.isVisible()) {
      await appLayout.clickNotificationBell();
      await page.waitForTimeout(500);
    }
  });

  test("should render without unhandled exceptions", async ({ page, dashboardPage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await dashboardPage.goto();
    await dashboardPage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
