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
      setNotificationPrefs(res.data?.rules || {});
    } catch (err) { console.error("[Settings] Failed to fetch notification preferences:", err); }
  };

  useEffect(() => {
    track("page_viewed", { page: "settings" });
    fetchIntegrations();
    fetchWorkspaces();
    fetchNotificationPrefs();
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
    <div className="settings-page" style={{ padding: "clamp(30px, 5vw, 64px)", paddingBottom: "64px", fontFamily: "'Manrope', sans-serif" }}>
      <div className="fd-hero hero-settings" data-anchor="S">
        <div className="fd-hero-main">
          <div className="fd-hero-kicker">Open desk</div>
          <h1 className="fd-hero-title">{TABS.find(t => t.key === activeTab)?.label || "Settings"}</h1>
          <p className="fd-hero-sub">{SUBTITLE_MAP[activeTab]}</p>
        </div>
        <div className="fd-hero-side">
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{integrations.filter(i => i.connected).length}</span>
            <span className="fd-hero-chip-label">Apps connected</span>
          </div>
        </div>
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
