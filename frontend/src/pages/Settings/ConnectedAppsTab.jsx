import { useState, useRef } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { INTEGRATION_CATEGORIES, TOKEN_PROVIDERS, SETTINGS_STYLE as s } from "./SettingsConstants";
import { Search, Check, X, Plus } from "lucide-react";

export default function ConnectedAppsTab({ integrations, onIntegrationsChange, pollTimerRef }) {
  const toast = useToast();
  const [searchIntegration, setSearchIntegration] = useState("");
  const [apiKeyModal, setApiKeyModal] = useState({ open: false, provider: "", name: "" });
  const [apiKeyInput, setApiKeyInput] = useState("");

  const handleConnect = async (provider) => {
    if (TOKEN_PROVIDERS.has(provider)) {
      const cat = INTEGRATION_CATEGORIES.flatMap(c => c.services).find(s => s.key === provider);
      setApiKeyModal({ open: true, provider, name: cat?.name || provider });
      setApiKeyInput("");
      return;
    }
    const popup = window.open("", "_blank", "width=600,height=700");
    if (!popup) { toast("Popup blocked. Please allow popups for this site and try again.", "error"); return; }
    pollTimerRef.current = setInterval(() => { if (popup.closed) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; onIntegrationsChange(); } }, 500);
    setTimeout(() => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } }, 120000);
    popup.document.write("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Redirecting...</title><style>body{background:#121214;color:#e8e4e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style></head><body><p>Connecting...</p></body></html>");
    try {
      const res = await api.post("/api/integrations/oauth/url", { provider });
      if (res.data?.url) popup.location.href = res.data.url; else popup.close();
    } catch (err) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } popup.close();
      if (err?.response?.status === 400) {
        const msg = err.response?.data?.error || "";
        if (msg.includes("not supported") || msg.includes("not configured")) toast(`"${provider}" OAuth is not yet configured on the server.`, "error");
        else toast(`${provider} requires API key configuration.`, "error");
      }
    }
  };

  const handleSaveApiToken = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      await api.post("/api/integrations/token", { provider: apiKeyModal.provider, access_token: apiKeyInput.trim(), connected_email: `${apiKeyModal.provider}@api` });
      setApiKeyModal({ open: false, provider: "", name: "" });
      setApiKeyInput("");
      onIntegrationsChange();
      toast(`${apiKeyModal.name} connected successfully.`, "success");
    } catch (err) { toast(err.response?.data?.error || "Failed to connect.", "error"); }
  };

  const handleDisconnect = async (provider) => {
    try { const res = await api.delete(`/api/integrations/${provider}`); if (res.status === 200) onIntegrationsChange(); } catch (err) { console.error("[Settings] Failed to disconnect integration:", err); }
  };

  const filtered = INTEGRATION_CATEGORIES.map(cat => ({
    ...cat,
    services: cat.services.filter(s => !searchIntegration.trim() || s.name.toLowerCase().includes(searchIntegration.toLowerCase()))
      .sort((a, b) => ((b.supported ? 1 : 0) - (a.supported ? 1 : 0))),
  })).filter(cat => cat.services.length > 0);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: "16px", maxWidth: "320px" }}>
        <input type="text" placeholder="Search integrations..." value={searchIntegration} onChange={e => setSearchIntegration(e.target.value)}
          className="plan-input" style={{ width: "100%", paddingLeft: "32px", fontSize: "12.5px" }} />
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)", pointerEvents: "none" }} />
      </div>
      {filtered.map(category => (
        <div key={category.key} style={{ marginBottom: "24px" }}>
          <div className="card-label" style={{ margin: "24px 0 12px 4px" }}>{category.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {category.services.map(svc => {
              const integ = integrations.find(i => i.provider?.toLowerCase() === svc.key);
              const connected = integ?.connected === true;
              if (!svc.supported) return (
                <div key={svc.key} className="card-glass" style={{ padding: "16px", opacity: 0.45, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "8px", backgroundColor: "rgba(107,107,111,0.1)", flexShrink: 0 }} />
                      <div><div style={{ fontSize: "13px", fontWeight: 600, color: "var(--japandi-muted)" }}>{svc.name}</div><div style={{ fontSize: "10px", color: "var(--japandi-muted)" }}>Coming soon</div></div>
                    </div>
                  </div>
                </div>
              );
              return (
                <div key={svc.key} className="card-glass" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "8px", backgroundColor: connected ? "rgba(214,130,79,0.15)" : "rgba(107,107,111,0.1)", border: connected ? "1px solid rgba(214,130,79,0.2)" : "1px solid rgba(107,107,111,0.12)", flexShrink: 0 }} />
                      <div><div style={{ fontSize: "13px", fontWeight: 600, color: "var(--japandi-text)" }}>{svc.name}</div><div style={{ fontSize: "10px", color: "var(--japandi-muted)" }}>{connected ? `Connected as ${integ.email || integ.provider}` : "Not connected"}</div></div>
                    </div>
                    {connected ? <span className="badge badge-positive">CONNECTED</span> : <span className="badge badge-neutral">UNLINKED</span>}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                    <button onClick={() => handleConnect(svc.key)} className={connected ? "btn-outline-ember" : "btn-ember"}>{connected ? "Reconnect" : "Connect"}</button>
                    {connected && <button onClick={() => handleDisconnect(svc.key)} className="btn-destructive-outline-sm">Disconnect</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {apiKeyModal.open && (
        <div style={s.overlay} onClick={() => setApiKeyModal({ open: false, provider: "", name: "" })}>
          <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Connect {apiKeyModal.name}</h3>
            <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: "0 0 16px" }}>Enter your API key or token for {apiKeyModal.name}.</p>
            <input type="text" placeholder="Paste your API key here" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} autoFocus />
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={handleSaveApiToken} className="btn-ember"><Check size={14} /> Connect</button>
              <button onClick={() => setApiKeyModal({ open: false, provider: "", name: "" })} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
