import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { track } from "../utils/track";
import { useToast } from "../context/ToastContext";
import { TABS, SUBTITLE_MAP } from "./Settings/SettingsConstants";
import ConnectedAppsTab from "./Settings/ConnectedAppsTab";
import WorkspacesTab from "./Settings/WorkspacesTab";
import NotificationsTab from "./Settings/NotificationsTab";
import TeamTab from "./Settings/TeamTab";
import AccountTab from "./Settings/AccountTab";
import BillingTab from "./Settings/BillingTab";
import ApiKeysTab from "./Settings/ApiKeysTab";
import { Section, Stack, Inline } from "../components/layout";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("apps");
  const pollTimerRef = useRef(null);

  const [integrations, setIntegrations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/api/integrations");
      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        setIntegrations(Object.entries(res.data).map(([provider, info]) => ({ provider, connected: info.connected, email: info.email, is_expired: info.is_expired })));
      } else { setIntegrations(Array.isArray(res.data) ? res.data : []); }
    } catch (err) { console.error("[Settings] Failed to fetch integrations:", err); }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get("/api/workspaces");
      const wsList = res.data || [];
      setWorkspaces(wsList);
      const wsId = localStorage.getItem("workspaceId");
      const ws = wsList.find(w => w.id.toString() === wsId) || wsList[0];
      setCurrentWorkspace(ws);
      setTeamMembers(ws?.members?.filter(m => m.status === "active") || []);
    } catch (err) { console.error("[Settings] Failed to fetch workspaces:", err); }
  };

  const fetchNotificationPrefs = async () => {
    try {
      const res = await api.get("/api/notifications/preferences");
      setNotificationPrefs(res.data?.preferences || {});
    } catch (err) { console.error("[Settings] Failed to fetch notification preferences:", err); }
  };

  useEffect(() => {
    track("page_viewed", { page: "settings" });
    fetchIntegrations();
    fetchWorkspaces();
    fetchNotificationPrefs();
    const params = new URLSearchParams(window.location.search);
    const callback = params.get("callback") || params.get("state");
    const code = params.get("code");
    if (callback && code) {
      api.post("/api/integrations/oauth/callback", { provider: callback, code })
        .then(() => {
          if (window.opener) { try { window.opener.postMessage("oauth_done", window.location.origin); } catch (err) { console.error("[Settings] OAuth postMessage failed:", err); } }
          try { localStorage.setItem("oauth_done", JSON.stringify({ provider: callback, ts: Date.now() })); } catch (err) { console.error("[Settings] Failed to save oauth_done to localStorage:", err); }
          try { window.close(); } catch (err) { console.error("[Settings] Failed to close popup window:", err); }
          if (!window.opener) fetchIntegrations();
        }).catch((err) => {
          const msg = err?.response?.data?.error || err?.message || "OAuth failed";
          document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;background:#121214;color:#e8e4e0;"><h2 style="color:#ef4444;">Connection failed</h2><p>${msg}</p><button onclick="window.close()" style="margin-top:20px;padding:8px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button></div>`;
        });
      window.history.replaceState({}, "", "/settings");
    }
    const handleOAuth = (e) => { if (e.data === "oauth_done") fetchIntegrations(); };
    window.addEventListener("message", handleOAuth);
    return () => {
      window.removeEventListener("message", handleOAuth);
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "apps":
        return <ConnectedAppsTab integrations={integrations} onIntegrationsChange={fetchIntegrations} pollTimerRef={pollTimerRef} />;
      case "workspaces":
        return <WorkspacesTab workspaces={workspaces} currentWorkspace={currentWorkspace} onWorkspacesChange={fetchWorkspaces} integrations={integrations} />;
      case "notifications":
        return <NotificationsTab notificationPrefs={notificationPrefs} onNotificationPrefsChange={setNotificationPrefs} />;
      case "team":
        return <TeamTab teamMembers={teamMembers} currentWorkspace={currentWorkspace} onTeamChange={fetchWorkspaces} />;
      case "account":
        return <AccountTab />;
      case "billing":
        return <BillingTab />;
      case "apikeys":
        return <ApiKeysTab />;
      default:
        return <ConnectedAppsTab integrations={integrations} onIntegrationsChange={fetchIntegrations} pollTimerRef={pollTimerRef} />;
    }
  };

  return (
    <Section padding="p-0" className="max-w-7xl mx-auto w-full font-ui">
      <header className="mb-[64px]">
        <Inline justify="justify-between" items="items-start">
          <Stack gap="gap-[8px]">
            <h1 className="text-[32px] md:text-[40px] font-heading text-sumi-900 m-0">Settings</h1>
            <p className="text-[12px] font-mono text-stone-400 m-0 uppercase tracking-widest">{SUBTITLE_MAP[activeTab]}</p>
          </Stack>
        </Inline>
      </header>
      
      <div className="mb-[48px]">
        <Inline gap="gap-[8px]" className="p-[4px] bg-linen-100 rounded-[4px] border border-stone-200 w-fit flex-wrap">
          {TABS.map(tab => (
            <button 
              key={tab.key} 
              className={`flex items-center gap-[8px] px-[16px] py-[8px] rounded-[2px] text-[13px] font-medium transition-colors cursor-pointer outline-none ${
                activeTab === tab.key 
                  ? "bg-washi-white text-sumi-900 shadow-sm border border-stone-200" 
                  : "text-stone-400 hover:text-sumi-900 border border-transparent bg-transparent"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </Inline>
      </div>
      
      <div className="max-w-5xl">
        {renderContent()}
      </div>
    </Section>
  );
}
