import { Page, expect } from "@playwright/test";

export type NavLink = {
  label: string;
  href: string;
  icon?: string;
};

export const SIDEBAR_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Plan", href: "/plan", icon: "Target" },
  { label: "Execute", href: "/execute", icon: "ListChecks" },
  { label: "Memory", href: "/memory", icon: "Brain" },
  { label: "Settings", href: "/settings", icon: "Settings" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
];

export async function verifyPageLoads(page: Page, url: string, headingPattern?: string | RegExp) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (headingPattern) {
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 10000 });
  }
}

export async function checkBrokenLinks(page: Page): Promise<string[]> {
  const broken: string[] = [];
  const links = await page.locator("a[href]").all();
  for (const link of links) {
    const href = await link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const response = await page.request.get(href);
      if (!response.ok() && response.status() !== 304) {
        broken.push(`${href} (${response.status()})`);
      }
    } catch {
      broken.push(`${href} (failed)`);
    }
  }
  return broken;
}

export async function checkBrokenImages(page: Page): Promise<string[]> {
  const broken: string[] = [];
  const images = await page.locator("img[src]").all();
  for (const img of images) {
    const src = await img.getAttribute("src");
    if (!src) continue;
    const fullUrl = src.startsWith("http") ? src : `https://foundesk.onrender.com${src.startsWith("/") ? "" : "/"}${src}`;
    try {
      const response = await page.request.get(fullUrl);
      if (!response.ok()) {
        broken.push(`${src} (${response.status()})`);
      }
    } catch {
      broken.push(`${src} (failed)`);
    }
  }
  return broken;
}
