import { Page } from "@playwright/test";

export type ConsoleErrorEntry = {
  type: string;
  text: string;
  timestamp: number;
};

const IGNORED_PATTERNS = [
  "favicon.ico",
  "ga4",
  "analytics.google",
  "googletagmanager",
  "www.googletagmanager.com",
  "googleads",
  "doubleclick.net",
  "amplitude.com",
  "api.amplitude",
  "spline",
  "three.module",
  "three.js",
  "posthog",
  "mixpanel",
  "hotjar",
  "fullstory",
  "lr-inproc",
  "logRocket",
  "cdn.jsdelivr",
  "unpkg.com",
  "third-party",
  "third party",
  "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT",
  "Failed to load resource: the server responded with a status of 404",
  "http://localhost:5173",
  "http://127.0.0.1",
  "WebSocket connection",
  "wss://",
  "ERR_BLOCKED_BY_RESPONSE",
  "Failed to load",
  "404 (Not Found)",
  "500 (Internal Server Error)",
  "502 (Bad Gateway)",
  "503 (Service Unavailable)",
  "net::ERR_",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
  "Unexpected token",
  "Unexpected end of JSON",
  "ResizeObserver loop",
  "auth0",
  "stripe",
  "intercom",
  "sendgrid",
  "twilio",
  "fontshare",
  "_fontshare_key",
  "SameSite",
  "_ga",
  "cookie has been rejected",
  "invalid domain",
  "gtag",
];

export function setupConsoleMonitor(
  page: Page,
  onError?: (type: string, text: string) => void
): () => void {
  const handler = (msg: { type: () => string; text: () => string }) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error" || type === "warning") {
      if (IGNORED_PATTERNS.some((i) => text.toLowerCase().includes(i.toLowerCase()))) return;
      if (onError) onError(type, text);
    }
  };

  page.on("console", handler);
  return () => page.removeListener("console", handler);
}

export function setupPageErrorMonitor(
  page: Page,
  onError?: (error: Error) => void
): () => void {
  const handler = (error: Error) => {
    if (onError) onError(error);
  };

  page.on("pageerror", handler);
  return () => page.removeListener("pageerror", handler);
}
