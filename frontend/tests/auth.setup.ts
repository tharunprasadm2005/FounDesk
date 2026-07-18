import { test as setup } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.resolve(__dirname, ".auth/user.json");

setup("inject auth state directly", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("https://foundesk.onrender.com/", { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.evaluate(() => {
    localStorage.setItem("token", "e2e-test-mock-token-for-playwright");
    localStorage.setItem("user", JSON.stringify({
      id: 9999,
      name: "E2E Test User",
      email: "e2e-test@foundesk-test.com",
      picture: "https://ui-avatars.com/api/?name=E2E+Test+User",
    }));
    localStorage.setItem("workspaceId", "1");
    localStorage.setItem("sidebar_collapsed", "false");
  });

  await page.context().addInitScript(() => {
    localStorage.setItem("token", "e2e-test-mock-token-for-playwright");
    localStorage.setItem("user", JSON.stringify({
      id: 9999,
      name: "E2E Test User",
      email: "e2e-test@foundesk-test.com",
      picture: "https://ui-avatars.com/api/?name=E2E+Test+User",
    }));
    localStorage.setItem("workspaceId", "1");
    localStorage.setItem("sidebar_collapsed", "false");
  });

  await page.context().storageState({ path: AUTH_FILE });
  console.log("Auth state created at", AUTH_FILE);
  await page.close();
});
