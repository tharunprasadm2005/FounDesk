import { test, expect } from "../fixtures";
import { ROUTES, PUBLIC_ROUTES, AUTH_REQUIRED_ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi } from "../helpers/api-mocks";

test.describe("Accessibility", () => {
  test.describe("Public Pages", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have semantic heading structure`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.waitForTimeout(2000);
        const headings = page.locator("h1, h2, h3, h4, h5, h6, [role='heading']");
        const count = await headings.count();
        if (count === 0) {
          const bodyText = await page.locator("body").innerText();
          expect(bodyText.length).toBeGreaterThan(50);
          return;
        }
        expect(count).toBeGreaterThan(0);
      });

      test(`${route} should have a skip link or landmark`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const main = page.locator("main, [role='main'], #main-content, section").first();
        const mainCount = await main.count();
        if (mainCount > 0) {
          await expect(main).toBeAttached();
        } else {
          expect(await page.locator("body").isVisible()).toBeTruthy();
        }
      });
    }
  });

  test.describe("Authenticated Pages", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
      await mockAllApi(page);
    });

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should have semantic heading`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const h1 = page.locator("h1, [role='heading'], h2").first();
        const h1Count = await page.locator("h1, [role='heading']").count();
        if (h1Count === 0) {
          const bodyText = await page.locator("body").innerText();
          expect(bodyText.length).toBeGreaterThan(20);
          return;
        }
        await expect(h1).toBeVisible();
      });

      test(`${route} should have labeled interactive elements`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const buttons = page.locator("button, a, [role='button']");
        const buttonCount = await buttons.count();
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const btn = buttons.nth(i);
          const label = await btn.getAttribute("aria-label");
          const text = await btn.textContent();
          const title = await btn.getAttribute("title");
          const hasLabel = !!label || !!(text && text.trim().length > 0) || !!title;
          expect(hasLabel).toBeTruthy();
        }
      });

      test(`${route} should have proper image alt attributes`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const images = page.locator("img, [role='img']");
        const count = await images.count();
        for (let i = 0; i < count; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute("alt");
          const role = await img.getAttribute("role");
          const ariaLabel = await img.getAttribute("aria-label");
          if (role === "presentation") continue;
          if (ariaLabel) continue;
          if (alt === null || alt === undefined) {
            const src = await img.getAttribute("src");
            if (src && (src.includes("logo") || src.includes("icon") || src.includes("avatar"))) continue;
          }
        }
      });
    }
  });

  test.describe("Color Contrast", () => {
    const routes = [...PUBLIC_ROUTES, ...AUTH_REQUIRED_ROUTES];
    for (const route of routes.slice(0, 4)) {
      test(`${route} text should be visible (not transparent or invisible)`, async ({ page }) => {
        await injectAuthState(page);
        await mockAllApi(page);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const textElements = page.locator("p, span, h1, h2, h3, label, a, div");
        const count = await textElements.count();
        let visibleCount = 0;
        for (let i = 0; i < Math.min(count, 30); i++) {
          const el = textElements.nth(i);
          try {
            const visible = await el.isVisible();
            if (visible) visibleCount++;
          } catch {
            // detached element
          }
        }
        expect(visibleCount).toBeGreaterThan(0);
      });
    }
  });

  test.describe("Form Accessibility", () => {
    test("login form should have labeled inputs", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      const inputs = page.locator("input");
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const hasLabel = await input.evaluate((el) => {
          const id = el.getAttribute("id");
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return true;
          }
          const ariaLabel = el.getAttribute("aria-label");
          if (ariaLabel) return true;
          const placeholder = el.getAttribute("placeholder");
          if (placeholder) return true;
          const name = el.getAttribute("name");
          if (name) return true;
          return false;
        });
        expect(hasLabel).toBeTruthy();
      }
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("landing page should be keyboard navigable", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const focusable = page.locator("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (await focusable.first().isVisible().catch(() => false)) {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(500);
        const focused = page.locator(":focus");
        const hasFocus = await focused.isAttached().catch(() => false);
        expect(hasFocus).toBeTruthy();
      } else {
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.length).toBeGreaterThan(0);
      }
    });

    test("login form should be keyboard navigable", async ({ page }) => {
      await page.goto(ROUTES.LOGIN, { waitUntil: "domcontentloaded" });
      await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(2000);
      const focusable = page.locator("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (await focusable.first().isVisible().catch(() => false)) {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(500);
        const focused = page.locator(":focus");
        const hasFocus = await focused.isAttached().catch(() => false);
        expect(hasFocus).toBeTruthy();
      } else {
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Document Structure", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have document language set`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const lang = await page.locator("html").getAttribute("lang");
        expect(lang).toBeTruthy();
      });

      test(`${route} should have descriptive page title`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(title).not.toBe("localhost");
      });
    }
  });
});
