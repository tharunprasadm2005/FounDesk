import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ArrowRight, CheckCircle, LogIn, UserPlus, Sparkles } from "lucide-react";
import api from "../utils/api";

const FONT_SANS = "'Clash Display', system-ui, sans-serif";
const FONT_BODY = "'Satoshi', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const GOOGLE_CLIENT_ID = "174203078115-lgbiq9ekbd01sr82us4ulb4nsb0boc3q.apps.googleusercontent.com";
const REDIRECT_URI = window.location.origin + "/auth/callback";

function generateNonce() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

export default function AuthModal({ isOpen, onClose, handleSuccess, authError }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleGoogleSignIn = () => {
    const nonce = generateNonce();
    sessionStorage.setItem("google_nonce", nonce);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      response_type: "id_token",
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      nonce: nonce,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/waitlist", {
        email: email,
        source: "landing_page",
        created_at: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to submit. Please try again.";
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(32px)" }}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] overflow-hidden"
            style={{
              background: "#121214",
              border: "1px solid rgba(255,90,0,0.08)",
              borderRadius: "20px",
              boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 80px rgba(255,90,0,0.03)",
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #ff5a00 0%, transparent 60%)" }}
            />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", color: "#8e8e93" }}
            >
              <X size={14} />
            </button>

            <div className="p-8 relative z-10">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-4"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: "rgba(255,90,0,0.1)", border: "1px solid rgba(255,90,0,0.2)", color: "#ff5a00" }}
                  >
                    <CheckCircle size={28} />
                  </div>
                  <h2 className="text-xl font-light mb-2" style={{ fontFamily: FONT_SANS, color: "#fcfbfa" }}>
                    You're on the list
                  </h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: FONT_BODY, color: "#8e8e93" }}>
                    We'll send your workspace access to <strong style={{ color: "#fcfbfa" }}>{email}</strong> shortly.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-none transition-all"
                    style={{ background: "#ff5a00", color: "#000" }}
                  >
                    Dismiss
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: "rgba(255,90,0,0.08)", border: "1px solid rgba(255,90,0,0.12)" }}
                    >
                      <Sparkles size={22} style={{ color: "#ff5a00" }} />
                    </div>
                    <h2 className="text-xl font-light" style={{ fontFamily: FONT_SANS, color: "#fcfbfa" }}>
                      Get started
                    </h2>
                    <p className="text-xs mt-1" style={{ fontFamily: FONT_BODY, color: "#8e8e93" }}>
                      Sign in or join the waitlist
                    </p>
                  </div>

                  <div className="flex gap-1 mb-6 p-1 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <button
                      onClick={() => setTab("signin")}
                      className="flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
                      style={{
                        fontFamily: FONT_BODY,
                        color: tab === "signin" ? "#fcfbfa" : "#8e8e93",
                        background: tab === "signin" ? "rgba(255,90,0,0.1)" : "transparent",
                      }}
                    >
                      <LogIn size={13} />
                      Sign In
                    </button>
                    <button
                      onClick={() => setTab("waitlist")}
                      className="flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
                      style={{
                        fontFamily: FONT_BODY,
                        color: tab === "waitlist" ? "#fcfbfa" : "#8e8e93",
                        background: tab === "waitlist" ? "rgba(255,90,0,0.1)" : "transparent",
                      }}
                    >
                      <UserPlus size={13} />
                      Get Early Access
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "signin" ? (
                      <motion.div
                        key="signin"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {authError && (
                          <div className="mb-4 px-3 py-2 rounded-lg text-xs text-center"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}
                          >
                            {authError}
                          </div>
                        )}
                        <div className="flex flex-col items-center py-4 rounded-2xl"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                        >
                          <span className="text-[9px] font-mono uppercase tracking-widest mb-4" style={{ color: "#8e8e93" }}>
                            Continue with Google
                          </span>
                          <button
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium cursor-pointer border-none transition-all"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fcfbfa" }}
                          >
                            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 0 12 24c0-1.59-.28-3.14-.79-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.54l7.97-5.95z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.95C6.51 42.62 14.62 48 24 48z"/></svg>
                            Continue with Google
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="waitlist"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <form onSubmit={handleSubmit}>
                          <div className="relative mb-3">
                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8e8e93" }} />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@startup.com"
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none transition-all"
                              style={{
                                fontFamily: FONT_BODY,
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                color: "#fcfbfa",
                              }}
                              onFocus={(e) => e.target.style.borderColor = "#ff5a00"}
                              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
                            />
                          </div>
                          {submitError && (
                            <div className="text-xs mb-3" style={{ color: "#ef4444" }}>{submitError}</div>
                          )}
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none transition-all disabled:opacity-50"
                            style={{
                              background: "#ff5a00",
                              color: "#000",
                              boxShadow: "3px 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                            }}
                          >
                            {isSubmitting ? "Requesting..." : "Request Early Access"}
                            {!isSubmitting && <ArrowRight size={13} />}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-[9px] text-center mt-6 font-mono uppercase tracking-wider" style={{ color: "#646464" }}>
                    Free for pre-seed founders
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
