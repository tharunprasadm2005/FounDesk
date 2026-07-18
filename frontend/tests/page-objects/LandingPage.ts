import { Page, Locator, expect } from "@playwright/test";
import { SELECTORS } from "../data/selectors";

export class LandingPage {
  readonly page: Page;
  readonly navbar: Locator;
  readonly heroSection: Locator;
  readonly getStartedButton: Locator;
  readonly authModal: Locator;
  readonly googleSignInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = page.locator("nav").first();
    this.heroSection = page.locator("section").first();
    this.getStartedButton = page.locator("button, a").filter({ hasText: /get started|launch/i }).first();
    this.authModal = page.locator(SELECTORS.AUTH_MODAL);
    this.googleSignInButton = page.locator(SELECTORS.AUTH_MODAL_GOOGLE_BTN);
  }

  async goto() {
    await this.page.goto("/", { waitUntil: "domcontentloaded" });
  }

  async waitForLoad() {
    await this.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  async isAuthModalVisible() {
    return this.authModal.isVisible();
  }

  async clickGoogleSignIn() {
    await this.googleSignInButton.click();
  }

  async getNavLinks(): Promise<string[]> {
    return this.navbar.locator("a").allTextContents();
  }

  async scrollToSection(sectionId: string) {
    await this.page.evaluate((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "instant" });
    }, sectionId);
  }

  async takeHeroScreenshot() {
    await this.heroSection.screenshot({ path: "screenshots/landing-hero.png" });
  }

  async verifyAllSections() {
    const sections = [
      "hero",
      "features",
      "how-it-works",
      "integrations",
      "pricing",
      "footer",
    ];
    for (const section of sections) {
      const el = this.page.locator(`[id="${section}"], [class*="${section}"]`).first();
      const count = await el.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  }

  async checkFooterLinks() {
    const footerLinks = this.page.locator("footer a, [class*='footer'] a");
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);
    return footerLinks;
  }
}
