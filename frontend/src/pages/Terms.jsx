import LegalShell from "../components/LegalShell";

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" subtitle="The short version: use FounDesk for its intended purpose, and your data stays yours.">
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>The service</h3>
        <p style={{ margin: 0 }}>
          FounDesk compiles signals from the tools you connect into a daily briefing, decisions log, follow-ups, and task execution. Plans are billed monthly; features gated by plan are described on the pricing page.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Acceptable use</h3>
        <p style={{ margin: 0 }}>
          You may not use the service to transmit unlawful content, reverse-engineer the platform, or interfere with other users' workspaces.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>AI-generated content</h3>
        <p style={{ margin: 0 }}>
          Briefings and summaries are AI-drafted from your own signals and may occasionally be imperfect. They are provided as-is and should be reviewed before acting on them.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Liability</h3>
        <p style={{ margin: 0 }}>
          The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, FounDesk is not liable for indirect or consequential damages arising from use of the service.
        </p>
      </div>
      <div>
        <h3 className="fd-body" style={{ fontSize: 15, fontWeight: 700, color: "var(--fd-ink)", margin: "0 0 6px" }}>Changes</h3>
        <p style={{ margin: 0 }}>
          We may update these terms from time to time. Continued use of the service after changes are posted constitutes acceptance of the revised terms.
        </p>
      </div>
    </LegalShell>
  );
}
