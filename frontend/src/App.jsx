import axios from "axios";
import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "./utils/api";
import { track } from "./utils/track";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Status = lazy(() => import("./pages/Status"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Goals = lazy(() => import("./pages/Goals"));
const Execute = lazy(() => import("./pages/Execute"));
const Memory = lazy(() => import("./pages/Memory"));
const Settings = lazy(() => import("./pages/Settings"));

function LoadingFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F8F5F2" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "46px",
            height: "46px",
            borderRadius: "16px",
            background: "#2D2D2D",
            color: "#F8F5F2",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "26px",
            fontStyle: "italic",
            fontWeight: "600",
            boxShadow: "0 14px 30px -12px rgba(45,45,45,0.45)",
          }}
        >
          f
        </div>
        <p style={{ fontSize: "11px", color: "#8F897F", fontFamily: "'Manrope', sans-serif", fontWeight: "700", letterSpacing: "2.5px", textTransform: "uppercase" }} className="animate-pulse">
          FounDesk
        </p>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  const [oauthReturn] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const hasCode = !!p.get("code");
    const hasProvider = !!p.get("callback") || !!p.get("state");
    const isZohoReturn = p.get("zoho") !== null || p.get("zoho_error") !== null;
    return (hasCode && hasProvider) || isZohoReturn;
  });

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
        `${API_BASE_URL}/api/me`,
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
    {oauthReturn ? (
      <OAuthCallback />
    ) : (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login handleSuccess={handleSuccess} authError={authError} onClearError={() => setAuthError(null)} setUser={setUser} />
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
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/status" element={<Status />} />
      <Route path="/auth/callback" element={<GoogleCallback />} />
      {/* Catch-all redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    )}
    </Suspense>
  );
}

export default App;
