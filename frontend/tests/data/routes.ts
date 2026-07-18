export const ROUTES = {
  LANDING: "/",
  LOGIN: "/login",
  GOOGLE_CALLBACK: "/auth/callback",

  DASHBOARD: "/dashboard",
  PLAN: "/plan",
  EXECUTE: "/execute",
  MEMORY: "/memory",
  SETTINGS: "/settings",
  BILLING: "/billing",
} as const;

export const API_ROUTES = {
  AUTH_SIGNUP: "**/api/auth/signup",
  AUTH_LOGIN: "**/api/auth/login",
  AUTH_REFRESH: "**/api/auth/refresh",
  AUTH_FORGOT_PASSWORD: "**/api/auth/forgot-password",
  AUTH_RESET_PASSWORD: "**/api/auth/reset-password",
  AUTH_VERIFY_EMAIL: "**/api/auth/verify-email",
  DASHBOARD: "**/api/dashboard",
  GOALS: "**/api/goals",
  TASKS: "**/api/tasks",
  DECISIONS: "**/api/decisions",
  SETTINGS: "**/api/settings",
  NOTIFICATIONS: "**/api/notifications",
  INTEGRATIONS: "**/api/integrations",
  WORKSPACES: "**/api/workspaces",
  BILLING_CONFIG: "**/api/billing/config",
  BILLING_PLAN: "**/api/billing/plan",
  BILLING_CREATE_ORDER: "**/api/billing/create-order",
  AMPLITUDE_CONFIG: "**/api/amplitude/config",
  TRACK: "**/api/track",
  GOOGLE_AUTH: "**/api/auth/google",
} as const;

export const AUTH_REQUIRED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.PLAN,
  ROUTES.EXECUTE,
  ROUTES.MEMORY,
  ROUTES.SETTINGS,
  ROUTES.BILLING,
];

export const PUBLIC_ROUTES = [ROUTES.LANDING, ROUTES.LOGIN];
