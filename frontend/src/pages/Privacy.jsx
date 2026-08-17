import LegalShell from "../components/LegalShell";

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" subtitle="What we collect, why we collect it, and how it's handled.">
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Data we collect</h3>
        <p style={{ margin: 0 }}>
          We store the data you connect — calendar, email, task, and CRM signals — solely to compile your daily briefing, track decisions, and surface follow-ups. We never sell personal data.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>How it's used</h3>
        <p style={{ margin: 0 }}>
          Your workspace data is used to power the pattern engine (briefings, blockers, follow-ups) and is never shared with third parties except the AI providers used to draft summaries. Model inference sends only the relevant signal text, not credentials.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Retention & deletion</h3>
        <p style={{ margin: 0 }}>
          You can revoke any connected integration from Settings at any time. Workspace data can be deleted by contacting us; account deletion removes your data within 30 days.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Security</h3>
        <p style={{ margin: 0 }}>
          Passwords are hashed, tokens are rotated on revocation, and access is scoped per workspace member. Questions? Reach us via the contact page.
        </p>
      </div>
    </LegalShell>
  );
}
