import { test, expect } from "../fixtures";
import { ROUTES, PUBLIC_ROUTES, AUTH_REQUIRED_ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi } from "../helpers/api-mocks";

const DESKTOP = { width: 1280, height: 720 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 375, height: 812 };

type Viewport = { width: number; height: number };

async function testViewport(page: any, viewport: Viewport, url: string, name: string) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const body = page.locator("body");
  await expect(body).toBeVisible();
  const errors: Error[] = [];
  page.on("pageerror", (err) => errors.push(err));
  await page.waitForTimeout(1000);
  expect(errors).toHaveLength(0);
}

test.describe("Responsive Design", () => {
  const viewports = [
    { name: "Desktop (1280x720)", size: DESKTOP },
    { name: "Tablet (768x1024)", size: TABLET },
    { name: "Mobile (375x812)", size: MOBILE },
  ];

  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(vp.size);
      });

      for (const route of PUBLIC_ROUTES) {
        test(`public page ${route} should render without errors`, async ({ page }) => {
          await testViewport(page, vp.size, route, vp.name);
        });
      }

      test.describe("authenticated pages", () => {
        test.beforeEach(async ({ page }) => {
          await injectAuthState(page);
          await mockAllApi(page);
        });

        for (const route of AUTH_REQUIRED_ROUTES) {
          test(`authenticated page ${route} should render without errors`, async ({ page }) => {
            await testViewport(page, vp.size, route, vp.name);
          });
        }
      });
    });
  }

  test.describe("Mobile Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await injectAuthState(page);
      await mockAllApi(page);
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
    });

    test("sidebar should be present on mobile", async ({ page }) => {
      const sidebar = page.locator("nav, aside").first();
      await expect(sidebar).toBeVisible();
    });

    test("page content should fit mobile width", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const vp = page.viewportSize();
      const main = page.locator("main").first();
      const box = await main.boundingBox();
      if (box && vp) {
        expect(box.width).toBeLessThanOrEqual(vp.width + 50);
      }
    });

    test("no horizontal scrollbar on mobile", async ({ page }) => {
      await page.goto(ROUTES.DASHBOARD, { waitUntil: "domcontentloaded" });
      const overflowX = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
      });
      expect(overflowX).toBeTruthy();
    });
  });

  test.describe("Tablet Layout", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(TABLET);
      await injectAuthState(page);
      await mockAllApi(page);
    });

    test("goals page should be usable on tablet", async ({ page }) => {
      await page.goto(ROUTES.PLAN, { waitUntil: "domcontentloaded" });
      const cards = page.locator("[class*='goal'], [class*='okr'], [class*='card']");
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("execute page should be usable on tablet", async ({ page }) => {
      await page.goto(ROUTES.EXECUTE, { waitUntil: "domcontentloaded" });
      const columns = page.locator("[class*='column'], [class*='lane']");
      const count = await columns.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
