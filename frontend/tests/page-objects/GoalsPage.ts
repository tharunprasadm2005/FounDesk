import { Page, Locator, expect } from "@playwright/test";

export class GoalsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly goalCards: Locator;
  readonly createGoalButton: Locator;
  readonly goalForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.goalCards = page.locator("[class*='goal'], [class*='okr'], [class*='card']").filter({ has: page.locator("h2, h3") });
    this.createGoalButton = page.locator("button").filter({ hasText: /create|add|new goal/i }).first();
    this.goalForm = page.locator("form").first();
  }

  async goto() {
    await this.page.goto("/plan", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async getGoalCount(): Promise<number> {
    return this.goalCards.count();
  }

  async clickCreateGoal() {
    await this.createGoalButton.click();
  }

  async isCreateGoalFormVisible(): Promise<boolean> {
    return this.goalForm.isVisible();
  }

  async getFirstGoalTitle(): Promise<string> {
    const title = this.goalCards.first().locator("h2, h3").first();
    return (await title.textContent()) || "";
  }

  async getGoalProgress(index = 0): Promise<string | null> {
    const progress = this.goalCards.nth(index).locator("[class*='progress']").first();
    if (await progress.isVisible()) {
      return (await progress.textContent()) || null;
    }
    return null;
  }
}
