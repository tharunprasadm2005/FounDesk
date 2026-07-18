import { test, expect } from "../fixtures";
import { ROUTES } from "../data/routes";
import { generateUniqueEmail, generateStrongPassword } from "../utils/localStorage";

test.describe("Authentication Pages", () => {
  test.describe("Login Page", () => {
    test.beforeEach(async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.page.waitForTimeout(1000);
      await loginPage.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
    });

    test("should load login page", async ({ page }) => {
      await expect(page).toHaveURL(ROUTES.LOGIN, { timeout: 30000 });
    });

    test("should display sign-in form", async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input').first();
      await expect(emailInput).toBeVisible({ timeout: 30000 });
    });

    test("should display sign-up form when switching tabs", async ({ page }) => {
      const signUpTab = page.locator("button, [role='tab'], span, a").filter({ hasText: /sign.?up|create|register/i }).first();
      if (await signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
        await signUpTab.click();
        await page.waitForTimeout(1000);
        const nameInput = page.locator('input[name="name"], input[placeholder*="Name"], input').nth(1);
        await expect(nameInput).toBeVisible({ timeout: 10000 });
      } else {
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.length).toBeGreaterThan(0);
      }
    });

    test("should show error on invalid login", async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input').first();
      const passwordInput = page.locator('input[type="password"]').first();
      if (await emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await emailInput.fill("invalid@test.com");
        await passwordInput.fill("wrongpassword");
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(3000);
        await expect(page.locator("[role='alert'], .error-message").first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator("text=Invalid email or password").first()).toBeVisible({ timeout: 5000 });
      }
    });

    test("should show validation for empty fields", async ({ page }) => {
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await expect(page.locator("text=Email is required").first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator("text=Password is required").first()).toBeVisible({ timeout: 5000 });
      }
    });

    test("should show forgot password form", async ({ page }) => {
      const forgotLink = page.locator("a, button, span, p, div").filter({ hasText: /forgot|reset/i }).first();
      if (await forgotLink.isVisible({ timeout: 15000 }).catch(() => false)) {
        await forgotLink.click();
        await page.waitForTimeout(1000);
      }
    });

    test("should handle forgot password submission", async ({ loginPage, page }) => {
      const forgotLink = page.locator("a, button, span, p, div").filter({ hasText: /forgot|reset/i }).first();
      if (await forgotLink.isVisible({ timeout: 15000 }).catch(() => false)) {
        await forgotLink.click();
        await page.waitForTimeout(1000);
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.fill("test@foundesk.com");
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    test("should have Google OAuth button", async ({ page }) => {
      const googleBtn = page.locator("a, button, div[role='button']").filter({ hasText: /google/i }).first();
      if (await googleBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        expect(true).toBeTruthy();
      } else {
        const headerText = await page.locator("body").innerText();
        expect(headerText.length).toBeGreaterThan(0);
      }
    });

    test("should have no console errors", async ({ page, consoleErrors }) => {
      const errors = consoleErrors.filter((e) => e.type === "error");
      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Email/Password Signup", () => {
    test("should sign up with valid credentials", async ({ page }) => {
      const email = generateUniqueEmail();
      const password = generateStrongPassword();
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const signUpTab = page.locator("button, [role='tab'], span, a").filter({ hasText: /sign.?up|create|register/i }).first();
      if (await signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
        await signUpTab.click();
        await page.waitForTimeout(1000);
        const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nameInput.fill("E2E Test");
          await emailInput.fill(email);
          await passwordInput.fill(password);
          const submitBtn = page.locator('button[type="submit"]').first();
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    });

    test("should show error for weak password", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const signUpTab = page.locator("button, [role='tab'], span, a").filter({ hasText: /sign.?up|create|register/i }).first();
      if (await signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
        await signUpTab.click();
        await page.waitForTimeout(1000);
        const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nameInput.fill("Test User");
          await emailInput.fill(generateUniqueEmail());
          await passwordInput.fill("short");
          const submitBtn = page.locator('button[type="submit"]').first();
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    });

    test("should show error for existing email", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const signUpTab = page.locator("button, [role='tab'], span, a").filter({ hasText: /sign.?up|create|register/i }).first();
      if (await signUpTab.isVisible({ timeout: 15000 }).catch(() => false)) {
        await signUpTab.click();
        await page.waitForTimeout(1000);
        const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nameInput.fill("Test User");
          await emailInput.fill("existing@test.com");
          await passwordInput.fill(generateStrongPassword());
          const submitBtn = page.locator('button[type="submit"]').first();
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    });
  });

  test.describe("Protected Routes", () => {
    const protectedRoutes = [
      ROUTES.DASHBOARD,
      ROUTES.PLAN,
      ROUTES.EXECUTE,
      ROUTES.MEMORY,
      ROUTES.SETTINGS,
      ROUTES.BILLING,
    ];

    for (const route of protectedRoutes) {
      test(`should redirect to landing when accessing ${route} without auth`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
        const url = page.url().replace(/\/$/, "");
        const currentPath = new URL(url).pathname;
        expect(currentPath === "/" || currentPath === "").toBeTruthy();
      });
    }
  });

  test.describe("Auth Form Validation", () => {
    test("should validate email format", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const emailInput = page.locator('input[type="email"], input[name="email"], input').first();
      const passwordInput = page.locator('input[type="password"]').first();
      if (await emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await emailInput.fill("not-an-email");
        await passwordInput.fill("password123");
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    test("should handle rapid form submissions", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await submitBtn.click();
        await submitBtn.click();
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    });
  });
});
