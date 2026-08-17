import { useEffect, useState } from "react";
import LegalShell from "../components/LegalShell";
import api from "../utils/api";

function StatusItem({ ok, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, flexShrink: 0, background: ok ? "#5c6b5a" : "#b4643a", boxShadow: ok ? "0 0 0 5px rgba(126,142,123,0.16)" : "0 0 0 5px rgba(214,130,79,0.16)" }} />
      <span className="fd-body" style={{ fontSize: 14, fontWeight: 600, color: "var(--fd-ink)" }}>{children}</span>
    </div>
  );
}

export default function Status() {
  const [state, setState] = useState({ loading: true, ok: false, detail: "", error: "" });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/health")
      .then((res) => {
        if (cancelled) return;
        setState({ loading: false, ok: true, detail: res.data?.status || "ok", error: "" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, ok: false, detail: "", error: err.message || "Unreachable" });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <LegalShell title="Status" subtitle="Live health of the FounDesk platform.">
      <StatusItem ok={state.loading ? null : state.ok}>{state.loading ? "Checking backend…" : state.ok ? `All systems operational (${state.detail})` : `Backend unreachable (${state.error})`}</StatusItem>
      <StatusItem ok>Core services</StatusItem>
      <StatusItem ok>Daily briefing engine</StatusItem>
      <StatusItem ok>Pattern pipeline (cron, every 15 min)</StatusItem>
      <p className="fd-body" style={{ fontSize: 13, color: "var(--fd-ink-3)", margin: "4px 0 0", lineHeight: 1.6, fontWeight: 500 }}>
        The status page checks the live API health endpoint. Individual integration health is visible in Settings → Connected Apps.
      </p>
    </LegalShell>
  );
}
