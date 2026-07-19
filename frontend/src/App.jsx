import axios from "axios";
import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "./utils/api";
import { track } from "./utils/track";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Goals = lazy(() => import("./pages/Goals"));
const Billing = lazy(() => import("./pages/Billing"));
const Execute = lazy(() => import("./pages/Execute"));
const Memory = lazy(() => import("./pages/Memory"));
const Settings = lazy(() => import("./pages/Settings"));

function LoadingFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#030303" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
        <div className="relative flex items-center justify-center" style={{ width: "40px", height: "40px" }}>
          <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "36px", fontWeight: "950", color: "var(--brand-orange)", lineHeight: 1, letterSpacing: "-0.04em" }}>F</span>
          <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "36px", fontWeight: "950", color: "transparent", WebkitTextStroke: "1.5px var(--brand-orange)", lineHeight: 1, marginLeft: "1.5px" }}>d</span>
        </div>
        <p style={{ fontSize: "12px", color: "var(--gray)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1.5px", textTransform: "uppercase" }} className="animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }
  }, []);

  const handleSuccess = async (credentialResponse) => {
    try {
      setAuthError(null);
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/google`,
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
      track("user_logged_in", { name: userData?.name, email: userData?.email });

    } catch (error) {
      console.error("Authentication failed:", error);
      const msg = error.response?.data?.error || error.message || "Login failed. Please try again.";
      setAuthError(msg);
    }
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
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
    </Suspense>
  );
}

export default App;
