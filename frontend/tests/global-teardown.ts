import { FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  console.log("--- Global Teardown: FounDesk E2E Tests ---");
}

export default globalTeardown;
