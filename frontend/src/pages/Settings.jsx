import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertCircle, Archive, ArrowRight, AtSign, Award, Ban, BarChart3, Bell, BellOff, Book,
  Calendar, Camera, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Cloud,
  Code, Command, Copy, CreditCard, Crown, Database, DollarSign, Download, Edit,
  ExternalLink, Eye, EyeOff, FileDown, FileText, Filter, Flag, Folder, Gift,
  GitBranch, Globe, Grid, HardDrive, Hash, Headphones, Heart, HelpCircle,
  Image, Inbox, Info, Key, Keyboard, Layers, Layout, Link, List, Loader,
  Lock, LogOut, Mail, MapPin, MessageCircle, MessageSquare, Monitor, Moon, MoreHorizontal,
  Music, Network, Newspaper, Package, Paintbrush, Palette, Paperclip, Pause, Pencil,
  Percent, Phone, PieChart, PiggyBank, Pin,   Plus, Power, Puzzle, RefreshCw, Rocket, Rss,
  Save, Search, Send, Server, Settings as SettingsIcon, Share, Shield, ShieldCheck,
  ShoppingCart, Signal, Sliders, Smartphone, Star, StopCircle, Sun, SwatchBook,
  Table, Tag, Target, Terminal, ToggleLeft, ToggleRight, Trash2, TrendingUp, Trophy,
  Tv, Umbrella, Unlink, Unlock, Upload, User, UserCheck, UserMinus,
  UserPlus, UserX, Users, Video, Wallet, Watch, Webhook, Wifi, X, XCircle, Zap,
  ZoomIn, ZoomOut, Globe as Earth, BellRing, Fingerprint, Scan, BookOpen, Ticket,
  PhoneCall, MessageCircle as Chat, Mail as Envelope, MoreVertical,
} from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";

const FONT_SANS = "'Clash Display', system-ui, sans-serif";
const FONT_BODY = "'Satoshi', system-ui, sans-serif";

const TABS = [
  { key: "apps", label: "Connected Apps", icon: "puzzle" },
  { key: "workspaces", label: "Workspaces", icon: "globe" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "team", label: "Team Space", icon: "users" },
  { key: "account", label: "Account", icon: "user" },
  { key: "billing", label: "Billing", icon: "credit-card" },
  { key: "apikeys", label: "API Keys", icon: "key" },
];

const SUBTITLE_MAP = {
  apps: "Connect your tools and services to sync data with FounDesk.",
  workspaces: "Manage workspaces, stages, and team structure.",
  notifications: "Control what alerts and updates you receive.",
  team: "Team members, roles, and permissions.",
  account: "Your profile, security, and account settings.",
  billing: "Manage your subscription and payment methods.",
  apikeys: "API keys for programmatic access to FounDesk.",
};

const INTEGRATION_CATEGORIES = [
  { name: "Communication", key: "communication", services: [
    { name: "Gmail", key: "gmail", supported: true }, { name: "Outlook Email", key: "outlook" },
    { name: "Slack", key: "slack", supported: true }, { name: "Microsoft Teams", key: "teams" },
    { name: "WhatsApp Business", key: "whatsapp" },
  ]},
  { name: "Calendar & Meetings", key: "calendar", services: [
    { name: "Google Calendar", key: "google_calendar", supported: true },
    { name: "Outlook Calendar", key: "outlook_calendar" }, { name: "Calendly", key: "calendly", supported: true },
    { name: "Zoom", key: "zoom" }, { name: "Google Meet", key: "google_meet", supported: true },
  ]},
  { name: "Docs, Tasks & Wikis", key: "docs", services: [
    { name: "Linear", key: "linear", supported: true }, { name: "Jira", key: "jira" },
    { name: "Trello", key: "trello", supported: true }, { name: "Asana", key: "asana", supported: true },
    { name: "Monday.com", key: "monday", supported: true }, { name: "GitHub", key: "github", supported: true },
    { name: "GitLab", key: "gitlab" }, { name: "Notion", key: "notion", supported: true },
    { name: "Google Docs", key: "google_docs", supported: true },
  ]},
  { name: "Sales & CRM", key: "crm", services: [
    { name: "HubSpot", key: "hubspot", supported: true }, { name: "Salesforce", key: "salesforce" },
    { name: "Zoho CRM", key: "zoho_crm", supported: true }, { name: "Pipedrive", key: "pipedrive", supported: true },
  ]},
  { name: "Finance", key: "finance", services: [
    { name: "Razorpay", key: "razorpay", supported: true }, { name: "Stripe", key: "stripe", supported: true },
    { name: "PayU", key: "payu" }, { name: "Zoho Books", key: "zoho_books" },
  ]},
  { name: "Analytics & Growth", key: "analytics", services: [
    { name: "Google Analytics", key: "google_analytics", supported: true },
    { name: "Mixpanel", key: "mixpanel", supported: true }, { name: "Amplitude", key: "amplitude", supported: true },
    { name: "Metabase", key: "metabase" }, { name: "Looker", key: "looker" },
    { name: "PostHog", key: "posthog", supported: true },
  ]},
];

const NOTIFICATION_TYPES = [
  { key: "blocker_detected", label: "Blocker Detected", icon: "alert", category: "alerts" },
  { key: "daily_briefing", label: "Daily Briefing", icon: "sun", category: "reports" },
  { key: "follow_up_due", label: "Follow-up Due", icon: "clock", category: "tasks" },
  { key: "decision_confirmation", label: "Decision Confirmation", icon: "check", category: "alerts" },
  { key: "member_joined", label: "Member Joined", icon: "users", category: "team" },
  { key: "phase_change", label: "Phase Change", icon: "refresh", category: "workspace" },
  { key: "weekly_digest", label: "Weekly Digest", icon: "file-text", category: "reports" },
  { key: "ai_insights", label: "AI Insights", icon: "cpu", category: "ai" },
  { key: "task_updates", label: "Task Updates", icon: "check-square", category: "tasks" },
  { key: "mentions", label: "Mentions", icon: "at-sign", category: "social" },
  { key: "comments", label: "Comments", icon: "message-circle", category: "social" },
  { key: "security_alert", label: "Security Alerts", icon: "shield", category: "security" },
  { key: "billing_alert", label: "Billing Alerts", icon: "credit-card", category: "billing" },
  { key: "sync_errors", label: "Sync Errors", icon: "alert", category: "system" },
  { key: "meeting_reminders", label: "Meeting Reminders", icon: "calendar", category: "calendar" },
  { key: "role_changes", label: "Role Changes", icon: "user-check", category: "team" },
];

const NOTIF_ICONS = {
  alert: AlertCircle, sun: Sun, clock: Clock, check: CheckCircle, users: Users,
  refresh: RefreshCw, cpu: Cpu, "check-square": CheckSquare, "at-sign": AtSign,
  "message-circle": MessageCircle, shield: Shield, "credit-card": CreditCard,
  calendar: Calendar, "user-check": UserCheck,
};

function Cpu(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>; }
function CheckSquare(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>; }
export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("apps");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const s = style;

  const [integrations, setIntegrations] = useState([]);
  const [searchIntegration, setSearchIntegration] = useState("");
  const [apiKeyModal, setApiKeyModal] = useState({ open: false, provider: "", name: "" });
  const [apiKeyInput, setApiKeyInput] = useState("");

  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showCreateWS, setShowCreateWS] = useState(false);
  const [wsForm, setWsForm] = useState({ name: "", description: "", stage: "Build" });
  const [wsActivity, setWsActivity] = useState([]);

  const [notificationPrefs, setNotificationPrefs] = useState({});
  const [notifExpanded, setNotifExpanded] = useState({});

  const [teamMembers, setTeamMembers] = useState([]);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActivity, setMemberActivity] = useState([]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", timezone: "", locale: "" });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [totpData, setTotpData] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [show2FA, setShow2FA] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);

  const [billing, setBilling] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);

  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [keyPermissions, setKeyPermissions] = useState({ read: true, write: false, admin: false });
  const [showKeyPermissions, setShowKeyPermissions] = useState(false);

  const TOKEN_PROVIDERS = new Set(["trello", "notion", "hubspot", "mixpanel", "amplitude", "posthog", "razorpay", "stripe"]);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/api/integrations");
      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        setIntegrations(Object.entries(res.data).map(([provider, info]) => ({ provider, connected: info.connected, email: info.email, is_expired: info.is_expired })));
      } else { setIntegrations(Array.isArray(res.data) ? res.data : []); }
    } catch {}
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
      if (ws?.id) fetchWorkspaceActivity(ws.id);
    } catch {}
  };

  const fetchWorkspaceActivity = async (wsId) => {
    try {
      const res = await api.get(`/api/workspaces/${wsId}/activity`);
      setWsActivity(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch {}
  };

  const fetchNotificationPrefs = async () => {
    try {
      const res = await api.get("/api/notifications/preferences");
      setNotificationPrefs(res.data?.preferences || {});
    } catch {}
  };

  const fetchApiKeys = async () => {
    try {
      const res = await api.get("/api/developer/api-keys");
      setApiKeys(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const fetchBilling = async () => {
    try {
      const res = await api.get("/api/billing/plan");
      setBilling(res.data);
    } catch {
      try { const r = await api.get("/api/billing/config"); setBillingConfig(r.data); } catch {}
    }
  };

  const fetchSessions = async () => {
    try { const res = await api.get("/api/users/me/sessions"); setSessions(Array.isArray(res.data) ? res.data : []); } catch {}
  };

  const fetchConnectedAccounts = async () => {
    try { const res = await api.get("/api/users/me/connected-accounts"); setConnectedAccounts(Array.isArray(res.data) ? res.data : []); } catch {}
  };

  const fetchMemberActivity = async (wsId, userId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/activity`); setMemberActivity(Array.isArray(res.data) ? res.data.slice(0, 5) : []); } catch {}
  };

  useEffect(() => {
    track("page_viewed", { page: "settings" });
    fetchIntegrations();
    fetchWorkspaces();
    fetchNotificationPrefs();
    fetchApiKeys();
    fetchBilling();
    const params = new URLSearchParams(window.location.search);
    const callback = params.get("callback") || params.get("state");
    const code = params.get("code");
    if (callback && code) {
      api.post("/api/integrations/oauth/callback", { provider: callback, code })
        .then(() => {
          if (window.opener) { try { window.opener.postMessage("oauth_done", window.location.origin); } catch {} }
          try { localStorage.setItem("oauth_done", JSON.stringify({ provider: callback, ts: Date.now() })); } catch {}
          try { window.close(); } catch {}
          if (!window.opener) fetchIntegrations();
        }).catch((err) => {
          const msg = err?.response?.data?.error || err?.message || "OAuth failed";
          document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;background:#121214;color:#e8e4e0;"><h2 style="color:#ef4444;">Connection failed</h2><p>${msg}</p><button onclick="window.close()" style="margin-top:20px;padding:8px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button></div>`;
        });
      window.history.replaceState({}, "", "/settings");
    }
    const handleOAuth = (e) => { if (e.data === "oauth_done") fetchIntegrations(); };
    window.addEventListener("message", handleOAuth);
    return () => window.removeEventListener("message", handleOAuth);
  }, []);

  const handleConnect = async (provider) => {
    if (TOKEN_PROVIDERS.has(provider)) {
      const cat = INTEGRATION_CATEGORIES.flatMap(c => c.services).find(s => s.key === provider);
      setApiKeyModal({ open: true, provider, name: cat?.name || provider });
      setApiKeyInput("");
      return;
    }
    const popup = window.open("", "_blank", "width=600,height=700");
    if (!popup) { alert("Popup blocked. Please allow popups for this site and try again."); return; }
    const pollTimer = setInterval(() => { if (popup.closed) { clearInterval(pollTimer); fetchIntegrations(); } }, 500);
    setTimeout(() => clearInterval(pollTimer), 120000);
    popup.document.write("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Redirecting...</title><style>body{background:#121214;color:#e8e4e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style></head><body><p>Connecting...</p></body></html>");
    try {
      const res = await api.post("/api/integrations/oauth/url", { provider });
      if (res.data?.url) popup.location.href = res.data.url; else popup.close();
    } catch (err) {
      clearInterval(pollTimer); popup.close();
      if (err?.response?.status === 400) {
        const msg = err.response?.data?.error || "";
        if (msg.includes("not supported") || msg.includes("not configured")) alert(`"${provider}" OAuth is not yet configured on the server.`);
        else alert(`${provider} requires API key configuration.`);
      }
    }
  };

  const handleSaveApiToken = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      await api.post("/api/integrations/token", { provider: apiKeyModal.provider, access_token: apiKeyInput.trim(), connected_email: `${apiKeyModal.provider}@api` });
      setApiKeyModal({ open: false, provider: "", name: "" });
      setApiKeyInput("");
      fetchIntegrations();
      alert(`${apiKeyModal.name} connected successfully.`);
    } catch (err) { alert(err.response?.data?.error || "Failed to connect."); }
  };

  const handleDisconnect = async (provider) => {
    try { const res = await api.delete(`/api/integrations/${provider}`); if (res.status === 200) fetchIntegrations(); } catch {}
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    try {
      const res = await api.post("/api/workspaces", wsForm);
      setShowCreateWS(false);
      setWsForm({ name: "", description: "", stage: "Build" });
      fetchWorkspaces();
      if (res.data?.id) localStorage.setItem("workspaceId", res.data.id.toString());
    } catch { alert("Failed to create workspace."); }
  };

  const handleUpdateWorkspace = async (wsId, data) => {
    try {
      await api.put(`/api/workspaces/${wsId}`, data);
      fetchWorkspaces();
    } catch { alert("Failed to update workspace."); }
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (!confirm("Delete this workspace permanently? This cannot be undone.")) return;
    try { await api.delete(`/api/workspaces/${wsId}`); fetchWorkspaces(); } catch { alert("Failed to delete workspace."); }
  };

  const handleSaveNotifs = async () => {
    try { await api.put("/api/notifications/preferences", notificationPrefs); alert("Notification preferences saved."); } catch { alert("Failed to save preferences."); }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.put("/api/users/me", { name: profileForm.name, email: profileForm.email, timezone: profileForm.timezone, locale: profileForm.locale });
      const updated = { ...currentUser, ...(res.data?.user || res.data || {}) };
      localStorage.setItem("user", JSON.stringify(updated));
      window.location.reload();
    } catch (err) { alert(err.response?.data?.error || "Failed to update profile."); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) { alert("Please fill in both fields."); return; }
    if (passwordForm.new_password.length < 6) { alert("New password must be at least 6 characters."); return; }
    if (passwordForm.new_password !== passwordForm.confirm) { alert("Passwords do not match."); return; }
    try {
      await api.put("/api/users/me/password", { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setShowPasswordChange(false);
      setPasswordForm({ current_password: "", new_password: "", confirm: "" });
      alert("Password changed successfully.");
    } catch (err) { alert(err.response?.data?.error || "Failed to change password."); }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await api.post("/api/users/me/2fa/generate");
      setTotpData(res.data);
      setShow2FA(true);
    } catch { alert("Failed to setup 2FA."); }
  };

  const handleVerify2FA = async () => {
    if (!totpCode.trim()) return;
    try {
      await api.post("/api/users/me/2fa/verify", { code: totpCode });
      setShow2FA(false);
      setTotpData(null);
      setTotpCode("");
      alert("2FA enabled successfully.");
    } catch (err) { alert(err.response?.data?.error || "Invalid code."); }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Disable two-factor authentication?")) return;
    try { await api.post("/api/users/me/2fa/disable"); alert("2FA disabled."); } catch { alert("Failed to disable 2FA."); }
  };

  const handleRevokeSession = async (id) => {
    try { await api.delete(`/api/users/me/sessions/${id}`); fetchSessions(); } catch { alert("Failed to revoke session."); }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/api/users/me", { data: { confirm: true } });
      localStorage.clear();
      navigate("/");
    } catch { alert("Failed to delete account."); }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post("/api/developer/api-keys", { name: newKeyName.trim(), permissions: keyPermissions });
      setNewlyCreatedKey(res.data?.key || res.data?.api_key || "Key created");
      setNewKeyName("");
      setShowNewKeyForm(false);
      setKeyPermissions({ read: true, write: false, admin: false });
      fetchApiKeys();
    } catch { alert("Failed to create API key."); }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try { await api.delete(`/api/developer/api-keys/${id}`); fetchApiKeys(); } catch { alert("Failed to revoke key."); }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    const wsId = localStorage.getItem("workspaceId");
    if (!wsId) { alert("No workspace selected."); return; }
    try {
      await api.post(`/api/workspaces/${wsId}/invite`, { email: inviteEmail.trim() });
      setShowInviteMember(false);
      setInviteEmail("");
      alert("Invitation sent.");
    } catch (err) { alert(err.response?.data?.error || "Failed to send invitation."); }
  };

  const handleRemoveMember = async (wsId, memberId) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try { await api.delete(`/api/workspaces/${wsId}/members/${memberId}`); fetchWorkspaces(); } catch { alert("Failed to remove member."); }
  };

  const handleChangeRole = async (wsId, memberId, role) => {
    try { await api.put(`/api/workspaces/${wsId}/members/${memberId}/role`, { role }); fetchWorkspaces(); } catch { alert("Failed to change role."); }
  };

  const copyToClipboard = (text) => { navigator.clipboard?.writeText(text); };

  const ROLE_BADGE_COLORS = { founder: "#ff751f", admin: "#3b82f6", manager: "#8b5cf6", developer: "#3acaa5", designer: "#ec4899", viewer: "#6b6b6f", member: "#6b6b6f" };

  const getPlanDisplayName = (plan) => {
    if (!plan) return "Starter Plan";
    const p = plan.toString().toLowerCase();
    if (p === "starter") return "Starter Plan";
    return plan.toString().charAt(0).toUpperCase() + plan.toString().slice(1) + " Plan";
  };

  const getPlanBadgeLabel = (plan) => {
    if (!plan) return "Starter";
    return plan.toString().charAt(0).toUpperCase() + plan.toString().slice(1);
  };

  const renderConnectedApps = () => {
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
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--graphite)", pointerEvents: "none" }} />
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
                        <div><div style={{ fontSize: "13px", fontWeight: 600, color: "var(--graphite)" }}>{svc.name}</div><div style={{ fontSize: "10px", color: "var(--graphite)" }}>Coming soon</div></div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <div key={svc.key} className="card-glass" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "8px", backgroundColor: connected ? "rgba(255,90,0,0.15)" : "rgba(107,107,111,0.1)", border: connected ? "1px solid rgba(255,90,0,0.2)" : "1px solid rgba(107,107,111,0.12)", flexShrink: 0 }} />
                        <div><div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)" }}>{svc.name}</div><div style={{ fontSize: "10px", color: "var(--graphite)" }}>{connected ? `Connected as ${integ.email || integ.provider}` : "Not connected"}</div></div>
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
      </div>
    );
  };

  const renderWorkspaces = () => {
    const stats = {
      total: workspaces.length,
      members: workspaces.reduce((s, w) => s + (w.members?.filter(m => m.status === "active")?.length || 0), 0),
      integrations: workspaces.reduce((s, w) => s + (w.integration_count || 0), 0),
    };
    const ws = currentWorkspace;

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Workspaces", value: stats.total, icon: Globe },
            { label: "Members", value: stats.members, icon: Users },
            { label: "Integrations", value: stats.integrations || "—", icon: Puzzle },
            { label: "Health", value: ws?.active_health || "Good", icon: Activity },
          ].map(stat => (
            <div key={stat.label} className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
              <stat.icon size={16} style={{ color: "var(--graphite)", marginBottom: "6px" }} />
              <div className="card-hero-value" style={{ color: "var(--sand)", marginTop: 0, fontSize: "20px" }}>{stat.value}</div>
              <div className="card-hero-support" style={{ textTransform: "uppercase", fontSize: "9px", letterSpacing: "1.5px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setShowCreateWS(true)} className="btn-ember"><Plus size={14} /> Create Workspace</button>
        </div>

        {workspaces.map(ws => (
          <div key={ws.id} className="card-glass" style={{ padding: "16px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: ws.color || "#ff751f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
                {(ws.name || "W")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)" }}>{ws.name}</span>
                  <span className="tag tag-ember" style={{ fontSize: "9px" }}>{ws.role || "member"}</span>
                  {ws.is_archived && <span className="badge badge-neutral">ARCHIVED</span>}
                </div>
                <div style={{ fontSize: "11px", color: "var(--graphite)", marginTop: "2px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span>{ws.stage} stage</span>
                  <span>{ws.members?.filter(m => m.status === "active")?.length || 0} members</span>
                  {ws.active_phase && <span>Phase: {ws.active_phase}</span>}
                  {ws.created_at && <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => handleUpdateWorkspace(ws.id, { is_archived: !ws.is_archived })} className="btn-action-secondary" title={ws.is_archived ? "Unarchive" : "Archive"}><Archive size={14} /></button>
                <button onClick={() => handleDeleteWorkspace(ws.id)} className="btn-destructive-outline-sm" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}

        {wsActivity.length > 0 && (
          <div className="card-glass" style={{ padding: "16px", marginTop: "16px" }}>
            <div className="card-label" style={{ marginBottom: "12px" }}>Recent Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {wsActivity.map((ev, i) => (
                <div key={ev.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--graphite)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--brand-orange)", flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--sand)" }}>{ev.title || ev.event_type || "Event"}</span>
                  <span style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreateWS && (
          <div style={s.overlay} onClick={() => setShowCreateWS(false)}>
            <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
              <h3 style={s.modalTitle}>Create Workspace</h3>
              <form onSubmit={handleCreateWorkspace}>
                <div style={s.field}><label style={s.label}>Name</label><input type="text" value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))} className="plan-input" required /></div>
                <div style={s.field}><label style={s.label}>Description</label><textarea value={wsForm.description} onChange={e => setWsForm(p => ({ ...p, description: e.target.value }))} className="plan-input" style={{ minHeight: "80px", resize: "vertical" }} /></div>
                <div style={s.field}><label style={s.label}>Stage</label>
                  <select value={wsForm.stage} onChange={e => setWsForm(p => ({ ...p, stage: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    {["Build", "Launch", "Growth", "Scale"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button type="submit" className="btn-ember">Create</button>
                  <button type="button" onClick={() => setShowCreateWS(false)} className="btn-action-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNotifications = () => (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
        {NOTIFICATION_TYPES.map((n, idx) => {
          const enabled = notificationPrefs[n.key] !== false;
          const expanded = notifExpanded[n.key];
          const NotifIcon = NOTIF_ICONS[n.category === "alerts" ? "alert" : n.category === "reports" ? "clock" : n.category === "team" ? "users" : n.category === "tasks" ? "check-square" : n.category === "ai" ? "cpu" : n.category === "social" ? "message-circle" : n.category === "security" ? "shield" : n.category === "billing" ? "credit-card" : n.category === "system" ? "alert" : "calendar"] || Bell;
          return (
            <div key={n.key} className="card-glass" style={{ padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? "10px" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <NotifIcon size={14} style={{ color: "var(--graphite)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)" }}>{n.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => setNotificationPrefs(p => ({ ...p, [n.key]: !enabled }))}
                    className={`neu-toggle ${enabled ? "on" : ""}`}><div className="thumb" /></button>
                  <button onClick={() => setNotifExpanded(p => ({ ...p, [n.key]: !expanded }))} className="btn-action-secondary" style={{ padding: "4px" }}>
                    <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "", transition: "transform 0.2s" }} />
                  </button>
                </div>
              </div>
              {expanded && (
                <div style={{ borderTop: "1px solid rgba(107,107,111,0.08)", marginTop: "10px", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select className="plan-select" style={{ flex: 1, height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_channel`] || "all"}>
                      <option value="all">All Channels</option>
                      <option value="email">Email</option>
                      <option value="push">Push</option>
                      <option value="in-app">In-App</option>
                      <option value="slack">Slack</option>
                    </select>
                    <select className="plan-select" style={{ flex: 1, height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_frequency`] || "immediate"}>
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly</option>
                      <option value="off">Off</option>
                    </select>
                    <select className="plan-select" style={{ width: "80px", height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_priority`] || "normal"}>
                      <option value="high">🔴 High</option>
                      <option value="normal">🟡 Normal</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <button onClick={() => alert(`Test ${n.label} notification sent.`)} className="btn-action-secondary" style={{ fontSize: "10px", padding: "4px 10px", alignSelf: "flex-start" }}>
                    <Send size={10} /> Test
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={handleSaveNotifs} className="btn-ember" style={{ marginTop: "16px" }}><Save size={14} /> Save Preferences</button>
    </div>
  );

  const renderTeam = () => {
    const wsId = localStorage.getItem("workspaceId");
    const roles = {};
    teamMembers.forEach(m => { const r = m.role || "member"; roles[r] = (roles[r] || 0) + 1; });

    if (selectedMember) {
      const isFounder = selectedMember.role === "founder";
      return (
        <div>
          <button onClick={() => { setSelectedMember(null); setMemberActivity([]); }} className="btn-action-secondary" style={{ marginBottom: "16px" }}><ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to Team</button>
          <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(255,90,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontWeight: 700, fontSize: "18px" }}>
                {(selectedMember.user_name || selectedMember.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--sand)" }}>{selectedMember.user_name || selectedMember.email || "Unnamed"}</div>
                <div style={{ fontSize: "12px", color: "var(--graphite)" }}>{selectedMember.email} · {selectedMember.title || "No title"}</div>
              </div>
              <span className="tag tag-ember" style={{ marginLeft: "auto", backgroundColor: (ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f") + "22", color: ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f", borderColor: (ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f") + "33" }}>
                {selectedMember.role || "member"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {!isFounder && (
                <>
                  <select onChange={e => handleChangeRole(wsId, selectedMember.id, e.target.value)} className="plan-select" style={{ height: "32px", fontSize: "11px" }} value={selectedMember.role}>
                    {["member", "admin", "manager", "developer", "designer", "viewer"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <button onClick={() => handleRemoveMember(wsId, selectedMember.id)} className="btn-destructive-outline-sm"><UserMinus size={14} /> Remove</button>
                </>
              )}
            </div>
          </div>
          {memberActivity.length > 0 && (
            <div className="card-glass" style={{ padding: "16px" }}>
              <div className="card-label" style={{ marginBottom: "12px" }}>Recent Activity</div>
              {memberActivity.map((ev, i) => (
                <div key={ev.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--graphite)", padding: "6px 0", borderBottom: i < memberActivity.length - 1 ? "1px solid rgba(107,107,111,0.06)" : "none" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--brand-orange)", flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--sand)" }}>{ev.title || ev.event_type || "Activity"}</span>
                  <span style={{ fontSize: "10px" }}>{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <div className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
            <div className="card-hero-value" style={{ color: "var(--sand)", marginTop: 0, fontSize: "20px" }}>{teamMembers.length}</div>
            <div className="card-hero-support" style={{ textTransform: "uppercase", fontSize: "9px", letterSpacing: "1.5px" }}>Members</div>
          </div>
          {Object.entries(roles).map(([role, count]) => (
            <div key={role} className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
              <div className="card-hero-value" style={{ color: ROLE_BADGE_COLORS[role] || "var(--sand)", marginTop: 0, fontSize: "20px" }}>{count}</div>
              <div className="card-hero-support" style={{ textTransform: "capitalize", fontSize: "9px", letterSpacing: "1.5px" }}>{role}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setShowInviteMember(true)} className="btn-ember" style={{ marginBottom: "16px" }}><UserPlus size={14} /> Invite Member</button>

        <div className="card-glass" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                {["Member", "Role", "Status", "Email", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--graphite)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--graphite)" }}>No active team members found.</td></tr>
              ) : teamMembers.map(m => (
                <tr key={m.id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)", cursor: "pointer", transition: "background 0.1s" }}
                  onClick={() => { setSelectedMember(m); fetchMemberActivity(wsId, m.user_id); }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,0,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "rgba(255,90,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontWeight: 700, fontSize: "12px" }}>
                        {(m.user_name || m.email || "?")[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: "var(--sand)" }}>{m.user_name || m.email || "Unnamed"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="tag" style={{ backgroundColor: (ROLE_BADGE_COLORS[m.role] || "#6b6b6f") + "22", color: ROLE_BADGE_COLORS[m.role] || "#6b6b6f", border: "1px solid " + (ROLE_BADGE_COLORS[m.role] || "#6b6b6f") + "33" }}>
                      {m.role || "member"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ color: m.status === "active" ? "#4ade80" : "var(--graphite)", fontSize: "11px" }}>
                      {m.status === "active" ? "Active" : m.status || "pending"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--graphite)" }}>{m.email}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={e => { e.stopPropagation(); handleRemoveMember(wsId, m.id); }} className="btn-destructive-outline-sm" disabled={m.role === "founder"}><UserX size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showInviteMember && (
          <div style={s.overlay} onClick={() => setShowInviteMember(false)}>
            <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
              <h3 style={s.modalTitle}>Invite Member</h3>
              <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>Send an invitation email to join <strong>{currentWorkspace?.name || "this workspace"}</strong>.</p>
              <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} autoFocus />
              <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
                <button onClick={handleInviteMember} className="btn-ember"><Send size={14} /> Send Invite</button>
                <button onClick={() => setShowInviteMember(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAccount = () => {
    const profileComplete = [currentUser.name, currentUser.email, currentUser.timezone && currentUser.timezone !== "UTC", currentUser.avatar_url].filter(Boolean).length;
    const score = Math.round((profileComplete / 4) * 100);

    return (
      <div>
        <div className="card-glass" style={{ padding: "24px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "14px", backgroundColor: "rgba(255,90,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontWeight: 700, fontSize: "20px", border: "1px solid rgba(255,90,0,0.2)" }}>
                {(currentUser.name || currentUser.email || "U")[0].toUpperCase()}
              </div>
              <button style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--brand-orange)", border: "2px solid #18181b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Upload photo">
                <Camera size={10} style={{ color: "#fff" }} />
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "17px", fontWeight: 700, color: "var(--sand)", fontFamily: FONT_SANS }}>{currentUser.name || "User"}</span>
                {currentUser.totp_enabled && <ShieldCheck size={14} style={{ color: "#4ade80" }} />}
              </div>
              <div style={{ fontSize: "12px", color: "var(--graphite)" }}>{currentUser.email}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "4px" }}>Profile</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "60px", height: "4px", backgroundColor: "rgba(107,107,111,0.15)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, backgroundColor: score === 100 ? "#4ade80" : "var(--brand-orange)", borderRadius: "2px", transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: "10px", color: "var(--graphite)", fontWeight: 600 }}>{score}%</span>
              </div>
            </div>
          </div>

          {editingProfile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={s.label}>Name</label><input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
                <div><label style={s.label}>Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={s.label}>Timezone</label>
                  <select value={profileForm.timezone} onChange={e => setProfileForm(p => ({ ...p, timezone: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div><label style={s.label}>Locale</label>
                  <select value={profileForm.locale} onChange={e => setProfileForm(p => ({ ...p, locale: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    {["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "ja-JP", "zh-CN", "hi-IN"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleSaveProfile} className="btn-ember"><Save size={14} /> Save Changes</button>
                <button onClick={() => { setEditingProfile(false); setProfileForm({ name: "", email: "", timezone: "", locale: "" }); }} className="btn-action-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => { setProfileForm({ name: currentUser.name || "", email: currentUser.email || "", timezone: currentUser.timezone || "UTC", locale: currentUser.locale || "en-US" }); setEditingProfile(true); }} className="btn-outline-ember"><Edit size={14} /> Edit Profile</button>
              <button onClick={() => { setShowPasswordChange(true); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} className="btn-action-secondary"><Lock size={14} /> Password</button>
              <button onClick={handleSetup2FA} className="btn-action-secondary"><Shield size={14} /> {currentUser.totp_enabled ? "2FA Active" : "Setup 2FA"}</button>
              <button onClick={() => { fetchSessions(); setShowSessions(!showSessions); }} className="btn-action-secondary"><Monitor size={14} /> Sessions</button>
              <button onClick={() => { fetchConnectedAccounts(); setShowConnectedAccounts(!showConnectedAccounts); }} className="btn-action-secondary"><Link size={14} /> Connected Accounts</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-destructive-outline"><Trash2 size={14} /> Delete Account</button>
            </div>
          )}
        </div>

        {show2FA && totpData && (
          <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)", margin: "0 0 12px" }}>Set Up Two-Factor Authentication</h4>
            {totpData.otpauth_url && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--graphite)", marginBottom: "8px" }}>Scan this QR code with your authenticator app:</div>
                <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "var(--sand)", wordBreak: "break-all" }}>
                  {totpData.otpauth_url}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="text" placeholder="Enter 6-digit code" value={totpCode} onChange={e => setTotpCode(e.target.value)} className="plan-input" style={{ maxWidth: "200px" }} />
              <button onClick={handleVerify2FA} className="btn-ember"><Check size={14} /> Verify</button>
              <button onClick={() => { setShow2FA(false); setTotpData(null); setTotpCode(""); }} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        )}

        {showSessions && (
          <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className="card-label" style={{ margin: 0 }}>Active Sessions</span>
              <button onClick={() => setShowSessions(false)} className="btn-action-secondary" style={{ padding: "4px" }}><X size="12" /></button>
            </div>
            {sessions.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No active sessions found.</div>
            ) : sessions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(107,107,111,0.06)", fontSize: "12px" }}>
                <Smartphone size={14} style={{ color: "var(--graphite)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--sand)", fontWeight: 600 }}>{s.device || s.user_agent || "Unknown device"}</div>
                  <div style={{ color: "var(--graphite)", fontSize: "10px" }}>{s.ip_address || ""} · Last active: {s.last_active_at ? new Date(s.last_active_at).toLocaleDateString() : "now"}</div>
                </div>
                <button onClick={() => handleRevokeSession(s.id)} className="btn-destructive-outline-sm"><LogOut size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {showConnectedAccounts && (
          <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className="card-label" style={{ margin: 0 }}>Connected Accounts</span>
              <button onClick={() => setShowConnectedAccounts(false)} className="btn-action-secondary" style={{ padding: "4px" }}><X size="12" /></button>
            </div>
            {connectedAccounts.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No connected accounts. Link Google, GitHub, or Slack from Connected Apps.</div>
            ) : connectedAccounts.map(a => (
              <div key={a.provider || a.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(107,107,111,0.06)", fontSize: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "rgba(255,90,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                  {(a.provider || "?")[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--sand)", fontWeight: 600, textTransform: "capitalize" }}>{a.provider}</div>
                  <div style={{ color: "var(--graphite)", fontSize: "10px" }}>{a.email || a.name || ""}</div>
                </div>
                <span className="badge badge-positive">Connected</span>
              </div>
            ))}
          </div>
        )}

        {showPasswordChange && (
          <div style={s.overlay} onClick={() => setShowPasswordChange(false)}>
            <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
              <h3 style={s.modalTitle}>Change Password</h3>
              <div style={s.field}><label style={s.label}>Current Password</label><input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
              <div style={s.field}><label style={s.label}>New Password</label><input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
              <div style={s.field}><label style={s.label}>Confirm New Password</label><input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <button onClick={handleChangePassword} className="btn-ember"><Check size={14} /> Update Password</button>
                <button onClick={() => { setShowPasswordChange(false); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} className="btn-action-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div style={s.overlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
              <h3 style={{ ...s.modalTitle, color: "#ef4444" }}>Delete Account</h3>
              <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>This action is irreversible. All your data will be permanently deleted. Are you absolutely sure?</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleDeleteAccount} className="btn-destructive-outline">Delete My Account</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBilling = () => {
    const rawPlan = billing?.plan || "starter";
    const status = billing?.subscription_status || "trial";
    const trialDays = billing?.trial_remaining_days;
    const usage = billing?.usage;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="card-glass" style={{ padding: "20px" }}>
          <div className="card-label" style={{ marginBottom: "12px" }}>Current Plan</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--sand)", fontFamily: FONT_SANS }}>{getPlanDisplayName(rawPlan)}</div>
              <div style={{ fontSize: "12px", color: "var(--graphite)", marginTop: "2px" }}>
                {billing?.currency || "INR"} {billing?.plan_amount ? (billing.plan_amount / 100).toFixed(2) : "9.99"}/mo
              </div>
            </div>
            <span className="badge" style={{ backgroundColor: status === "active" ? "rgba(62,207,142,0.15)" : "rgba(255,90,0,0.15)", color: status === "active" ? "#4ade80" : "var(--brand-orange)", border: "1px solid " + (status === "active" ? "rgba(62,207,142,0.2)" : "rgba(255,90,0,0.2)") }}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          {trialDays !== null && trialDays !== undefined && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Trial {trialDays > 0 ? `${trialDays} days remaining` : "expired"}
              </div>
              <div style={{ height: "4px", backgroundColor: "rgba(107,107,111,0.15)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (trialDays / 30) * 100))}%`, backgroundColor: trialDays > 7 ? "var(--brand-orange)" : "#ef4444", borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
            </div>
          )}
          <div style={{ fontSize: "12px", color: "var(--graphite)", lineHeight: 1.8 }}>
            {usage && <><DollarSign size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />{usage.workspaces?.used || 0} workspace{(usage.workspaces?.used || 0) !== 1 ? "s" : ""} · {usage.integrations?.used || 0} integrations · {usage.tasks?.used || 0} tasks</>}
          </div>
          <button onClick={() => navigate("/billing")} className="btn-ember" style={{ marginTop: "16px", width: "100%" }}>
            <ExternalLink size={14} /> Manage Subscription
          </button>
        </div>

        <div className="card-glass" style={{ padding: "20px" }}>
          <div className="card-label" style={{ marginBottom: "12px" }}>Usage</div>
          {usage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(usage).map(([key, val]) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--graphite)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                    <span style={{ color: "var(--sand)", fontWeight: 600 }}>{val.used || 0}{val.limit ? ` / ${val.limit}` : ""}</span>
                  </div>
                  {val.limit && (
                    <div style={{ height: "3px", backgroundColor: "rgba(107,107,111,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, ((val.used || 0) / val.limit) * 100)}%`, backgroundColor: ((val.used || 0) / val.limit) > 0.8 ? "#ef4444" : "var(--brand-orange)", borderRadius: "2px" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No usage data available.</div>
          )}
        </div>

        <div className="card-glass" style={{ padding: "20px", gridColumn: "1 / -1" }}>
          <div className="card-label" style={{ marginBottom: "12px" }}>Plan Features</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
            {[
              { name: "Unlimited Tasks", included: true }, { name: "Unlimited Goals", included: true },
              { name: "AI Pattern Engine", included: true }, { name: "CRM Integrations", included: true },
              { name: "Team Collaboration", included: true }, { name: "API Access", included: true },
              { name: "Priority Support", included: false }, { name: "Custom Branding", included: false },
              { name: "SSO/SAML", included: false }, { name: "Audit Logs", included: false },
            ].map(f => (
              <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: f.included ? "var(--sand)" : "var(--graphite)" }}>
                {f.included ? <CheckCircle size={12} style={{ color: "#4ade80" }} /> : <XCircle size={12} style={{ color: "#6b6b6f" }} />}
                {f.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderApiKeys = () => (
    <div>
      {newlyCreatedKey && (
        <div className="card-glass" style={{ padding: "16px", border: "1px solid rgba(62,207,142,0.2)", backgroundColor: "rgba(62,207,142,0.05)", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#4ade80", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Key created — copy it now</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <code style={{ flex: 1, fontSize: "11px", color: "var(--sand)", backgroundColor: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", wordBreak: "break-all" }}>{newlyCreatedKey}</code>
            <button onClick={() => { copyToClipboard(newlyCreatedKey); alert("Copied!"); }} className="btn-action-secondary" title="Copy"><Copy size={14} /></button>
          </div>
          <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "6px" }}>This secret will only be shown once.</div>
          <button onClick={() => setNewlyCreatedKey(null)} className="btn-action-secondary" style={{ marginTop: "8px", fontSize: "10px", padding: "4px 10px" }}>Dismiss</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => { setShowNewKeyForm(!showNewKeyForm); setShowKeyPermissions(false); }} className="btn-ember">
          <Plus size={14} /> {showNewKeyForm ? "Cancel" : "New API Key"}
        </button>
      </div>

      {showNewKeyForm && (
        <div className="card-glass" style={{ padding: "20px", marginBottom: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)", margin: "0 0 12px" }}>Create API Key</h4>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
            <input type="text" placeholder="Key name (e.g., production, dev)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="plan-input" style={{ flex: 1 }} autoFocus />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--graphite)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Permissions</div>
            <div style={{ display: "flex", gap: "16px" }}>
              {[
                { key: "read", label: "Read" },
                { key: "write", label: "Write" },
                { key: "admin", label: "Admin" },
              ].map(p => (
                <label key={p.key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--sand)", cursor: "pointer" }}>
                  <input type="checkbox" checked={keyPermissions[p.key]} onChange={e => setKeyPermissions(k => ({ ...k, [p.key]: e.target.checked }))} style={{ accentColor: "var(--brand-orange)" }} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreateApiKey} className="btn-ember"><Plus size={14} /> Create Key</button>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--graphite)" }}>
          <Key size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--sand)", marginBottom: "4px" }}>No API keys yet</div>
          <div style={{ fontSize: "12px" }}>Create an API key to access FounDesk programmatically.</div>
        </div>
      ) : (
        <div className="card-glass" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                {["Name", "Prefix", "Created", "Last Used", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--graphite)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => (
                <tr key={key.id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--sand)" }}>{key.name}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "11px", color: "var(--graphite)" }}>{key.prefix || (key.key ? key.key.substring(0, 8) + "..." : "—")}</td>
                  <td style={{ padding: "10px 14px", color: "var(--graphite)" }}>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--graphite)" }}>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="badge" style={{ backgroundColor: key.is_active !== false ? "rgba(62,207,142,0.12)" : "rgba(107,107,111,0.12)", color: key.is_active !== false ? "#4ade80" : "var(--graphite)" }}>
                      {key.is_active !== false ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {key.is_active !== false && (
                        <button onClick={() => handleRevokeKey(key.id)} className="btn-destructive-outline-sm" title="Revoke"><Ban size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "apps": return renderConnectedApps();
      case "workspaces": return renderWorkspaces();
      case "notifications": return renderNotifications();
      case "team": return renderTeam();
      case "account": return renderAccount();
      case "billing": return renderBilling();
      case "apikeys": return renderApiKeys();
      default: return renderConnectedApps();
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
      {apiKeyModal.open && (
        <div style={s.overlay} onClick={() => setApiKeyModal({ open: false, provider: "", name: "" })}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Connect {apiKeyModal.name}</h3>
            <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>Enter your API key or token for {apiKeyModal.name}.</p>
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

const style = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalTitle: { margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--sand)", fontFamily: "'Clash Display', sans-serif" },
  field: { marginBottom: "12px" },
  label: { display: "block", fontSize: "11px", fontWeight: 700, color: "var(--graphite)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" },
};
