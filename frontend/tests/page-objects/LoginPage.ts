import { Page, Locator, expect } from "@playwright/test";
import { SELECTORS } from "../data/selectors";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly signInTab: Locator;
  readonly signUpTab: Locator;
  readonly forgotPasswordLink: Locator;
  readonly googleSignInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator(SELECTORS.LOGIN_EMAIL_INPUT);
    this.passwordInput = page.locator(SELECTORS.LOGIN_PASSWORD_INPUT);
    this.nameInput = page.locator(SELECTORS.LOGIN_NAME_INPUT);
    this.submitButton = page.locator(SELECTORS.LOGIN_SUBMIT_BTN);
    this.signInTab = page.locator(SELECTORS.LOGIN_SIGNIN_TAB);
    this.signUpTab = page.locator(SELECTORS.LOGIN_SIGNUP_TAB);
    this.forgotPasswordLink = page.locator(SELECTORS.LOGIN_FORGOT_LINK);
    this.googleSignInButton = page.locator("button:has-text('Google'), a:has-text('Google')").first();
  }

  async goto() {
    await this.page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  }

  async signIn(email: string, password: string) {
    await this.page.waitForTimeout(2000);
    if (await this.signInTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.signInTab.click();
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async signUp(name: string, email: string, password: string) {
    if (await this.signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.signUpTab.click();
    }
    await this.page.waitForTimeout(500);
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async switchToSignUp() {
    if (await this.signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.signUpTab.click();
    }
  }

  async switchToSignIn() {
    if (await this.signInTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.signInTab.click();
    }
  }

  async clickForgotPassword() {
    if (await this.forgotPasswordLink.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.forgotPasswordLink.click();
    }
  }

  async fillForgotPassword(email: string) {
    const emailField = this.page.locator('input[type="email"]');
    await emailField.fill(email);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    const error = this.page.locator(SELECTORS.ERROR_MESSAGE).first();
    if (await error.isVisible().catch(() => false)) {
      return error.textContent();
    }
    return null;
  }

  async waitForRedirect() {
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  async isRedirectedToDashboard(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/dashboard/, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isLoginFormVisible(): Promise<boolean> {
    return this.emailInput.isVisible().catch(() => false);
  }
}
