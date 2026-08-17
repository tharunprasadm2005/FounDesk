import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import Brand from "../components/Brand";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
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

          {sent ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 99, background: "rgba(126,142,123,0.16)", color: "#5c6b5a", display: "grid", placeItems: "center" }}>
                <CheckCircle size={28} />
              </span>
              <div className="fd-display" style={{ fontSize: 22, margin: 0 }}>Check your inbox.</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                If an account exists for <strong style={{ color: "var(--fd-ink)" }}>{email}</strong>, a reset link is on its way. It expires in 1 hour.
              </p>
              <Link to="/login" className="fd-btn fd-btn-light" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>Back to sign in</Link>
            </div>
          ) : (
            <>
              <div className="fd-kicker" style={{ marginBottom: 12 }}>Reset password</div>
              <div className="fd-display" style={{ fontSize: 28, margin: "0 0 8px", lineHeight: 1.08 }}>Forgot your password?</div>
              <p className="fd-body" style={{ fontSize: 13.5, color: "var(--fd-ink-3)", margin: "0 0 24px", lineHeight: 1.6, fontWeight: 500 }}>
                Enter your account email and we'll send you a secure reset link.
              </p>

              {error && (
                <div className="fd-glass-soft fd-body" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, padding: "11px 15px", marginBottom: 20, fontSize: 13, fontWeight: 600, color: "var(--fd-ink)", borderColor: "rgba(45,45,45,0.22)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--fd-ink)", flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label style={labelStyle} htmlFor="fd-reset-email">Email address</label>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <Mail size={16} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--fd-ink-3)", pointerEvents: "none" }} />
                  <input
                    id="fd-reset-email"
                    className="fd-field-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
                <button type="submit" className="fd-btn" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
