import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TOAST_TYPES = {
  success: { icon: CheckCircle, color: "#3acaa5", bg: "rgba(58, 202, 165, 0.1)", border: "rgba(58, 202, 165, 0.2)" },
  error: { icon: AlertCircle, color: "var(--warning)", bg: "rgba(232, 67, 79, 0.1)", border: "rgba(232, 67, 79, 0.2)" },
  info: { icon: Info, color: "var(--ember-light)", bg: "rgba(232, 80, 2, 0.08)", border: "rgba(232, 80, 2, 0.15)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: "fixed", top: "20px", right: "20px", zIndex: 99999,
        display: "flex", flexDirection: "column", gap: "8px",
        pointerEvents: "none", maxWidth: "380px",
      }}>
        <AnimatePresence>
          {toasts.map(t => {
            const config = TOAST_TYPES[t.type] || TOAST_TYPES.info;
            const Icon = config.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
                style={{
                  pointerEvents: "auto",
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 16px", borderRadius: "12px",
                  background: "rgba(16, 16, 19, 0.92)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${config.border}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  fontSize: "13px", color: "var(--sand)",
                  lineHeight: "1.4",
                }}
              >
                <Icon size={16} style={{ color: config.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--graphite)", padding: "2px", display: "flex",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--sand)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--graphite)"}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
