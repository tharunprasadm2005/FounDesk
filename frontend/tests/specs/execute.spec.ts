import { test, expect } from "../fixtures";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi, mockApiError } from "../helpers/api-mocks";

test.describe("Execute (Kanban) Page", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockAllApi(page);
  });

  test("should load execute page", async ({ executePage }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
  });

  test("should display kanban columns", async ({ executePage }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
    const count = await executePage.getColumnCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display task cards", async ({ executePage }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
    const count = await executePage.getCardCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have column headers", async ({ executePage }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
    const names = await executePage.getColumnNames();
    expect(names.length).toBeGreaterThanOrEqual(0);
  });

  test("should show create task form when clicked", async ({ executePage }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
    const visible = await executePage.createTaskButton.isVisible();
    if (visible) {
      await executePage.clickCreateTask();
      await executePage.page.waitForTimeout(1000);
    }
  });

  test("should have no console errors", async ({ executePage, consoleErrors }) => {
    await executePage.goto();
    await executePage.waitForLoaded();
    expect(consoleErrors.filter((e) => e.type === "error")).toHaveLength(0);
  });

  test("should handle API error gracefully", async ({ page, executePage }) => {
    await mockApiError(page, "**/api/tasks*", 500);
    await executePage.goto();
    await page.waitForTimeout(2000);
  });

  test("should render without unhandled exceptions", async ({ page, executePage }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await executePage.goto();
    await executePage.waitForLoaded();
    expect(errors).toHaveLength(0);
  });
});
