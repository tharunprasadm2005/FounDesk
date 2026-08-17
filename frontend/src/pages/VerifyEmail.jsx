import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../utils/api";
import Brand from "../components/Brand";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Check the link in your email.");
      return;
    }
    api
      .post("/api/auth/verify-email", { token })
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully.");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(err.response?.data?.error || "Verification failed. The link may be invalid or expired.");
      });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="fd-auth fd-field fd-grain" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Brand />
        <div className="fd-glass" style={{ borderRadius: 28, padding: "36px 30px", marginTop: 24 }}>
          <div className="fd-kicker" style={{ marginBottom: 12 }}>Email verification</div>

          {status === "verifying" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 0", textAlign: "center" }}>
              <Loader2 size={30} style={{ color: "var(--fd-ink-2)", animation: "spin 1s linear infinite" }} />
              <p className="fd-body" style={{ fontSize: 14, color: "var(--fd-ink-2)", margin: 0, fontWeight: 500 }}>Verifying your email…</p>
            </div>
          )}

          {status === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(126,142,123,0.16)", color: "#5c6b5a", display: "grid", placeItems: "center" }}>
                <CheckCircle size={28} />
              </span>
              <div className="fd-display" style={{ fontSize: 22, margin: 0 }}>Email verified.</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{message}</p>
              <Link to="/login" className="fd-btn" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>Continue to sign in</Link>
            </div>
          )}

          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(214,130,79,0.16)", color: "#b4643a", display: "grid", placeItems: "center" }}>
                <AlertCircle size={28} />
              </span>
              <div className="fd-display" style={{ fontSize: 22, margin: 0 }}>Verification failed.</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{message}</p>
              <Link to="/login" className="fd-btn fd-btn-light" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>Back to sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
