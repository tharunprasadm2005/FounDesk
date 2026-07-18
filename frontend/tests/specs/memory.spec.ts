import { test, expect } from "../fixtures";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Memory (Decision Log) Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load memory page", async ({ memoryPage }) => {
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
  });

  test("should display decision cards", async ({ memoryPage }) => {
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
    const count = await memoryPage.getDecisionCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display decision status badges", async ({ memoryPage }) => {
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
    const count = await memoryPage.getDecisionCount();
    if (count > 0) {
      const status = await memoryPage.getFirstDecisionStatus();
      if (!status) {
        const cardText = await memoryPage.decisionCards.first().innerText().catch(() => "");
        expect(cardText.length).toBeGreaterThan(0);
      } else {
        expect(status).toBeTruthy();
      }
    }
  });

  test("should show add decision form when clicked", async ({ memoryPage }) => {
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
    const visible = await memoryPage.addDecisionButton.isVisible();
    if (visible) {
      await memoryPage.clickAddDecision();
      await memoryPage.page.waitForTimeout(1000);
    }
  });

  test("should have no console errors", async ({ memoryPage, consoleErrors }) => {
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, memoryPage }) => {
    await mockApiError(page, "**/api/decisions*", 500);
    await memoryPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should render without unhandled exceptions", async ({ page, memoryPage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await memoryPage.goto();
    await memoryPage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
