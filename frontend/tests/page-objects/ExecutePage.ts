import { Page, Locator, expect } from "@playwright/test";

export class ExecutePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly kanbanColumns: Locator;
  readonly kanbanCards: Locator;
  readonly createTaskButton: Locator;
  readonly taskForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.kanbanColumns = page.locator("[class*='column'], [class*='lane']");
    this.kanbanCards = page.locator("[class*='card'], [class*='task-item']");
    this.createTaskButton = page.locator("button").filter({ hasText: /create|add|new task/i }).first();
    this.taskForm = page.locator("form").first();
  }

  async goto() {
    await this.page.goto("/execute", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async getColumnCount(): Promise<number> {
    return this.kanbanColumns.count();
  }

  async getCardCount(): Promise<number> {
    return this.kanbanCards.count();
  }

  async clickCreateTask() {
    await this.createTaskButton.click();
  }

  async isTaskFormVisible(): Promise<boolean> {
    return this.taskForm.isVisible();
  }

  async getColumnNames(): Promise<string[]> {
    const columns = await this.kanbanColumns.all();
    if (columns.length === 0) return [];
    const names: string[] = [];
    for (const col of columns) {
      const heading = col.locator("h2, h3, h4, [class*='title'], [class*='header'], [class*='heading'], button").first();
      try {
        const text = await heading.textContent({ timeout: 5000 });
        if (text) names.push(text.trim());
      } catch {
        const colText = await col.innerText().catch(() => "");
        if (colText.trim()) names.push(colText.trim().split("\n")[0].trim());
      }
    }
    return names.filter((n) => n.length > 0);
  }

  async dragCardToColumn(cardIndex: number, columnIndex: number) {
    const card = this.kanbanCards.nth(cardIndex);
    const target = this.kanbanColumns.nth(columnIndex);
    await card.dragTo(target);
  }

  async clickCard(cardTitle: string) {
    await this.page.locator(`text="${cardTitle}"`).first().click();
  }
}
