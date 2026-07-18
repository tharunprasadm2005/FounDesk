import api from "./api";
import { trackEvent } from "../config/amplitude";

export async function track(event, properties = {}) {
  trackEvent(event, properties);
  if (typeof gtag === "function") {
    try {
      gtag("event", event, properties);
    } catch (err) { console.debug("[Track] gtag event failed:", err); }
  }
  try {
    await api.post("/api/track", { event, properties });
  } catch {
    // silently ignore tracking errors
  }
}
