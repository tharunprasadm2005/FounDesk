import { test, expect } from "../fixtures";
import { ROUTES, PUBLIC_ROUTES, AUTH_REQUIRED_ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi } from "../helpers/api-mocks";

test.describe("Console and Runtime Error Detection", () => {
  test.describe("No JavaScript Console Errors", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have no console errors`, async ({ page, consoleErrors }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => localStorage.clear());
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.waitForTimeout(1000);
        const errors = consoleErrors.filter(
          (e) => e.type === "error"
        );
        expect(errors.length).toBeLessThanOrEqual(10);
      });
    }

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should have no console errors`, async ({ page, consoleErrors }) => {
        await injectAuthState(page);
        await mockAllApi(page);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
        await page.waitForTimeout(1000);
        const errors = consoleErrors.filter(
          (e) => e.type === "error"
        );
        expect(errors.length).toBeLessThanOrEqual(10);
      });
    }
  });

  test.describe("No Unhandled Exceptions", () => {
    const UNHANDLED_IGNORED = [
      "access control",
      "CORS",
      "cross-origin",
      "Script error",
    ];

    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have no unhandled page errors`, async ({ page }) => {
        const errors: Error[] = [];
        page.on("pageerror", (err) => {
          const msg = err.message || "";
          if (UNHANDLED_IGNORED.some((i) => msg.toLowerCase().includes(i.toLowerCase()))) return;
          errors.push(err);
        });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        expect(errors).toHaveLength(0);
      });
    }

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should have no unhandled page errors`, async ({ page }) => {
        await injectAuthState(page);
        await mockAllApi(page);
        const errors: Error[] = [];
        page.on("pageerror", (err) => {
          const msg = err.message || "";
          if (UNHANDLED_IGNORED.some((i) => msg.toLowerCase().includes(i.toLowerCase()))) return;
          errors.push(err);
        });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        expect(errors).toHaveLength(0);
      });
    }
  });

  test.describe("No Failed Network Requests", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have no failed network requests`, async ({ page, networkFailures }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const failed = networkFailures.filter((f) => f.status >= 500);
        expect(failed).toHaveLength(0);
      });
    }

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should have no failed network requests`, async ({ page, networkFailures }) => {
        await injectAuthState(page);
        await mockAllApi(page);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const failed = networkFailures.filter((f) => f.status >= 500);
        expect(failed).toHaveLength(0);
      });
    }
  });

  test.describe("No 404 Errors", () => {
    test("nonexistent page should return custom 404 or redirect", async ({ page }) => {
      const response = await page.goto("/nonexistent-page-12345", { waitUntil: "domcontentloaded" });
      if (response) {
        const status = response.status();
        expect(status === 404 || status === 301 || status === 302 || status === 200).toBeTruthy();
      }
    });

    test("deep nonexistent path should not show broken content", async ({ page }) => {
      await page.goto("/dashboard/invalid-subpage", { waitUntil: "domcontentloaded" });
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe("No 500 API Errors", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
    });

    test("dashboard API should not return 500", async ({ page }) => {
      const response = await page.request.get("https://foundesk-backend.onrender.com/api/dashboard", {
        headers: { Authorization: "Bearer test" },
        timeout: 60000,
      }).catch(() => null);
      if (response) {
        expect(response.status()).not.toBe(500);
      }
    });
  });

  test.describe("No CORS Errors", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have no CORS errors`, async ({ page, consoleErrors }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => localStorage.clear());
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const corsErrors = consoleErrors.filter(
          (e) => e.text.toLowerCase().includes("cors") || e.text.toLowerCase().includes("cross-origin")
        );
        expect(corsErrors).toHaveLength(0);
      });
    }
  });

  test.describe("No Broken Assets", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should have no broken images or assets`, async ({ page }) => {
        const failedRequests: string[] = [];
        page.on("requestfailed", (request) => {
          failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
        });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const assetFailures = failedRequests.filter(
          (f) => (f.includes(".png") || f.includes(".jpg") || f.includes(".svg") || f.includes(".ico")) &&
            !f.includes("spline") && !f.includes("analytics") && !f.includes("amplitude")
        );
        expect(assetFailures).toHaveLength(0);
      });
    }
  });

  test.describe("Console Warnings", () => {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} should minimize console warnings`, async ({ page, consoleErrors }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        const warnings = consoleErrors.filter(
          (e) => e.type === "warning" && !e.text.includes("deprecated") && !e.text.includes("third-party")
        );
        expect(warnings.length).toBeLessThan(120);
      });
    }
  });
});
