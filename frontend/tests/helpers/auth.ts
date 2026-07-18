import { Page } from "@playwright/test";

const BASE_URL = "https://foundesk.onrender.com";

const MOCK_USER = {
  id: 1,
  email: "test@foundesk.com",
  name: "Test User",
  picture: "https://ui-avatars.com/api/?name=Test+User",
};

const MOCK_WORKSPACE = {
  id: 1,
  name: "Test Workspace",
  stage: "Build",
  creator_id: 1,
};

export async function injectAuthState(page: Page, token = "mock-jwt-token-for-testing") {
  await page.addInitScript(
    ({ token, user, workspace }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("workspaceId", String(workspace.id));
      localStorage.setItem("sidebar_collapsed", "false");
    },
    { token, user: MOCK_USER, workspace: MOCK_WORKSPACE }
  );
}

export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("workspaceId");
  });
}

export function getMockUser() {
  return MOCK_USER;
}

export function getMockWorkspace() {
  return MOCK_WORKSPACE;
}
