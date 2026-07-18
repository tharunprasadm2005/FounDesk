import { Page } from "@playwright/test";

export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function setLocalStorageItem(page: Page, key: string, value: string) {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  );
}

export async function removeLocalStorageItem(page: Page, key: string) {
  await page.evaluate((k) => localStorage.removeItem(k), key);
}

export async function clearAllLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

export function generateUniqueEmail(): string {
  const ts = Date.now();
  return `e2e-${ts}@foundesk-test.com`;
}

export function generateStrongPassword(): string {
  return `Test@${Date.now()}!Xy`;
}
