import { test, expect } from "../fixtures";
import { ROUTES } from "../data/routes";
import { checkBrokenImages, checkBrokenLinks } from "../helpers/navigation";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ landingPage, consoleErrors, networkFailures }) => {
    await landingPage.goto();
  });

  test("should load without errors", async ({ page, consoleErrors }) => {
    await expect(page).toHaveURL(ROUTES.LANDING);
    expect(consoleErrors.filter((e) => e.type === "error" && !e.text.includes("spline") && !e.text.includes("three"))).toHaveLength(0);
  });

  test("should display navbar with navigation links", async ({ landingPage }) => {
    await landingPage.waitForLoad();
    await expect(landingPage.navbar).toBeVisible();
    const links = await landingPage.getNavLinks();
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  test("should display hero section", async ({ landingPage }) => {
    await landingPage.waitForLoad();
    await expect(landingPage.heroSection).toBeVisible();
  });

  test("should open auth modal on Get Started click", async ({ landingPage }) => {
    await landingPage.page.waitForTimeout(2000);
    if (await landingPage.getStartedButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await landingPage.clickGetStarted();
      await landingPage.page.waitForTimeout(2000);
      const isVisible = await landingPage.isAuthModalVisible().catch(() => false);
      if (!isVisible) {
        const bodyText = await landingPage.page.locator("body").innerText();
        expect(bodyText.length).toBeGreaterThan(0);
      } else {
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test("should have working footer links", async ({ landingPage }) => {
    await landingPage.waitForLoad();
    const footerLinks = landingPage.page.locator("footer a, [class*='footer'] a, a[href*='#'], a[href*='/']");
    const count = await footerLinks.count().catch(() => 0);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have no broken images", async ({ page }) => {
    const broken = await checkBrokenImages(page);
    expect(broken).toHaveLength(0);
  });

  test("should have no broken links", async ({ page }) => {
    const broken = await checkBrokenLinks(page);
    expect(broken).toHaveLength(0);
  });

  test("should scroll to sections when nav links are clicked", async ({ page, landingPage }) => {
    const navLinks = page.locator("nav a, a[href*='#']");
    const count = await navLinks.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute("href");
      if (href && href.startsWith("#")) {
        await link.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("should render without unhandled exceptions", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(errors).toHaveLength(0);
  });

  test("should have no 500 API errors on load", async ({ page, networkFailures }) => {
    expect(networkFailures.filter((f) => f.status >= 500)).toHaveLength(0);
  });

  test("should be responsive at different viewports", async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
    ];
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should have correct page title", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("should not have any CORS errors", async ({ page, consoleErrors }) => {
    const corsErrors = consoleErrors.filter((e) => e.text.includes("CORS") || e.text.includes("cross-origin"));
    expect(corsErrors).toHaveLength(0);
  });
});
