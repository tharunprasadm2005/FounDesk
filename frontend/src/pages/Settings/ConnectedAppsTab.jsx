import { useState, useRef } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { INTEGRATION_CATEGORIES, TOKEN_PROVIDERS } from "./SettingsConstants";
import { Search, Check, X, Plus } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Inline, Stack } from "../../components/layout";

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
    <div className="animate-in fade-in">
      <div className="mb-[32px] max-w-[320px]">
        <Input 
          type="text" 
          placeholder="Search integrations..." 
          value={searchIntegration} 
          onChange={e => setSearchIntegration(e.target.value)}
          icon={<Search size={14} />}
        />
      </div>

      <Stack gap="gap-[48px]">
        {filtered.map(category => (
          <div key={category.key}>
            <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px] pl-[4px]">
              {category.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
              {category.services.map(svc => {
                const integ = integrations.find(i => i.provider?.toLowerCase() === svc.key);
                const connected = integ?.connected === true;

                if (!svc.supported) return (
                  <Card key={svc.key} padding="p-[20px]" className="opacity-50 grayscale flex flex-col gap-[16px] bg-washi-white">
                    <Inline justify="justify-between" items="items-start">
                      <Inline gap="gap-[12px]" items="items-center">
                        <div className="w-[32px] h-[32px] rounded-[4px] bg-stone-100 border border-stone-200 shrink-0" />
                        <div>
                          <div className="text-[14px] font-medium text-stone-500 leading-none mb-[4px]">{svc.name}</div>
                          <div className="text-[11px] text-stone-400">Coming soon</div>
                        </div>
                      </Inline>
                    </Inline>
                  </Card>
                );

                return (
                  <Card key={svc.key} padding="p-[20px]" className={`flex flex-col gap-[16px] bg-washi-white transition-colors ${connected ? 'border-moss-600/30 shadow-sm' : 'hover:border-stone-400'}`}>
                    <Inline justify="justify-between" items="items-start">
                      <Inline gap="gap-[12px]" items="items-center">
                        <div className={`w-[32px] h-[32px] rounded-[4px] shrink-0 ${connected ? 'bg-moss-600/10 border border-moss-600/20' : 'bg-stone-100 border border-stone-200'}`} />
                        <div>
                          <div className="text-[14px] font-medium text-sumi-900 leading-none mb-[4px]">{svc.name}</div>
                          <div className="text-[11px] text-stone-400 line-clamp-1">{connected ? `Connected: ${integ.email || integ.provider}` : "Not connected"}</div>
                        </div>
                      </Inline>
                      {connected ? (
                        <span className="px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 text-[10px] font-bold tracking-wide uppercase">
                          Connected
                        </span>
                      ) : (
                        <span className="px-[8px] py-[4px] rounded-[2px] bg-stone-100 text-stone-400 text-[10px] font-bold tracking-wide uppercase">
                          Unlinked
                        </span>
                      )}
                    </Inline>
                    <Inline gap="gap-[8px]" className="mt-auto pt-[4px]">
                      <Button onClick={() => handleConnect(svc.key)} variant={connected ? "secondary" : "primary"} size="sm">
                        {connected ? "Reconnect" : "Connect"}
                      </Button>
                      {connected && (
                        <Button onClick={() => handleDisconnect(svc.key)} variant="secondary" size="sm" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                          Disconnect
                        </Button>
                      )}
                    </Inline>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </Stack>

      {apiKeyModal.open && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setApiKeyModal({ open: false, provider: "", name: "" })}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-sumi-900 mb-[8px] m-0">Connect {apiKeyModal.name}</h3>
            <p className="text-[13px] text-stone-500 mb-[24px]">Enter your API key or token for {apiKeyModal.name}.</p>
            <Input 
              type="text" 
              placeholder="Paste your API key here" 
              value={apiKeyInput} 
              onChange={e => setApiKeyInput(e.target.value)} 
              autoFocus 
            />
            <Inline gap="gap-[12px]" className="mt-[24px]">
              <Button onClick={handleSaveApiToken} variant="primary">
                <Check size={14} className="mr-1" /> Connect
              </Button>
              <Button onClick={() => setApiKeyModal({ open: false, provider: "", name: "" })} variant="secondary">
                Cancel
              </Button>
            </Inline>
          </Card>
        </div>
      )}
    </div>
  );
}
