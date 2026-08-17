import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import api from "../utils/api";
import Brand from "../components/Brand";

const GOOGLE_CLIENT_ID = "174203078115-lgbiq9ekbd01sr82us4ulb4nsb0boc3q.apps.googleusercontent.com";

const EASE = [0.16, 1, 0.3, 1];

function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ["Fragile", "Fragile", "Getting there", "Getting there", "Solid", "Bulletproof"];

const AVATARS = [
  { i: "A", bg: "#2D2D2D" },
  { i: "M", bg: "#D6824F" },
  { i: "S", bg: "#7E8E7B" },
];

/* ── Single hero object: the live briefing card ───────────── */
function LiveBriefCard() {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.4 });
  const rotateX = useTransform(sy, [0, 1], [9, -9]);
  const rotateY = useTransform(sx, [0, 1], [-11, 11]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  return (
    <div className="fd-scene" style={{ perspective: 1300 }} onMouseMove={onMove}>
      <motion.div
        initial={{ opacity: 0, y: 34, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.35, ease: EASE }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          position: "relative",
          borderRadius: 26,
          padding: 18,
          background: "linear-gradient(148deg, #FDFAF5 0%, #F3EDE2 55%, #EAE1D2 100%)",
          border: "1px solid rgba(255,255,255,0.95)",
          boxShadow:
            "18px 24px 52px -20px rgba(45,45,45,0.38), -14px -14px 30px -12px rgba(255,255,255,0.95), inset 1px 1px 0 rgba(255,255,255,0.98)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transform: "translateZ(40px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 10, height: 10, borderRadius: 99, background: "#7E8E7B", boxShadow: "0 0 0 5px rgba(126,142,123,0.16)", flexShrink: 0 }}
            />
            <div className="fd-kicker" style={{ margin: 0 }}>Live briefing</div>
          </div>
          <span className="fd-chip fd-body" style={{ padding: "5px 11px", fontSize: 10.5, fontWeight: 700, color: "var(--fd-ink-2)", whiteSpace: "nowrap" }}>
            Tue · Aug 16
          </span>
        </div>

        <div style={{ marginTop: 13, transform: "translateZ(44px)" }}>
          <div className="fd-display" style={{ fontSize: 22, lineHeight: 1.05, margin: 0 }}>
            Your day, dealt in advance.
          </div>
          <div className="fd-body" style={{ fontSize: 12, color: "var(--fd-ink-3)", fontWeight: 500, marginTop: 5 }}>
            Compiled from 7 tools · 04:12 · read in 4 min
          </div>
        </div>

        {/* rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
          {[
            { t: "Seller call — prep note ready", tag: "Calendar", hot: true },
            { t: "Founder reply drafted", tag: "Email", hot: false },
            { t: "Follow-up: Riviera seed deck v3", tag: "CRM", hot: false },
          ].map((item, i) => (
            <div
              key={item.t}
              className="fd-glass-soft"
              style={{ borderRadius: 13, padding: "9px 11px", display: "flex", alignItems: "center", gap: 11, transform: `translateZ(${20 + i * 8}px)` }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: item.hot ? "#D6824F" : "rgba(45,45,45,0.28)" }} />
              <div style={{ minWidth: 0 }}>
                <div className="fd-body" style={{ fontSize: 12, fontWeight: 600, color: "var(--fd-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 1.5 }}>
                  {item.t}
                </div>
                <div className="fd-body" style={{ fontSize: 10, color: "var(--fd-ink-3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {item.tag}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, transform: "translateZ(36px)" }}>
          <span className="fd-body" style={{ fontSize: 11, fontWeight: 700, color: "var(--fd-ink)" }}>
            13 done · 2 decisions
          </span>
          <span className="fd-body" style={{ fontSize: 11, fontWeight: 600, color: "var(--fd-ink-3)" }}>
            Focus block · 09–12
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function LoginContent({ handleSuccess, authError, onClearError, setUser }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = authError || localError;
  const strength = strengthOf(password);

  /* pointer-follow glow on the form side */
  const gx = useMotionValue(-400);
  const gy = useMotionValue(-400);
  const sgx = useSpring(gx, { stiffness: 90, damping: 18 });
  const sgy = useSpring(gy, { stiffness: 90, damping: 18 });
  const glowX = useTransform(sgx, (v) => `${v}px`);
  const glowY = useTransform(sgy, (v) => `${v}px`);
  const glow = useMotionTemplate`radial-gradient(480px circle at ${glowX} ${glowY}, rgba(45,45,45,0.055), transparent 68%)`;

  const loginGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      if (handleSuccess) handleSuccess({ credential: codeResponse.access_token });
    },
    onError: () => setLocalError("Google login failed"),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");
    if (onClearError) onClearError();

    try {
      let res;
      if (isLogin) {
        res = await api.post("/api/auth/login", { email, password });
      } else {
        res = await api.post("/api/auth/signup", { email, password, name });
      }

      const { token, refresh_token, user, workspace } = res.data;
      localStorage.setItem("token", token);
      if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        if (setUser) setUser(user);
      }
      if (workspace) localStorage.setItem("workspaceId", workspace.id.toString());

      navigate("/dashboard");
    } catch (err) {
      setLocalError(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setLocalError("");
    if (onClearError) onClearError();
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
    <div className="fd-auth fd-field fd-grain" style={{ minHeight: "100vh", display: "flex", overflow: "hidden" }}>
      {/* ── Visual panel ─────────────────────────────────── */}
      <div className="fd-panel-desktop" style={{ flex: "1 1 52%", position: "relative", padding: "30px 46px", overflow: "hidden" }}>
        {/* clean background: soft gradient + dot field */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 90% at 20% 0%, #FBF7F0 0%, #F4EDE1 42%, #EDE4D4 78%, #E7DCC9 100%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(45,45,45,0.13) 1.1px, transparent 1.1px)",
            backgroundSize: "22px 22px",
            WebkitMaskImage: "radial-gradient(70% 55% at 30% 40%, black, transparent)",
            maskImage: "radial-gradient(70% 55% at 30% 40%, black, transparent)",
            opacity: 0.5,
          }}
        />

        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <Brand />
          </motion.div>

          <div style={{ maxWidth: 430, margin: "8px 0" }}>
            <motion.div
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.12 }}
            >
              <div className="fd-kicker" style={{ marginBottom: 12 }}>Welcome back</div>
              <h1 className="fd-display" style={{ fontSize: "clamp(2.3rem, 3.9vw, 3.2rem)", margin: "0 0 14px", lineHeight: 1.03 }}>
                Your compiled view
                <br />
                is <em>waiting.</em>
              </h1>
              <p className="fd-body" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--fd-ink-2)", margin: 0 }}>
                One daily read that knows what matters. Decisions logged,
                follow-ups kept, calendars defended.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 46 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
            style={{ maxWidth: 452 }}
          >
            <LiveBriefCard />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.85 }}
            style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}
          >
            <div style={{ display: "flex" }}>
              {AVATARS.map((a, i) => (
                <span
                  key={a.i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 99,
                    marginLeft: i === 0 ? 0 : -11,
                    background: a.bg,
                    color: "#F8F5F2",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 12,
                    fontWeight: 700,
                    border: "2px solid #F4EDE1",
                  }}
                >
                  {a.i}
                </span>
              ))}
            </div>
            <div className="fd-body" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fd-ink-2)", fontWeight: 600 }}>
              2,400+ founders start the day<br />from the compiled view.
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Auth form ───────────────────────────────────── */}
      <div
        style={{ flex: "1 1 48%", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative" }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          gx.set(e.clientX - r.left);
          gy.set(e.clientY - r.top);
        }}
      >
        <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: glow }} />

        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.12 }}
          style={{ width: "100%", maxWidth: 440, position: "relative" }}
        >
          <motion.div className="fd-glass" style={{ borderRadius: 36, padding: "38px 36px 30px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={error || "ok"}
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: error ? [0, -9, 9, -6, 6, -2, 0] : 0, opacity: 1 }}
                transition={{ duration: error ? 0.45 : 0, ease: "easeOut" }}
              >
                <div className="fd-display" style={{ fontSize: 32, margin: "0 0 6px", lineHeight: 1.05 }}>
                  {isLogin ? "Sign in." : "Create your account."}
                </div>
                <p className="fd-body" style={{ fontSize: 14.5, color: "var(--fd-ink-3)", margin: "0 0 26px", fontWeight: 500 }}>
                  {isLogin ? "Return to your command post." : "Start compiling your operation."}
                </p>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="fd-glass-soft fd-body"
                style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, padding: "11px 15px", marginBottom: 20, fontSize: 13, fontWeight: 600, color: "var(--fd-ink)", borderColor: "rgba(45,45,45,0.22)" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--fd-ink)", flexShrink: 0 }} />
                {error}
              </motion.div>
            )}

            <button type="button" onClick={() => loginGoogle()} className="fd-btn fd-btn-light" style={{ width: "100%" }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
              <div className="fd-hairline" style={{ flex: 1 }} />
              <span className="fd-body" style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fd-ink-3)", fontWeight: 700 }}>
                Or with email
              </span>
              <div className="fd-hairline" style={{ flex: 1 }} />
            </div>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isLogin ? "login" : "signup"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.32, ease: EASE }}
                  style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {!isLogin && (
                    <div>
                      <label style={labelStyle} htmlFor="fd-name">Full name</label>
                      <input id="fd-name" className="fd-field-input" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle} htmlFor="fd-email">Email address</label>
                    <input id="fd-email" className="fd-field-input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="fd-password">Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="fd-password"
                        className="fd-field-input"
                        type={showPassword ? "text" : "password"}
                        placeholder={showPassword ? "your-password" : "••••••••"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        style={{ paddingRight: 52 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "var(--fd-ink-3)", display: "grid", placeItems: "center", padding: 4 }}
                      >
                        {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {!isLogin && password && (
                      <div>
                        <div className="fd-strength">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={n <= strength ? "on" : ""} />
                          ))}
                        </div>
                        <div className="fd-body" style={{ fontSize: 11.5, color: "var(--fd-ink-3)", fontWeight: 600, marginTop: 8 }}>
                          {STRENGTH_LABEL[strength]}
                          <span style={{ opacity: 0.6 }}> · 12+ chars, one uppercase</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {isLogin && (
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "-8px 0 14px" }}>
                  <Link to="/forgot-password" className="fd-body" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fd-ink-3)", fontWeight: 600, fontSize: 12.5, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(45,45,45,0.25)" }}>
                    Forgot password?
                  </Link>
                </div>
              )}

              <button type="submit" className="fd-btn" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Authenticating…" : isLogin ? "Sign in" : "Create account"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="fd-body" style={{ textAlign: "center", fontSize: 14, color: "var(--fd-ink-2)", margin: "26px 0 4px", fontWeight: 500 }}>
              {isLogin ? "New to FounDesk? " : "Already have an account? "}
              <button
                type="button"
                onClick={switchMode}
                className="fd-body"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fd-ink)", fontWeight: 700, fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(45,45,45,0.3)" }}
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Login(props) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginContent {...props} />
    </GoogleOAuthProvider>
  );
}