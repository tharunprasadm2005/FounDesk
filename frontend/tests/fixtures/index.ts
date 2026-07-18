import { test as base, Page } from "@playwright/test";
import { LandingPage } from "../page-objects/LandingPage";
import { LoginPage } from "../page-objects/LoginPage";
import { DashboardPage } from "../page-objects/DashboardPage";
import { GoalsPage } from "../page-objects/GoalsPage";
import { ExecutePage } from "../page-objects/ExecutePage";
import { MemoryPage } from "../page-objects/MemoryPage";
import { SettingsPage } from "../page-objects/SettingsPage";
import { BillingPage } from "../page-objects/BillingPage";
import { AppLayout } from "../page-objects/AppLayout";
import { setupConsoleMonitor } from "../helpers/console";
import { setupNetworkMonitor } from "../helpers/network";
import { mockAllApi } from "../helpers/api-mocks";

type Fixtures = {
  landingPage: LandingPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  goalsPage: GoalsPage;
  executePage: ExecutePage;
  memoryPage: MemoryPage;
  settingsPage: SettingsPage;
  billingPage: BillingPage;
  appLayout: AppLayout;
  consoleErrors: Array<{ type: string; text: string }>;
  networkFailures: Array<{ url: string; status: number }>;
  withMocks: void;
};

export const test = base.extend<Fixtures>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  goalsPage: async ({ page }, use) => {
    await use(new GoalsPage(page));
  },
  executePage: async ({ page }, use) => {
    await use(new ExecutePage(page));
  },
  memoryPage: async ({ page }, use) => {
    await use(new MemoryPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  billingPage: async ({ page }, use) => {
    await use(new BillingPage(page));
  },
  appLayout: async ({ page }, use) => {
    await use(new AppLayout(page));
  },

  consoleErrors: async ({ page }, use) => {
    const errors: Array<{ type: string; text: string }> = [];
    const cleanup = setupConsoleMonitor(page, (type, text) => {
      errors.push({ type, text });
    });
    await use(errors);
    cleanup();
  },

  networkFailures: async ({ page }, use) => {
    const failures: Array<{ url: string; status: number }> = [];
    const cleanup = setupNetworkMonitor(page, (url, status) => {
      failures.push({ url, status });
    });
    await use(failures);
    cleanup();
  },

  withMocks: async ({ page }, use) => {
    await mockAllApi(page);
    await use();
  },
});

export { expect } from "@playwright/test";
export type { Page, BrowserContext } from "@playwright/test";
