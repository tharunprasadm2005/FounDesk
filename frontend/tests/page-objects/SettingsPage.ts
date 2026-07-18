import { Page, Locator, expect } from "@playwright/test";
import { SELECTORS } from "../data/selectors";

export class SettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tabs: Locator;
  readonly profileForm: Locator;
  readonly notificationSettings: Locator;
  readonly apiKeysSection: Locator;
  readonly integrationsSection: Locator;
  readonly teamSection: Locator;
  readonly appearanceSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1").first();
    this.tabs = page.locator("[role='tab'], button:has-text('Profile'), button:has-text('Notifications'), button:has-text('Team')");
    this.profileForm = page.locator("form, [class*='profile-form'], [class*='settings-form'], [class*='profile'], div[class*='form']").first();
    this.notificationSettings = page.locator("[class*='notification']");
    this.apiKeysSection = page.locator("[class*='api-key'], [class*='token']");
    this.integrationsSection = page.locator("[class*='integration']");
    this.teamSection = page.locator("[class*='team'], [class*='member']");
    this.appearanceSection = page.locator("[class*='appearance'], [class*='theme']");
  }

  async goto() {
    await this.page.goto("/settings", { waitUntil: "domcontentloaded" });
  }

  async waitForLoaded() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async switchTab(tabName: string) {
    const tab = this.tabs.filter({ hasText: new RegExp(tabName, "i") }).first();
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async updateProfileName(name: string) {
    const nameInput = this.profileForm.locator('input[name="name"], input[placeholder*="Name"]').first();
    await nameInput.clear();
    await nameInput.fill(name);
    await this.profileForm.locator('button[type="submit"]').click();
  }

  async isNotificationSettingsVisible(): Promise<boolean> {
    return this.notificationSettings.isVisible();
  }

  async isApiKeysSectionVisible(): Promise<boolean> {
    return this.apiKeysSection.isVisible();
  }

  async isIntegrationsSectionVisible(): Promise<boolean> {
    return this.integrationsSection.isVisible();
  }

  async isTeamSectionVisible(): Promise<boolean> {
    return this.teamSection.isVisible();
  }

  async toggleTheme() {
    const themeToggle = this.appearanceSection.locator("button, [role='switch'], [class*='toggle']").first();
    await themeToggle.click();
  }

  async getCurrentTheme(): Promise<string | null> {
    const html = this.page.locator("html");
    return html.getAttribute("class");
  }
}
