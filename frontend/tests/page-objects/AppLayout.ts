import { Page, Locator, expect } from "@playwright/test";
import { SELECTORS } from "../data/selectors";
import { SIDEBAR_LINKS } from "../helpers/navigation";

export class AppLayout {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly notificationBell: Locator;
  readonly notificationDropdown: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly workspaceSwitcher: Locator;
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator("nav, aside").first();
    this.notificationBell = page.locator(SELECTORS.NOTIFICATION_BELL);
    this.notificationDropdown = page.locator(SELECTORS.NOTIFICATION_DROPDOWN);
    this.userMenu = page.locator(SELECTORS.USER_MENU);
    this.logoutButton = page.locator(SELECTORS.LOGOUT_BTN);
    this.workspaceSwitcher = page.locator(SELECTORS.WORKSPACE_SWITCHER);
    this.mainContent = page.locator("main");
  }

  async waitForLoaded() {
    await expect(this.sidebar).toBeVisible({ timeout: 15000 });
  }

  async navigateTo(section: string) {
    const link = this.sidebar.locator(`a, button`).filter({ hasText: new RegExp(section, "i") }).first();
    await link.click();
    await this.page.waitForTimeout(1000);
  }

  async clickNotificationBell() {
    await this.notificationBell.click();
  }

  async isNotificationDropdownVisible(): Promise<boolean> {
    return this.notificationDropdown.isVisible();
  }

  async clickLogout() {
    await this.logoutButton.click();
  }

  async getCurrentPageHeading(): Promise<string> {
    const heading = this.page.locator("h1").first();
    return (await heading.textContent()) || "";
  }

  async verifySidebarLinks() {
    for (const link of SIDEBAR_LINKS) {
      const el = this.sidebar.locator(`a, button`).filter({ hasText: new RegExp(`^${link.label}$`, "i") }).first();
      await expect(el).toBeVisible();
    }
  }

  async toggleSidebar() {
    const toggleBtn = this.sidebar.locator("button[class*='collapse'], button[class*='toggle']").first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
    }
  }

  async getWorkspaceName(): Promise<string> {
    const el = this.workspaceSwitcher.first();
    return (await el.textContent()) || "";
  }

  async openCommandPalette() {
    await this.page.keyboard.press("Control+k");
    await this.page.waitForTimeout(500);
  }

  async closeCommandPalette() {
    await this.page.keyboard.press("Escape");
  }
}
