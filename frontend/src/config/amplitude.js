import * as amplitude from "@amplitude/analytics-browser";
import api from "../utils/api";

let initialized = false;

export async function initAmplitudeFromBackend() {
  if (initialized) return;
  try {
    const res = await api.get("/api/amplitude/config");
    if (res.data?.connected && res.data?.api_key) {
      amplitude.init(res.data.api_key, undefined, {
        defaultTracking: {
          pageViews: true,
          sessions: true,
        },
      });
      initialized = true;
      console.log("Amplitude initialized from backend config");
    }
  } catch {
    console.log("Amplitude not connected or config fetch failed");
  }
}

export function setUserId(userId) {
  if (!userId) return;
  amplitude.setUserId(userId);
}

export function trackEvent(event, properties = {}) {
  if (initialized) {
    amplitude.track(event, properties);
  }
}

export default amplitude;
