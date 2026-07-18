import { Page } from "@playwright/test";

export async function mockAllApi(page: Page) {
  // Use glob pattern **/api/** to catch requests regardless of base URL
  // The frontend may use different API URLs depending on environment

  await page.route("**/api/auth/**", (route) => {
    const url = route.request().url();
    if (url.includes("me") || url.includes("verify") || url.includes("user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: 1, email: "test@foundesk.com", name: "Test User" } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/dashboard", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        metrics: {
          active_tasks: 12,
          completed_tasks: 48,
          upcoming_events: 5,
          unread_notifications: 3,
        },
        recent_activity: [
          { id: 1, type: "task_completed", title: "Completed market research", timestamp: new Date().toISOString(), actor: "Test User" },
          { id: 2, type: "goal_updated", title: "Q2 Revenue target updated", timestamp: new Date().toISOString(), actor: "Test User" },
        ],
        upcoming_tasks: [
          { id: 1, title: "Review PR #42", due_date: new Date(Date.now() + 86400000).toISOString(), priority: "high" },
          { id: 2, title: "Update documentation", due_date: new Date(Date.now() + 172800000).toISOString(), priority: "medium" },
        ],
      }),
    })
  );

  await page.route("**/api/goals*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, title: "Increase MRR by 30%", description: "Grow monthly recurring revenue through expansion", progress: 65, status: "on_track", due_date: new Date(Date.now() + 30 * 86400000).toISOString(), key_results: [{ id: 1, title: "Close 5 enterprise deals", progress: 60, status: "on_track" }, { id: 2, title: "Reduce churn to <3%", progress: 80, status: "ahead" }] },
        { id: 2, title: "Ship v2.0 Platform", description: "Next major release with integrations", progress: 45, status: "at_risk", due_date: new Date(Date.now() + 60 * 86400000).toISOString(), key_results: [{ id: 3, title: "Complete Slack integration", progress: 90, status: "on_track" }, { id: 4, title: "Launch new dashboard", progress: 30, status: "at_risk" }] },
      ]),
    })
  );

  await page.route("**/api/tasks*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, title: "Design system audit", description: "Review all components for consistency", status: "in_progress", priority: "high", assignee: "Test User", due_date: new Date(Date.now() + 3 * 86400000).toISOString(), labels: ["design", "frontend"] },
        { id: 2, title: "Fix login timeout bug", description: "Users reporting 401 errors after 5min idle", status: "todo", priority: "critical", assignee: "Dev Team", due_date: new Date(Date.now() + 86400000).toISOString(), labels: ["bug", "auth"] },
        { id: 3, title: "Write API documentation", description: "Document all REST endpoints", status: "done", priority: "medium", assignee: "Test User", due_date: new Date(Date.now() - 86400000).toISOString(), labels: ["docs"] },
      ]),
    })
  );

  await page.route("**/api/decisions*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, title: "Use PostgreSQL for primary DB", context: "Evaluated MongoDB vs PostgreSQL for data consistency requirements", decision: "PostgreSQL with pgvector for future AI features", rationale: "Strong consistency model, team expertise, better analytics support", status: "implemented", date: new Date(Date.now() - 7 * 86400000).toISOString(), tags: ["infrastructure", "database"] },
        { id: 2, title: "React 19 over Next.js", context: "Team evaluated framework options for the frontend rebuild", decision: "React 19 + Vite for SPA approach", rationale: "Simpler deployment (static files), faster builds, sufficient for dashboard app", status: "implemented", date: new Date(Date.now() - 14 * 86400000).toISOString(), tags: ["frontend", "architecture"] },
      ]),
    })
  );

  await page.route(/\/api\/notes(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, title: "Sprint planning notes", meeting_type: "standup", notes: "Discussed Q2 roadmap", status: "completed", date: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, title: "Architecture review", meeting_type: "design", notes: "Reviewed microservices proposal", status: "pending", date: new Date(Date.now() - 172800000).toISOString() },
      ]),
    })
  );

  await page.route(/\/api\/notes\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("**/api/pipeline/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stage: "Build", status: "active" }),
    })
  );

  await page.route("**/api/pattern-engine/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.route("**/api/settings**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "Test User", email: "test@foundesk.com", timezone: "America/New_York", locale: "en-US", theme: "dark", date_format: "MM/DD/YYYY", week_start_day: "monday", notifications: { email: true, push: false, digest: "daily" } }),
    })
  );

  await page.route("**/api/billing/*", (route) => {
    const url = route.request().url();
    if (url.includes("config")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ key: "rzp_test_xxxxxxxxxxxx", name: "FounDesk", currency: "INR" }) });
    }
    if (url.includes("plan")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "team", status: "active", trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(), features: ["unlimited_tasks", "integrations", "team_collaboration"] }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/notifications**", (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("mark-all-read") || url.includes("read-all")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.includes("preferences")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ email: true, push: false, digest: "daily" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, title: "New comment on task #42", read: false, created_at: new Date().toISOString() },
        { id: 2, title: "Goal Q2 Revenue updated", read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: "Slack integration synced", read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
      ]),
    });
  });

  await page.route("**/api/integrations*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, provider: "google", connected_email: "test@gmail.com", status: "connected" },
        { id: 2, provider: "slack", connected_email: "test@slack.com", status: "connected" },
        { id: 3, provider: "github", connected_email: "test@github.com", status: "connected" },
      ]),
    })
  );

  await page.route("**/api/workspaces*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, name: "Test Workspace", role: "owner", member_count: 5 },
        { id: 2, name: "Client Projects", role: "member", member_count: 3 },
      ]),
    })
  );

  await page.route("**/api/developer/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

  await page.route("**/api/users/me/**", (route) => {
    const url = route.request().url();
    if (url.includes("sessions")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.includes("connected-accounts")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/workspaces/*/activity", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

  await page.route("**/api/amplitude/config", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apiKey: "test_amplitude_key" }) })
  );

  await page.route("https://api.amplitude.com/**", (route) => route.fulfill({ status: 200 }));

  await page.route("**/api/track", (route) => route.fulfill({ status: 200 }));

  await page.route("**/api/chronicle*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [], has_more: false, total_count: 0 }) })
  );

  await page.route("**/api/knowledge*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

  await page.route("**/api/handoff/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ packets: [] }) })
  );
}

export async function mockApiError(page: Page, urlPattern: string, status = 500, message = "Internal Server Error") {
  await page.route(urlPattern, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: message }) })
  );
}
