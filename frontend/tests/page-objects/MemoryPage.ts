import { Page, Locator, expect } from "@playwright/test";

export class MemoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly decisionCards: Locator;
  readonly addDecisionButton: Locator;
  readonly decisionForm: Locator;
  readonly filterDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.decisionCards = page.locator("[class*='card'], [class*='decision'], [class*='log']");
    this.addDecisionButton = page.locator("button").filter({ hasText: /add|new|create decision/i }).first();
    this.decisionForm = page.locator("form").first();
    this.filterDropdown = page.locator("[class*='dropdown'], [class*='select']").first();
  }

  async goto() {
    await this.page.goto("/memory", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async getDecisionCount(): Promise<number> {
    return this.decisionCards.count();
  }

  async clickAddDecision() {
    await this.addDecisionButton.click();
  }

  async isDecisionFormVisible(): Promise<boolean> {
    return this.decisionForm.isVisible();
  }

  async getFirstDecisionTitle(): Promise<string> {
    const title = this.decisionCards.first().locator("h2, h3").first();
    return (await title.textContent()) || "";
  }

  async getFirstDecisionStatus(): Promise<string | null> {
    const card = this.decisionCards.first();
    const status = card.locator("[class*='badge'], [class*='status'], [class*='tag'], [class*='label'], span, small, [class*='indicator']").first();
    if (await status.isVisible().catch(() => false)) {
      return ((await status.textContent()) || "").trim() || null;
    }
    const bodyText = (await card.innerText().catch(() => "")) || "";
    const tokens = bodyText.split("\n").map((s) => s.trim()).filter(Boolean);
    return tokens.length > 0 ? tokens[tokens.length - 1] : null;
  }
}
