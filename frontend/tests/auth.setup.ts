import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.resolve(__dirname, ".auth/user.json");

setup("inject auth state directly", async () => {
  const authData = {
    cookies: [],
    origins: [
      {
        origin: "https://foundesk.onrender.com",
        localStorage: [
          { name: "token", value: "e2e-test-mock-token-for-playwright" },
          { name: "user", value: JSON.stringify({
            id: 9999,
            name: "E2E Test User",
            email: "e2e-test@foundesk-test.com",
            picture: "https://ui-avatars.com/api/?name=E2E+Test+User",
          })},
          { name: "workspaceId", value: "1" },
          { name: "sidebar_collapsed", value: "false" },
        ],
      },
    ],
  };

  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
  console.log("Auth state created at", AUTH_FILE);
});
