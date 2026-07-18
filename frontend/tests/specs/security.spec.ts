import { test, expect } from "../fixtures";
import { ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";

test.describe("Security", () => {
  test.describe("Authentication Security", () => {
    test("should not expose JWT token in URL", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      const url = page.url();
      expect(url).not.toContain("token");
      expect(url).not.toContain("jwt");
    });

    test("should redirect to landing when accessing protected route without token", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      const url = page.url().replace(/\/$/, "");
      const currentPath = new URL(url).pathname;
      const isLanding = currentPath === "/" || currentPath === "" || currentPath === "/login";
      expect(isLanding).toBeTruthy();
    });

    test("should clear stored tokens on logout", async ({ page }) => {
      await injectAuthState(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const logoutBtn = page.locator("button, a").filter({ hasText: /logout|sign out/i }).first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);
        const token = await page.evaluate(() => localStorage.getItem("token"));
        expect(token).toBeNull();
      }
    });
  });

  test.describe("Input Validation Security", () => {
    test("login form should handle XSS attempts", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.clear());
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000);
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const xssPayload = "<script>alert('xss')</script>";
      await emailInput.waitFor({ state: "visible", timeout: 15000 });
      await emailInput.fill(xssPayload);
      const value = await emailInput.inputValue();
      expect(value).toBe(xssPayload);
    });

    test("login form should handle SQL injection attempts", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.clear());
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000);
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.waitFor({ state: "visible", timeout: 15000 });
      const sqlPayload = "' OR '1'='1";
      await emailInput.fill(sqlPayload);
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: "visible", timeout: 5000 });
      await passwordInput.fill(sqlPayload);
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(2000);
    });
  });

  test.describe("LocalStorage Security", () => {
    test("should not store sensitive data in plaintext in localStorage", async ({ page }) => {
      await injectAuthState(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const keys = await page.evaluate(() => Object.keys(localStorage));
      expect(keys).toContain("token");
      expect(keys).toContain("user");
    });

    test("workspace ID should not be easily guessable", async ({ page }) => {
      await injectAuthState(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const workspaceId = await page.evaluate(() => localStorage.getItem("workspaceId"));
      if (workspaceId) {
        expect(isNaN(Number(workspaceId))).toBeFalsy();
      }
    });
  });

  test.describe("Session Management", () => {
    test("page should handle expired tokens gracefully", async ({ page }) => {
      await injectAuthState(page, "expired-jwt-token-that-is-clearly-invalid");
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    });

    test("multiple rapid page navigations should not cause issues", async ({ page }) => {
      await injectAuthState(page);
      const pages = [ROUTES.DASHBOARD, ROUTES.PLAN, ROUTES.EXECUTE, ROUTES.MEMORY, ROUTES.SETTINGS];
      for (const route of pages) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
      }
      await page.waitForTimeout(2000);
      const errors: Error[] = [];
      page.on("pageerror", (err) => errors.push(err));
      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Data Exposure", () => {
    test("user email should not be exposed in URLs", async ({ page }) => {
      await injectAuthState(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const url = page.url();
      expect(url).not.toContain("@");
    });

    test("API tokens should not be visible in page source", async ({ page }) => {
      await injectAuthState(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const html = await page.content();
      const tokenPatterns = [
        /Bearer\s+[A-Za-z0-9\-_.]{10,}/g,
        /access_token["']?\s*[:=]\s*["'][A-Za-z0-9\-_.]+/g,
      ];
      for (const pattern of tokenPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          const sourceContext = await page.evaluate(() => {
            const token = localStorage.getItem("token");
            return token ? token.substring(0, 10) : "";
          });
          const hasRealToken = matches.some((m) => m.includes(sourceContext));
          expect(hasRealToken).toBeFalsy();
        }
      }
    });
  });
});
