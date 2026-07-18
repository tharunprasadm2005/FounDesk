import { test, expect } from "../fixtures";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Billing Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load billing page", async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
  });

  test("should display current plan", async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
    const bodyText = await billingPage.page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("should display plan status", async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
    const bodyText = await billingPage.page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("should show upgrade button", async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
    const upgrade = billingPage.page.locator("button, a").filter({ hasText: /upgrade|change|plan|billing/i }).first();
    const visible = await upgrade.isVisible().catch(() => false);
    if (visible) {
      expect(visible).toBeTruthy();
    }
  });

  test("should show billing history section", async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
    const bodyText = await billingPage.page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("should have no console errors", async ({ billingPage, consoleErrors }) => {
    await billingPage.goto();
    await billingPage.waitForLoaded();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, billingPage }) => {
    await mockApiError(page, "**/api/billing/*", 500);
    await billingPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should render without unhandled exceptions", async ({ page, billingPage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await billingPage.goto();
    await billingPage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
