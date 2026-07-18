import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("--- Global Setup: FounDesk E2E Tests ---");
  process.env.BASE_URL = "https://foundesk.onrender.com";
  process.env.API_URL = "https://foundesk.onrender.com/api";
}

export default globalSetup;
