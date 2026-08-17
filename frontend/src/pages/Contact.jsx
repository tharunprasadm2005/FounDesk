import LegalShell from "../components/LegalShell";
import { Mail, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <LegalShell title="Contact" subtitle="We usually reply within one business day.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href="mailto:support@foundesk.app" className="fd-glass-soft" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "14px 18px", textDecoration: "none", color: "var(--fd-ink)" }}>
          <Mail size={18} style={{ color: "var(--fd-ink-2)", flexShrink: 0 }} />
          <div>
            <div className="fd-body" style={{ fontSize: 13.5, fontWeight: 700 }}>Email support</div>
            <div className="fd-body" style={{ fontSize: 12.5, color: "var(--fd-ink-3)", fontWeight: 500 }}>support@foundesk.app</div>
          </div>
        </a>
        <a href="mailto:hello@foundesk.app" className="fd-glass-soft" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "14px 18px", textDecoration: "none", color: "var(--fd-ink)" }}>
          <MessageCircle size={18} style={{ color: "var(--fd-ink-2)", flexShrink: 0 }} />
          <div>
            <div className="fd-body" style={{ fontSize: 13.5, fontWeight: 700 }}>General inquiries</div>
            <div className="fd-body" style={{ fontSize: 12.5, color: "var(--fd-ink-3)", fontWeight: 500 }}>hello@foundesk.app</div>
          </div>
        </a>
      </div>
      <p className="fd-body" style={{ fontSize: 13, color: "var(--fd-ink-3)", margin: "4px 0 0", lineHeight: 1.6, fontWeight: 500 }}>
        For billing issues, include your workspace name so we can find your account faster.
      </p>
    </LegalShell>
  );
}
