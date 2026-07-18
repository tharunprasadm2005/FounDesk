import { Page, Locator, expect } from "@playwright/test";

export class BillingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly currentPlan: Locator;
  readonly upgradeButton: Locator;
  readonly billingHistory: Locator;
  readonly paymentModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.currentPlan = page.locator("[class*='plan'], [class*='subscription']").first();
    this.upgradeButton = page.locator("button").filter({ hasText: /upgrade|change plan/i }).first();
    this.billingHistory = page.locator("[class*='history'], [class*='invoices']");
    this.paymentModal = page.locator("[role='dialog'], [class*='modal']");
  }

  async goto() {
    await this.page.goto("/billing", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async getPlanName(): Promise<string> {
    const name = this.currentPlan.locator("h2, h3").first();
    return (await name.textContent()) || "";
  }

  async getPlanStatus(): Promise<string> {
    const status = this.currentPlan.locator("[class*='badge'], [class*='status']").first();
    return (await status.textContent()) || "";
  }

  async clickUpgrade() {
    await this.upgradeButton.click();
  }

  async isPaymentModalVisible(): Promise<boolean> {
    return this.paymentModal.isVisible();
  }

  async isBillingHistoryVisible(): Promise<boolean> {
    return this.billingHistory.isVisible();
  }
}
