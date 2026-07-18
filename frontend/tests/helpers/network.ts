import { Page } from "@playwright/test";

export type NetworkFailureEntry = {
  url: string;
  status: number;
  resourceType: string;
};

const IGNORED_DOMAINS = [
  "amplitude.com",
  "api.amplitude",
  "googletagmanager",
  "google-analytics",
  "doubleclick.net",
  "googleads",
  "gtag",
  "spline.design",
  "spline",
  "three.js",
  "posthog",
  "mixpanel",
  "hotjar",
  "fullstory",
  "logrocket",
  "lr-inproc",
  "cdn.jsdelivr",
  "unpkg.com",
];

export function setupNetworkMonitor(
  page: Page,
  onFailure?: (url: string, status: number) => void
): () => void {
  const handler = (response: { url: () => string; status: () => number; ok: () => boolean }) => {
    if (!response.ok()) {
      const url = response.url();
      const status = response.status();
      if (IGNORED_DOMAINS.some((d) => url.includes(d))) return;
      if (status >= 400 && onFailure) {
        onFailure(url, status);
      }
    }
  };

  page.on("response", handler);
  return () => page.removeListener("response", handler);
}

export function setupBrokenImageDetector(page: Page): () => void {
  const handler = (request: { url: () => string; resourceType: () => string; failure: () => string | null }) => {
    if (request.resourceType() === "image" && request.failure()) {
      console.error(`Broken image detected: ${request.url()}`);
    }
  };

  page.on("requestfailed", handler);
  return () => page.removeListener("requestfailed", handler);
}
