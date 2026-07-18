import { Page, Locator, expect } from "@playwright/test";
import { SELECTORS } from "../data/selectors";

export class DashboardPage {
  readonly page: Page;
  readonly metrics: Locator;
  readonly recentActivity: Locator;
  readonly upcomingTasks: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.metrics = page.locator("[class*='metric'], [class*='stat']");
    this.recentActivity = page.locator("[class*='activity'], [class*='feed']");
    this.upcomingTasks = page.locator("[class*='task']");
    this.heading = page.locator("h1").first();
  }

  async goto() {
    await this.page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async getMetricCards() {
    return this.metrics;
  }

  async getMetricCount(): Promise<number> {
    return this.metrics.count();
  }

  async getActivityItems() {
    return this.recentActivity.locator("> *");
  }

  async getActivityCount(): Promise<number> {
    return (await this.getActivityItems()).count();
  }

  async getTaskCount(): Promise<number> {
    return this.upcomingTasks.count();
  }

  async clickTask(taskTitle: string) {
    const task = this.page.locator(`text="${taskTitle}"`).first();
    await task.click();
  }

  async getHeadingText(): Promise<string> {
    return (await this.heading.textContent()) || "";
  }
}
