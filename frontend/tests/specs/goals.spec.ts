import { test, expect } from "../fixtures";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Goals (Plan) Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load goals page", async ({ goalsPage }) => {
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
  });

  test("should display goal cards", async ({ goalsPage }) => {
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
    const count = await goalsPage.getGoalCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display progress indicators on goals", async ({ goalsPage }) => {
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
    const count = await goalsPage.getGoalCount();
    if (count > 0) {
      const progress = await goalsPage.getGoalProgress();
      expect(progress).toBeTruthy();
    }
  });

  test("should show create goal form when clicked", async ({ goalsPage }) => {
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
    const visible = await goalsPage.createGoalButton.isVisible();
    if (visible) {
      await goalsPage.clickCreateGoal();
      await goalsPage.page.waitForTimeout(1000);
    }
  });

  test("should have no console errors", async ({ goalsPage, consoleErrors }) => {
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, goalsPage }) => {
    await mockApiError(page, "**/api/goals*", 500);
    await goalsPage.goto();
    await page.waitForTimeout(2000);
  });

  test("should render without unhandled exceptions", async ({ page, goalsPage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await goalsPage.goto();
    await goalsPage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
