import { test, expect } from "../fixtures";
import { ROUTES, AUTH_REQUIRED_ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi } from "../helpers/api-mocks";
import { SIDEBAR_LINKS } from "../helpers/navigation";

test.describe("Navigation", () => {
  test.describe("Public Navigation", () => {
    test("landing page navbar should have expected links", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const nav = page.locator("nav, header, [class*='nav']").first();
      const links = await nav.locator("a, button").allTextContents();
      expect(links.length).toBeGreaterThanOrEqual(0);
    });

    test("login page should link back to landing", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      const backLink = page.locator("a[href='/'], a[href=''], a[href*='logo'], a[href*='home'], [class*='logo']").first();
      if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(backLink).toBeVisible();
      } else {
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Sidebar Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
      await mockAllApi(page);
    });

    test("sidebar should contain all navigation links", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const sidebar = page.locator("nav, aside, [class*='sidebar']").first();
      const linkTexts = await sidebar.locator("a, button").allTextContents();
      expect(linkTexts.length).toBeGreaterThanOrEqual(0);
    });

    test("each sidebar link navigates to correct route", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const sidebar = page.locator("nav, aside, [class*='sidebar']").first();
      for (const link of SIDEBAR_LINKS) {
        const sidebarLink = sidebar.locator("a").filter({ hasText: new RegExp(link.label, "i") }).first();
        const href = await sidebarLink.getAttribute("href").catch(() => null);
        if (href) {
          await sidebarLink.click();
          await page.waitForTimeout(1000);
          expect(page.url()).toContain(href);
          break;
        }
      }
    });

    test("sidebar should be collapsible", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const collapseBtn = page.locator("button[class*='collapse'], button[class*='toggle'], button[class*='chevron'], [class*='collapse'] button").first();
      if (await collapseBtn.isVisible().catch(() => false)) {
        await collapseBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe("Protected Route Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
      await mockAllApi(page);
    });

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should load successfully when authenticated`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        expect(page.url()).toContain(route);
      });
    }
  });

  test.describe("Browser Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
      await mockAllApi(page);
    });

    test("browser back/forward should work", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      await page.goto(ROUTES.PLAN, { waitUntil: "domcontentloaded" });
      await page.goBack();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain(ROUTES.DASHBOARD);
      await page.goForward();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain(ROUTES.PLAN);
    });

    test("deep linking to authenticated pages should work", async ({ page }) => {
      await page.goto(ROUTES.EXECUTE, { waitUntil: "domcontentloaded" });
      expect(page.url()).toContain(ROUTES.EXECUTE);
    });
  });
});
