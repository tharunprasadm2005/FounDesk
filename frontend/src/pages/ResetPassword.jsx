import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Brand from "../components/Brand";
import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(token ? "form" : "error");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) setMessage("Missing reset token. Use the link from your email.");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 12) { setError("Password must be at least 12 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain an uppercase letter."); return; }
    if (!/[a-z]/.test(password)) { setError("Password must contain a lowercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain a digit."); return; }
    if (!/[^a-zA-Z0-9]/.test(password)) { setError("Password must contain a special character."); return; }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setStatus("success");
      setMessage("Password reset successfully.");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Reset failed. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontFamily: '"Manrope", sans-serif',
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--fd-ink-2)",
    marginBottom: 8,
  };

  return (
    <div className="fd-auth fd-field fd-grain" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Brand />
        <div className="fd-glass" style={{ borderRadius: 28, padding: "36px 32px", marginTop: 24 }}>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--fd-ink-3)", fontFamily: '"Manrope", sans-serif', fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>

          {status === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(126,142,123,0.16)", color: "#5c6b5a", display: "grid", placeItems: "center" }}>
                <CheckCircle size={28} />
              </span>
              <div className="fd-display" style={{ fontSize: 22, margin: 0 }}>Password reset.</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{message}</p>
              <button type="button" className="fd-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/login")}>Continue to sign in</button>
            </div>
          )}

          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(214,130,79,0.16)", color: "#b4643a", display: "grid", placeItems: "center" }}>
                <AlertCircle size={28} />
              </span>
              <div className="fd-display" style={{ fontSize: 22, margin: 0 }}>Reset failed.</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{message}</p>
              <Link to="/forgot-password" className="fd-btn fd-btn-light" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>Request a new link</Link>
            </div>
          )}

          {status === "form" && (
            <>
              <div className="fd-kicker" style={{ marginBottom: 12 }}>Reset password</div>
              <div className="fd-display" style={{ fontSize: 28, margin: "0 0 24px", lineHeight: 1.08 }}>Choose a new password.</div>

              {error && (
                <div className="fd-glass-soft fd-body" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, padding: "11px 15px", marginBottom: 20, fontSize: 13, fontWeight: 600, color: "var(--fd-ink)", borderColor: "rgba(45,45,45,0.22)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--fd-ink)", flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle} htmlFor="fd-new-password">New password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="fd-new-password"
                      className="fd-field-input"
                      type={show ? "text" : "password"}
                      placeholder={show ? "your-new-password" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{ paddingRight: 52 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "var(--fd-ink-3)", display: "grid", placeItems: "center", padding: 4 }}
                    >
                      {show ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="fd-confirm-password">Confirm password</label>
                  <input
                    id="fd-confirm-password"
                    className="fd-field-input"
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <p className="fd-body" style={{ fontSize: 11.5, color: "var(--fd-ink-3)", fontWeight: 600, margin: "4px 0 0", lineHeight: 1.5 }}>
                  12+ chars · one uppercase · one lowercase · one digit · one special char
                </p>
                <button type="submit" className="fd-btn" style={{ width: "100%", marginTop: 4 }} disabled={loading}>
                  {loading ? "Resetting…" : "Reset password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
