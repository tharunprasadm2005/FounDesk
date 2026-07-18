import { test as teardown } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

teardown("cleanup auth state", async () => {
  const fs = await import("fs");
  const authFile = path.resolve(__dirname, ".auth/user.json");
  try {
    await fs.promises.unlink(authFile);
    console.log("Auth state cleaned up");
  } catch {
    console.log("No auth file to clean up");
  }
});
