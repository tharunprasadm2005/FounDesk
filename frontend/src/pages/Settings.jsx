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
    <div className="settings-page" style={{ padding: "24px 32px", fontFamily: "'Satoshi', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>{SUBTITLE_MAP[activeTab]}</p>
      </div>
      <div className="view-tabs" style={{ marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={tab.key} className={`view-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            style={{ cursor: "pointer", border: "none", background: "transparent" }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="fade-in">{renderContent()}</div>
    </div>
  );
}
