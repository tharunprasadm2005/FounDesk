import { Link } from "react-router-dom";
import Brand from "./Brand";
import { ArrowLeft } from "lucide-react";

export default function LegalShell({ title, subtitle, children }) {
  return (
    <div className="fd-auth fd-field fd-grain" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44 }}>
          <Brand />
          <Link to="/" className="fd-body" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--fd-ink-3)", fontFamily: '"Manrope", sans-serif', fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        <div className="fd-kicker" style={{ marginBottom: 12 }}>FounDesk</div>
        <h1 className="fd-display" style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)", margin: "0 0 8px", lineHeight: 1.05 }}>{title}</h1>
        {subtitle && (
          <p className="fd-body" style={{ fontSize: 15, color: "var(--fd-ink-3)", margin: "0 0 40px", lineHeight: 1.6, fontWeight: 500, maxWidth: 560 }}>{subtitle}</p>
        )}

        <div className="fd-glass" style={{ borderRadius: 28, padding: "38px 36px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, fontSize: 14.5, lineHeight: 1.75, color: "var(--fd-ink-2)", fontFamily: '"Manrope", sans-serif', fontWeight: 500 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
