import { useEffect, useRef, useState } from "react";
import api from "../utils/api";

const ZOHO_ERROR_MESSAGES = {
  invalid_state: "The authorization state could not be verified.",
  invalid_state_format: "The authorization state could not be read.",
  no_code: "No authorization code was received.",
  missing_credentials: "Zoho credentials are not configured on the server.",
  token_exchange_failed: "Zoho rejected the authorization code.",
  token_validation_failed: "Zoho could not validate the returned token.",
  server_error: "The server could not complete the connection.",
};

const normalizeProvider = (raw) => {
  let p = (raw || "").trim();
  if (p.startsWith("slack_user_")) return "slack";
  return p;
};

const SCALE_STYLE = {
  margin: "0",
  fontFamily: "'Manrope', sans-serif",
  fontSize: "13px",
  color: "#9C9790",
  lineHeight: "1.5",
};

export default function OAuthCallback() {
  const [status, setStatus] = useState({ pending: true, ok: false, label: "", msg: "" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const zoho = params.get("zoho");
    const zohoError = params.get("zoho_error");
    if (zohoError) {
      setStatus({ pending: false, ok: false, label: "", msg: ZOHO_ERROR_MESSAGES[zohoError] || zohoError });
      return;
    }
    if (zoho === "success") {
      finishConnect("Zoho CRM", true);
      return;
    }
    const code = params.get("code");
    const provider = normalizeProvider(params.get("callback") || params.get("state"));
    if (!code || !provider) {
      setStatus({ pending: false, ok: false, label: "", msg: "Missing authorization parameters. The connection could not be completed." });
      return;
    }
    api.post("/api/integrations/oauth/callback", { provider, code })
      .then(() => finishConnect(provider, true))
      .catch((err) => {
        setStatus({ pending: false, ok: false, label: "", msg: err?.response?.data?.error || err?.message || "OAuth failed. Please try again." });
      });
  }, []);

  const finishConnect = (provider, ok) => {
    try {
      if (window.opener) window.opener.postMessage("oauth_done", window.location.origin);
    } catch (err) {
      console.warn("[OAuthCallback] Failed to notify opener:", err);
    }
    try { localStorage.setItem("oauth_done", JSON.stringify({ provider, ts: Date.now() })); } catch (err) { console.warn("[OAuthCallback] Failed to save oauth_done:", err); }
    setStatus({ pending: false, ok, label: provider, msg: "" });
    setTimeout(() => { try { window.close(); } catch (err) { console.warn("[OAuthCallback] Close blocked:", err); } }, 800);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121214", fontFamily: "'Manrope', sans-serif" }}>
      <div style={{ background: "#1B1B1E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "22px", padding: "40px 48px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: status.ok ? "#1E3A2C" : status.pending ? "#2D2D2D" : "#3A1E1E", color: status.ok ? "#69C08A" : status.pending ? "#C9C4BC" : "#E56B6B", fontSize: "24px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          {status.ok ? "✓" : status.pending ? "…" : "!"}
        </div>
        {status.pending ? (
          <>
            <h1 style={{ fontSize: "18px", color: "#F2EEE8", margin: "0 0 8px", fontWeight: 600 }}>Connecting…</h1>
            <p style={SCALE_STYLE}>Exchanging your authorization. Do not close this window.</p>
          </>
        ) : status.ok ? (
          <>
            <h1 style={{ fontSize: "18px", color: "#F2EEE8", margin: "0 0 8px", fontWeight: 600 }}>{status.label || "Integration"} connected</h1>
            <p style={SCALE_STYLE}>Success. This window will close automatically and your app will refresh.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "18px", color: "#F2EEE8", margin: "0 0 8px", fontWeight: 600 }}>Connection failed</h1>
            <p style={{ ...SCALE_STYLE, color: "#E58B8B" }}>{status.msg}</p>
            <button onClick={() => window.close()} style={{ marginTop: "20px", padding: "9px 22px", background: "#2D2D2D", color: "#E8E4E0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}