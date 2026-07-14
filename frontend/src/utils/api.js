import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

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

// Catch 401 Unauthorized errors (invalid or expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized request detected (401). Clearing token and logging out.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("workspaceId");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
