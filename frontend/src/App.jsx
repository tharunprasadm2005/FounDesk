import axios from "axios";
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "./utils/api";
import { track } from "./utils/track";
import { initAmplitudeFromBackend, setUserId } from "./config/amplitude";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import GoogleCallback from "./pages/GoogleCallback";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Billing from "./pages/Billing";
import Execute from "./pages/Execute";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      initAmplitudeFromBackend().then(() => {
        setUserId(userData?.email || userData?.name);
      });
    }
  }, []);

  const handleSuccess = async (credentialResponse) => {
    try {
      setAuthError(null);
      const res = await axios.post(
        `${API_BASE_URL}/auth/google`,
        {
          token: credentialResponse.credential,
        }
      );

      localStorage.setItem("token", res.data.token);

      const dashboardRes = await axios.get(
        `${API_BASE_URL}/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${res.data.token}`,
          },
        }
      );

      const userData = dashboardRes.data.user;
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // Fetch workspaces and persist workspaceId so all pages load correctly
      try {
        const wsRes = await axios.get(`${API_BASE_URL}/api/workspaces`, {
          headers: { Authorization: `Bearer ${res.data.token}` },
        });
        const activeWS = wsRes.data.find((w) => w.member_status === "active");
        if (activeWS) {
          localStorage.setItem("workspaceId", activeWS.id.toString());
        }
      } catch (wsErr) {
        console.warn("Could not load workspaces on login:", wsErr);
      }

      navigate("/dashboard");
      initAmplitudeFromBackend().then(() => {
        setUserId(userData?.email || userData?.name);
      });
      track("user_logged_in", { name: userData?.name, email: userData?.email });

    } catch (error) {
      console.error("Authentication failed:", error);
      const msg = error.response?.data?.error || error.message || "Login failed. Please try again.";
      setAuthError(msg);
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login handleSuccess={handleSuccess} authError={authError} onClearError={() => setAuthError(null)} />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <Layout>
              <Goals />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Layout>
              <Billing />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/execute"
        element={
          <ProtectedRoute>
            <Layout>
              <Execute />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/memory"
        element={
          <ProtectedRoute>
            <Layout>
              <Memory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/auth/callback" element={<GoogleCallback />} />
      {/* Catch-all redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
