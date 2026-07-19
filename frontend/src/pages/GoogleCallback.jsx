import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../utils/api";
import { track } from "../utils/track";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
    const searchParams = new URLSearchParams(window.location.search);
    const idToken = hashParams.get("id_token") || searchParams.get("id_token");
    const error = hashParams.get("error") || searchParams.get("error");

    if (error || !idToken) {
      navigate("/?error=Google sign-in failed", { replace: true });
      return;
    }

    api.post("/api/auth/google", { token: idToken })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        return api.get("/api/me");
      })
      .then((dashboardRes) => {
        const userData = dashboardRes.data.user;
        localStorage.setItem("user", JSON.stringify(userData));
        return api.get("/api/workspaces").then((wsRes) => {
          const activeWS = wsRes.data.find((w) => w.member_status === "active");
          if (activeWS) localStorage.setItem("workspaceId", activeWS.id.toString());
        }).then(() => {
          track("user_logged_in", { name: userData?.name, email: userData?.email });
          navigate("/dashboard", { replace: true });
        });
      })
      .catch((err) => {
        console.error("Auth callback failed:", err);
        navigate("/?error=Authentication failed", { replace: true });
      });
  }, [navigate]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#8e8e93", fontFamily: "sans-serif" }}>
      Signing you in...
    </div>
  );
}
