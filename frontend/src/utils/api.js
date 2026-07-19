import axios from "axios";

const FALLBACK_URL = "http://127.0.0.1:5000";
let ENV_URL = import.meta.env.VITE_API_URL || "";
const SAME_ORIGIN = "";

if (ENV_URL && !ENV_URL.startsWith("http://") && !ENV_URL.startsWith("https://")) {
  ENV_URL = "https://" + ENV_URL;
}

export const API_BASE_URL = ENV_URL && ENV_URL !== FALLBACK_URL ? ENV_URL : SAME_ORIGIN;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject Authorization Bearer token into all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const workspaceId = localStorage.getItem("workspaceId");
    if (workspaceId) {
      config.headers["X-Workspace-Id"] = workspaceId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Catch 401 Unauthorized errors (invalid or expired token) — attempt refresh first
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest && originalRequest.url && 
      (originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/signup") || 
       originalRequest.url.includes("/auth/refresh"));
    
    if (error.response && error.response.status === 401 && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(API_BASE_URL + "/api/auth/refresh", { refresh_token: refreshToken });
          const { token, refresh_token: newRefresh } = res.data;
          localStorage.setItem("token", token);
          if (newRefresh) localStorage.setItem("refresh_token", newRefresh);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.warn("Token refresh failed. Logging out.");
        }
      }
      console.warn("Unauthorized request detected (401). Clearing token and logging out.");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("workspaceId");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
