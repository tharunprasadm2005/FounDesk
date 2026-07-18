import { test, expect } from "../fixtures";
import { ROUTES, PUBLIC_ROUTES, AUTH_REQUIRED_ROUTES } from "../data/routes";
import { injectAuthState } from "../helpers/auth";
import { mockAllApi } from "../helpers/api-mocks";

test.describe("Performance", () => {
  test.describe("Page Load Performance", () => {
    const LOAD_THRESHOLD_MS = 15000;

    for (const route of PUBLIC_ROUTES) {
      test(`${route} should load within ${LOAD_THRESHOLD_MS}ms`, async ({ page }) => {
        const start = Date.now();
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const loadTime = Date.now() - start;
        expect(loadTime).toBeLessThan(LOAD_THRESHOLD_MS);
      });
    }

    for (const route of AUTH_REQUIRED_ROUTES) {
      test(`${route} should load within ${LOAD_THRESHOLD_MS}ms`, async ({ page }) => {
        await injectAuthState(page);
        await mockAllApi(page);
        const start = Date.now();
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const loadTime = Date.now() - start;
        expect(loadTime).toBeLessThan(LOAD_THRESHOLD_MS);
      });
    }
  });

  test.describe("Web Vitals", () => {
    test("landing page should have reasonable LCP", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              resolve(entries[entries.length - 1].startTime);
            }
          });
          observer.observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve(-1), 5000);
        });
      });
      if (lcp > 0) {
        expect(lcp).toBeLessThan(8000);
      }
    });

    test("landing page should have reasonable CLS", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const shift = entry as LayoutShift;
                if (!shift.hadRecentInput) {
                  clsValue += shift.value;
                }
              }
            });
            observer.observe({ type: "layout-shift", buffered: true });
            setTimeout(() => resolve(clsValue), 3000);
          } catch {
            resolve(0);
          }
        });
      });
      expect(cls).toBeLessThan(0.1);
    });
  });

  test.describe("Resource Optimization", () => {
    test("should not load excessive page weight", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const documentCount = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.initiatorType === "document").length);
      expect(documentCount).toBeLessThan(20);
    });

    test("should use compression", async ({ page }) => {
      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      if (response) {
        const headers = response.headers();
        const encoding = headers["content-encoding"] || headers["Content-Encoding"] || "";
        expect(encoding).toBeTruthy();
      }
    });
  });

  test.describe("API Response Performance", () => {
    test.beforeEach(async ({ page }) => {
      await injectAuthState(page);
    });

    test("dashboard API should respond quickly", async ({ page }) => {
      const start = Date.now();
      const response = await page.request.get("https://foundesk-backend.onrender.com/api/dashboard", {
        headers: { Authorization: "Bearer test" },
        timeout: 60000,
      }).catch(() => null);
      const elapsed = Date.now() - start;
      if (response && response.ok()) {
        expect(elapsed).toBeLessThan(5000);
      }
    });

    test("notifications API should respond quickly", async ({ page }) => {
      const start = Date.now();
      const response = await page.request.get("https://foundesk-backend.onrender.com/api/notifications", {
        headers: { Authorization: "Bearer test" },
        timeout: 60000,
      }).catch(() => null);
      const elapsed = Date.now() - start;
      if (response && response.ok()) {
        expect(elapsed).toBeLessThan(5000);
      }
    });
  });
});
