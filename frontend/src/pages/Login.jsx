import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, ArrowRight, CheckCircle, LogIn, UserPlus,
  Eye, EyeOff, Lock, User, Building, Loader2, AlertCircle, Shield, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { Gauge } from "../components/ui/gauge";

const FONT_SANS = "'Clash Display', system-ui, sans-serif";
const FONT_BODY = "'Satoshi', system-ui, sans-serif";

function useMouseTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rotateX = -(mouseY / (height / 2)) * 6;
    const rotateY = (mouseX / (width / 2)) * 6;

    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  return {
    cardRef,
    tilt,
    isHovered,
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}

function ProductGlimpse() {
  const tilt1 = useMouseTilt();
  const tilt2 = useMouseTilt();

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: "340px",
      margin: "0 auto",
      perspective: "1000px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      padding: "20px 0",
    }}>
      {/* Active Goal card */}
      <motion.div
        ref={tilt1.cardRef}
        onMouseMove={tilt1.onMouseMove}
        onMouseEnter={tilt1.onMouseEnter}
        onMouseLeave={tilt1.onMouseLeave}
        style={{
          background: "rgba(20, 20, 23, 0.45)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-glass)",
          borderRadius: "20px",
          padding: "20px 24px",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 24px 48px rgba(0, 0, 0, 0.6)",
          transform: tilt1.isHovered
            ? `rotate(2deg) rotateX(${tilt1.tilt.x}deg) rotateY(${tilt1.tilt.y}deg)`
            : "rotate(2deg) rotateY(-8deg) rotateX(4deg)",
          transformStyle: "preserve-3d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          transition: tilt1.isHovered ? "transform 0.05s ease-out" : "transform 0.4s ease-out",
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "var(--graphite)", textTransform: "uppercase", letterSpacing: "1px" }}>Active Goal</span>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--positive)", boxShadow: "0 0 6px var(--positive)" }} />
        </div>
        <Gauge value={85} size="L" subtitle="Weekly Goal Progress" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--sand)", fontFamily: FONT_BODY }}>Sync Q3 OKRs and Tasks</div>
          <div style={{ fontSize: "10px", color: "var(--graphite)", marginTop: "2px", fontFamily: FONT_BODY }}>Status: On Track</div>
        </div>
      </motion.div>

      {/* Decision Engine card */}
      <motion.div
        ref={tilt2.cardRef}
        onMouseMove={tilt2.onMouseMove}
        onMouseEnter={tilt2.onMouseEnter}
        onMouseLeave={tilt2.onMouseLeave}
        style={{
          background: "rgba(20, 20, 23, 0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          borderRadius: "16px",
          padding: "14px 18px",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
          transform: tilt2.isHovered
            ? `rotate(-2deg) rotateX(${tilt2.tilt.x}deg) rotateY(${tilt2.tilt.y}deg)`
            : "rotate(-2deg) rotateY(6deg) rotateX(-2deg) translateX(-12px)",
          transformStyle: "preserve-3d",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          transition: tilt2.isHovered ? "transform 0.05s ease-out" : "transform 0.4s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "6px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "var(--graphite)", textTransform: "uppercase", letterSpacing: "1px" }}>Decision Engine</span>
          <span style={{ fontSize: "9px", color: "var(--ember-light)", fontWeight: 600 }}>Active</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "rgba(232, 80, 2, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ember-light)",
            flexShrink: 0,
          }}>
            <Sparkles size={14} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--sand)", fontFamily: FONT_BODY }}>Linear integration completed</div>
            <div style={{ fontSize: "9px", color: "var(--graphite)", fontFamily: FONT_BODY }}>Switched API router to Ollama feed successfully</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


const GOOGLE_CLIENT_ID = "174203078115-lgbiq9ekbd01sr82us4ulb4nsb0boc3q.apps.googleusercontent.com";
const REDIRECT_URI = window.location.origin + "/auth/callback";

async function loginUser(email, password) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data;
}

async function signupUser({ name, email, company, password }) {
  const res = await api.post("/api/auth/signup", { name, email, company, password });
  return res.data;
}

async function forgotPassword(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

function generateNonce() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return "";
}

function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Minimum 8 characters";
  return "";
}

function getPasswordStrength(password) {
  if (!password || password.length < 8) return { score: 0, label: "Weak", color: "var(--warning)" };
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  if (score <= 1) return { score: 1, label: "Weak", color: "var(--warning)" };
  if (score === 2) return { score: 2, label: "Fair", color: "var(--ember)" };
  if (score <= 4) return { score: 3, label: "Good", color: "#3acaa5" };
  return { score: 4, label: "Excellent", color: "#3acaa5" };
}

function getPasswordChecks(password) {
  return [
    { key: "length", label: "8 characters", met: password.length >= 8 },
    { key: "uppercase", label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { key: "number", label: "Number", met: /[0-9]/.test(password) },
    { key: "symbol", label: "Symbol", met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

function inputBaseStyles(isError) {
  return {
    width: "100%",
    padding: "16px 16px 16px 44px",
    fontSize: "14px",
    borderRadius: "12px",
    outline: "none",
    fontFamily: FONT_BODY,
    background: "rgba(20, 20, 23, 0.45)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "var(--sand)",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  };
}

const SOCIAL_PROVIDERS = [
  {
    id: "google",
    label: "Google",
    active: true,
    badge: null,
    renderIcon: () => (
      <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 0 12 24c0-1.59-.28-3.14-.79-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.54l7.97-5.95z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.95C6.51 42.62 14.62 48 24 48z" />
      </svg>
    ),
  },
];

function StatusMessage({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className={isError ? "error-message" : ""}
      role={isError ? "alert" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "10px",
        fontSize: "12px",
        fontFamily: FONT_BODY,
        lineHeight: "1.4",
        background: isError ? "rgba(232, 67, 79, 0.08)" : "rgba(58, 202, 165, 0.08)",
        color: isError ? "var(--warning)" : "#3acaa5",
        border: `1px solid ${isError ? "rgba(232, 67, 79, 0.15)" : "rgba(58, 202, 165, 0.2)"}`,
      }}
    >
      {isError ? <AlertCircle size={14} style={{ flexShrink: 0 }} /> : <CheckCircle size={14} style={{ flexShrink: 0 }} />}
      <span>{message}</span>
    </motion.div>
  );
}

function FieldInput({ icon: Icon, type, value, onChange, placeholder, error, onFocus, onBlur, autoFocus }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);
  const boxShadow = "inset 3px 3px 8px rgba(0, 0, 0, 0.5), inset -2px -2px 6px rgba(255, 255, 255, 0.02)";
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Icon size={14} style={{
        position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
        color: error ? "var(--warning)" : focused ? "var(--ember-light)" : "var(--graphite)",
        pointerEvents: "none", zIndex: 1, transition: "color 0.3s ease",
      }} />
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          ...inputBaseStyles(!!error),
          paddingRight: "44px",
          border: error ? "1px solid rgba(232, 67, 79, 0.4)" : "none",
          boxShadow,
          outline: focused ? "2px solid var(--ember)" : "none",
          outlineOffset: "2px",
        }}
        onFocus={() => { setFocused(true); if (onFocus) onFocus(); }}
        onBlur={() => { setFocused(false); if (onBlur) onBlur(); }}
      />
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, error, autoFocus, showToggle }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);
  const boxShadow = "inset 3px 3px 8px rgba(0, 0, 0, 0.5), inset -2px -2px 6px rgba(255, 255, 255, 0.02)";
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Lock size={14} style={{
        position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
        color: error ? "var(--warning)" : focused ? "var(--ember-light)" : "var(--graphite)",
        pointerEvents: "none", zIndex: 1, transition: "color 0.3s ease",
      }} />
      <input
        ref={inputRef}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          ...inputBaseStyles(!!error),
          paddingRight: "44px",
          border: error ? "1px solid rgba(232, 67, 79, 0.4)" : "none",
          boxShadow,
          outline: focused ? "2px solid var(--ember)" : "none",
          outlineOffset: "2px",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showToggle !== false && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(!visible)}
          style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--graphite)", padding: "6px", display: "flex",
            alignItems: "center", justifyContent: "center", borderRadius: "6px",
            transition: "color 0.2s ease", zIndex: 1,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--sand)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--graphite)"}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const bars = [1, 2, 3, 4];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {bars.map((b) => (
          <motion.div
            key={b}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: b * 0.05, duration: 0.2 }}
            style={{
              flex: 1, height: "3px", borderRadius: "2px", transformOrigin: "left",
              background: b <= strength.score ? strength.color : "rgba(255,255,255,0.06)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <motion.span
        key={strength.label}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: "10px", fontFamily: FONT_BODY, color: strength.color, fontWeight: 500,
        }}
      >
        {strength.label}
      </motion.span>
    </motion.div>
  );
}

function PasswordRequirements({ password }) {
  if (!password) return null;
  const checks = getPasswordChecks(password);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      style={{ marginTop: "8px", overflow: "hidden" }}
    >
      <div style={{
        fontSize: "9px", fontFamily: FONT_BODY, color: "var(--graphite)",
        marginBottom: "6px", letterSpacing: "0.3px",
      }}>
        Password must contain:
      </div>
      {checks.map((check) => (
        <motion.div
          key={check.key}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}
        >
          <span style={{
            fontSize: "10px", fontFamily: FONT_BODY, transition: "color 0.2s ease",
            color: check.met ? "#3acaa5" : "var(--graphite-dim)",
          }}>
            {check.met ? "\u2713" : "\u25CB"}
          </span>
          <span style={{
            fontSize: "10px", fontFamily: FONT_BODY, transition: "color 0.2s ease",
            color: check.met ? "#3acaa5" : "var(--graphite)",
          }}>
            {check.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        fontSize: "10px", fontFamily: FONT_BODY, color: "var(--warning)", marginTop: "4px", display: "block",
      }}
    >
      {message}
    </motion.span>
  );
}

function SubmitButton({ loading, children, disabled, loadingText }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "14px 0", borderRadius: "12px",
        fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "1.5px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        border: "none",
        background: loading ? "rgba(232, 80, 2, 0.5)" : "var(--ember)",
        color: "#000000",
        boxShadow: loading
          ? "none"
          : hovered
          ? "0 6px 20px rgba(232, 80, 2, 0.45), inset 0 1px 0 rgba(255,255,255,0.4)"
          : "0 4px 14px rgba(232, 80, 2, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
        fontFamily: FONT_BODY,
        transition: "all 0.2s ease",
        opacity: disabled ? 0.5 : 1,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ display: "inline-flex" }}
          >
            <Loader2 size={13} />
          </motion.div>
          <span>{loadingText || "Processing..."}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <motion.div
            animate={{ x: hovered ? 3 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "inline-flex" }}
          >
            <ArrowRight size={13} />
          </motion.div>
        </>
      )}
    </button>
  );
}

function SocialSection({ onGoogleSignIn }) {
  const [hoveredProvider, setHoveredProvider] = useState(null);
  return (
    <div style={{ position: "relative", marginTop: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.04)" }} />
        <span style={{
          fontSize: "9px", fontFamily: "'JetBrains Mono', monospace",
          textTransform: "uppercase", letterSpacing: "2px",
          color: "var(--graphite-dim)", whiteSpace: "nowrap",
        }}>
          OR CONTINUE WITH
        </span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.04)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={!provider.active}
            onClick={provider.active ? onGoogleSignIn : undefined}
            onMouseEnter={() => setHoveredProvider(provider.id)}
            onMouseLeave={() => setHoveredProvider(null)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              padding: "13px 0", borderRadius: "12px", fontSize: "13px", fontWeight: 500,
              cursor: provider.active ? "pointer" : "not-allowed",
              border: "none",
              background: provider.active
                ? hoveredProvider === provider.id ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"
                : "rgba(255,255,255,0.03)",
              color: provider.active ? "var(--sand)" : "var(--graphite-dim)",
              fontFamily: FONT_BODY, opacity: provider.active ? 1 : 0.5,
              transition: "all 0.25s ease", position: "relative",
              boxShadow: hoveredProvider === provider.id && provider.active
                ? "0 0 20px rgba(232, 80, 2, 0.08)" : "none",
            }}
          >
            {provider.renderIcon()}
            <span>Continue with {provider.label}</span>
            {hoveredProvider === provider.id && provider.active && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ position: "absolute", right: "14px", color: "var(--ember-light)", display: "flex" }}
              >
                <ArrowRight size={14} />
              </motion.span>
            )}
            {provider.badge && (
              <span style={{
                fontSize: "7px", fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.5px",
                padding: "2px 6px", borderRadius: "4px",
                background: "rgba(255,255,255,0.04)", color: "var(--graphite-dim)",
              }}>
                {provider.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuthFooter() {
  return null;
}

function TransitionOverlay({ title, subtitle }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const interval = 30;
    const steps = duration / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setProgress(Math.min(step / steps, 1));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 0", textAlign: "center",
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: "56px", height: "56px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "24px",
          background: "rgba(232,80,2,0.08)", border: "1px solid rgba(232,80,2,0.2)",
          color: "var(--ember-light)",
        }}
      >
        <Loader2 size={28} />
      </motion.div>
      <h3 style={{
        fontFamily: FONT_SANS, fontSize: "18px", fontWeight: 700,
        color: "var(--sand)", margin: "0 0 6px 0",
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: FONT_BODY, fontSize: "12px", color: "var(--graphite)", margin: "0 0 24px 0",
      }}>
        {subtitle}
      </p>
      <div style={{
        width: "200px", height: "3px", borderRadius: "2px",
        background: "rgba(255,255,255,0.06)", overflow: "hidden",
      }}>
        <motion.div
          style={{ height: "100%", borderRadius: "2px", background: "var(--ember-gradient)" }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.03 }}
        />
      </div>
    </motion.div>
  );
}

function LeftPanelContent({ tab, isMobile }) {
  const isSignIn = tab === "signin";
  const heading = isSignIn
    ? ["Welcome back.", "Continue building your company."]
    : ["Start your founder journey.", "Create your AI Operating System."];

  return (
    <motion.div
      key={tab}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "relative",
        zIndex: 10,
        marginTop: isMobile ? "24px" : "32px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        width: "100%",
      }}
    >
      <div>
        <h1 style={{
          fontFamily: FONT_SANS,
          fontSize: isMobile ? "24px" : "32px",
          fontWeight: 900,
          letterSpacing: "-0.5px",
          lineHeight: "1.2",
          color: "var(--white)",
          margin: "0 0 10px 0",
        }}>
          {heading[0]}<br />
          <span style={{
            background: "var(--ember-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {heading[1]}
          </span>
        </h1>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        alignItems: "center",
        width: "100%",
      }}>
        <ProductGlimpse />
      </div>
    </motion.div>
  );
}

function Login({ handleSuccess, authError, onClearError }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [subview, setSubview] = useState("form");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [transitioning, setTransitioning] = useState(null);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [signinErrors, setSigninErrors] = useState({});
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupCompany, setSignupCompany] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (onClearError) onClearError();
    setStatus(null);
    setSigninErrors({});
    setSignupErrors({});
  }, [tab, subview]);

  useEffect(() => {
    return () => { if (onClearError) onClearError(); };
  }, []);

  const handleGoogleSignIn = useCallback(() => {
    const nonce = generateNonce();
    sessionStorage.setItem("google_nonce", nonce);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      response_type: "id_token",
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      nonce,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    const errors = {};
    const emailErr = validateEmail(signinEmail);
    if (emailErr) errors.email = emailErr;
    const passErr = validatePassword(signinPassword);
    if (passErr) errors.password = passErr;
    setSigninErrors(errors);
    if (Object.keys(errors).length) return;
    setStatus(null);
    setLoading(true);
    try {
      const res = await loginUser(signinEmail, signinPassword);
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      if (res.workspace) localStorage.setItem("workspaceId", String(res.workspace.id));
      setLoading(false);
      setTransitioning({ type: "signin", title: "Signing you in...", subtitle: "Loading your Founder Workspace..." });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Login failed. Please try again.";
      setStatus({ type: "error", message: errMsg });
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!signupName.trim()) errors.name = "Full name is required";
    const emailErr = validateEmail(signupEmail);
    if (emailErr) errors.email = emailErr;
    const passErr = validatePassword(signupPassword);
    if (passErr) errors.password = passErr;
    if (signupPassword !== signupConfirm) errors.confirm = "Passwords do not match";
    if (!acceptTerms) errors.terms = "You must accept the terms";
    setSignupErrors(errors);
    if (Object.keys(errors).length) return;
    setStatus(null);
    setLoading(true);
    try {
      const res = await signupUser({
        name: signupName.trim(),
        email: signupEmail.trim(),
        company: signupCompany.trim(),
        password: signupPassword,
      });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      if (res.workspace) localStorage.setItem("workspaceId", String(res.workspace.id));
      setLoading(false);
      setTransitioning({ type: "signup", title: "Account Created", subtitle: "Setting up your Founder Workspace..." });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Sign up failed. Please try again.";
      setStatus({ type: "error", message: errMsg });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setStatus({ type: "error", message: emailErr });
      return;
    }
    setStatus(null);
    setLoading(true);
    try {
      const res = await forgotPassword(resetEmail);
      setStatus({ type: "success", message: res.message });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Failed to send reset link.";
      setStatus({ type: "error", message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px)",
        backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0,
      }} />
      <motion.div
        animate={{ x: [0, 25, -15, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", width: "800px", height: "800px", borderRadius: "50%",
          backgroundImage: "radial-gradient(circle, rgba(232,80,2,0.03) 0%, transparent 70%)",
          top: "-150px", left: "-150px", pointerEvents: "none", zIndex: 0,
        }}
      />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.02, zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", backgroundSize: "256px 256px",
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="login-split"
        style={{
          width: "100%",
        }}
      >
        <div className="login-visual-panel">

          <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: "10px", justifyContent: isMobile ? "center" : "flex-start" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "var(--ember-gradient)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "var(--void)", fontWeight: 950,
              fontFamily: FONT_SANS, fontSize: "13px",
              boxShadow: "0 3px 8px rgba(232,80,2,0.25)",
            }}>
              Fd
            </div>
            <span style={{
              fontFamily: FONT_SANS, fontWeight: 800, fontSize: "14px",
              letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--sand)",
            }}>
              FounDesk
            </span>
          </div>

          <LeftPanelContent tab={tab} isMobile={isMobile} />

        </div>

        <div className="login-form-card">
          {!transitioning && (
            <div style={{ marginBottom: "20px" }}>
              <button
                onClick={() => subview === "forgot-password" ? setSubview("form") : navigate("/")}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "1.5px",
                  color: "var(--graphite)", background: "none", border: "none",
                  cursor: "pointer", padding: 0, transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--sand)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--graphite)"}
              >
                <span>&larr;</span>
                <span>{subview === "forgot-password" ? "Back to Sign In" : "Back to home"}</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {status && <StatusMessage key={`status-${status.type}`} type={status.type} message={status.message} />}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {transitioning ? (
              <TransitionOverlay key="transition" title={transitioning.title} subtitle={transitioning.subtitle} />
            ) : subview === "forgot-password" ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{
                    fontFamily: FONT_SANS, fontSize: "22px", fontWeight: 800,
                    color: "var(--white)", margin: "0 0 6px 0", letterSpacing: "-0.3px",
                  }}>
                    Reset Password
                  </h2>
                  <p style={{ fontFamily: FONT_BODY, fontSize: "13px", color: "var(--graphite)", margin: 0 }}>
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <FieldInput icon={Mail} type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@startup.com" autoFocus />
                  <SubmitButton loading={loading} loadingText="Sending...">Send Reset Link</SubmitButton>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === "signin" ? -6 : 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "signin" ? 6 : -6 }}
                transition={{ duration: 0.15 }}
              >

                {/* Tab switcher */}
                <div className="view-tabs" style={{ marginBottom: "22px", width: "100%" }}>
                  <button
                    onClick={() => setTab("signin")}
                    className={`view-tab ${tab === "signin" ? "active" : ""}`}
                    style={{ flex: 1, justifyContent: "center", border: "none", cursor: "pointer", background: "none" }}
                  >
                    <LogIn size={13} />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => setTab("signup")}
                    className={`view-tab ${tab === "signup" ? "active" : ""}`}
                    style={{ flex: 1, justifyContent: "center", border: "none", cursor: "pointer", background: "none" }}
                  >
                    <UserPlus size={13} />
                    <span>Create Account</span>
                  </button>
                </div>

                {/* Sign In form */}
                {tab === "signin" ? (
                  <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <FieldInput
                        icon={Mail} type="email" value={signinEmail}
                        onChange={(e) => { setSigninEmail(e.target.value); setSigninErrors((p) => ({ ...p, email: "" })); }}
                        placeholder="Email address" error={signinErrors.email} autoFocus
                      />
                      <FieldError message={signinErrors.email} />
                    </div>
                    <div>
                      <PasswordInput
                        value={signinPassword}
                        onChange={(e) => { setSigninPassword(e.target.value); setSigninErrors((p) => ({ ...p, password: "" })); }}
                        placeholder="Password" error={signinErrors.password}
                      />
                      <FieldError message={signinErrors.password} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        cursor: "pointer", fontSize: "11px", fontFamily: FONT_BODY,
                        color: "var(--graphite)", userSelect: "none",
                      }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{
                            accentColor: "var(--ember)",
                            width: "16px", height: "16px", cursor: "pointer",
                          }}
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => { setSubview("forgot-password"); setStatus(null); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "11px", fontFamily: FONT_BODY,
                          color: "var(--ember-light)", padding: 0, transition: "color 0.2s ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--ember)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--ember-light)"}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <SubmitButton loading={loading} loadingText="Signing In...">Continue</SubmitButton>
                  </form>
                ) : (
                  /* Sign Up form */
                  <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <FieldInput
                        icon={User} type="text" value={signupName}
                        onChange={(e) => { setSignupName(e.target.value); setSignupErrors((p) => ({ ...p, name: "" })); }}
                        placeholder="Full name" error={signupErrors.name} autoFocus
                      />
                      <FieldError message={signupErrors.name} />
                    </div>
                    <div>
                      <FieldInput
                        icon={Mail} type="email" value={signupEmail}
                        onChange={(e) => { setSignupEmail(e.target.value); setSignupErrors((p) => ({ ...p, email: "" })); }}
                        placeholder="name@company.com" error={signupErrors.email}
                      />
                      <FieldError message={signupErrors.email} />
                    </div>
                    <div>
                      <FieldInput
                        icon={Building} type="text" value={signupCompany}
                        onChange={(e) => setSignupCompany(e.target.value)}
                        placeholder="Company / Startup name (optional)"
                      />
                    </div>
                    <div>
                      <PasswordInput
                        value={signupPassword}
                        onChange={(e) => { setSignupPassword(e.target.value); setSignupErrors((p) => ({ ...p, password: "" })); }}
                        placeholder="Password" error={signupErrors.password}
                      />
                      <PasswordStrength password={signupPassword} />
                      <PasswordRequirements password={signupPassword} />
                      <FieldError message={signupErrors.password} />
                    </div>
                    <div>
                      <PasswordInput
                        showToggle={false}
                        value={signupConfirm}
                        onChange={(e) => { setSignupConfirm(e.target.value); setSignupErrors((p) => ({ ...p, confirm: "" })); }}
                        placeholder="Confirm password" error={signupErrors.confirm}
                      />
                      <FieldError message={signupErrors.confirm} />
                    </div>

                    <label style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      cursor: "pointer", fontSize: "11px", fontFamily: FONT_BODY,
                      color: "var(--graphite)", userSelect: "none", lineHeight: "1.5",
                    }}>
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => { setAcceptTerms(e.target.checked); setSignupErrors((p) => ({ ...p, terms: "" })); }}
                        style={{ accentColor: "var(--ember)", width: "16px", height: "16px", cursor: "pointer", marginTop: "2px", flexShrink: 0 }}
                      />
                      <span>
                        I agree to the <span style={{ color: "var(--ember-light)" }}>Terms of Service</span> and <span style={{ color: "var(--ember-light)" }}>Privacy Policy</span>
                      </span>
                    </label>
                    <FieldError message={signupErrors.terms} />

                    <SubmitButton loading={loading} disabled={!acceptTerms} loadingText="Creating Account...">Create Account</SubmitButton>
                  </form>
                )}

                {/* Social login + footer */}
                <SocialSection onGoogleSignIn={handleGoogleSignIn} />
                <AuthFooter />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
