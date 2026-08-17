import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Target, Zap, Brain, Settings,
  ChevronsUpDown, ChevronLeft, ChevronRight, Plus, Check,
  Bell, LogOut, Sparkles
} from "lucide-react";
import api from "../utils/api";

let lastFetchedTime = 0;

function Sidebar({ mobileOpen = false, onNavigate }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return null; }
  });
  const switcherRef = useRef(null);
  const notifRef = useRef(null);

  const fetchWorkspaces = async () => {
    const now = Date.now();
    if (now - lastFetchedTime < 5000) return;
    lastFetchedTime = now;
    try {
      const res = await api.get("/api/workspaces");
      const list = (res.data || []).filter(w => w.member_status === "active");
      setWorkspaces(list);
      const storedId = parseInt(localStorage.getItem("workspaceId"), 10);
      const active = list.find(w => w.id === storedId) || list[0];
      if (active) {
        localStorage.setItem("workspaceId", active.id.toString());
        setActiveWorkspace(active);
      }
    } catch (err) {
      console.error("Error fetching workspaces in sidebar:", err);
      const fallbackWsId = localStorage.getItem("workspaceId");
      if (!fallbackWsId) {
        try {
          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          if (userData?.id) {
            const fallbackRes = await api.get("/api/dashboard");
            if (fallbackRes.data?.command_strip?.active_goal?.workspace_id) {
              const wid = fallbackRes.data.command_strip.active_goal.workspace_id;
              localStorage.setItem("workspaceId", wid.toString());
              setActiveWorkspace({ id: wid, name: "Workspace" });
            }
          }
        } catch (fallbackErr) {
          console.warn("Sidebar fallback also failed:", fallbackErr);
        }
      }
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    api.get("/api/me").then((res) => {
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
    }).catch(() => {});
    api.get("/api/notifications").then((res) => {
      const list = (res.data || []).slice(0, 12);
      setNotifications(list);
      setUnreadCount(list.filter((n) => n.is_unread).length);
    }).catch(() => {});

    const handleClickOutside = (event) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) {
        setSwitcherOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("sidebar_collapsed", nextState.toString());
  };

  const handleSwitchWorkspace = (id) => {
    localStorage.setItem("workspaceId", id.toString());
    setSwitcherOpen(false);
    window.location.reload();
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const res = await api.post("/api/workspaces", { name: newWsName, stage: "Build" });
      setNewWsName("");
      setShowCreateForm(false);
      setSwitcherOpen(false);
      localStorage.setItem("workspaceId", res.data.id.toString());
      window.location.reload();
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/plan", label: "Plan", icon: Target },
    { to: "/execute", label: "Execute", icon: Zap },
    { to: "/memory", label: "Memory", icon: Brain },
    { to: "/settings", label: "Settings", icon: Settings }
  ];

  const wsInitial = activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : "W";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`fd-side ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "nav-open" : ""}`}
      style={{ width: collapsed ? 82 : 264 }}
    >
      <button
        onClick={handleToggleCollapse}
        className="fd-side-toggle"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronLeft size={13} strokeWidth={2} />}
      </button>

      <div className="fd-side-scroll">
        {/* Brand */}
        <div className="fd-side-brand" onClick={() => { navigate("/dashboard"); onNavigate(); }} style={{ cursor: "pointer" }}>
          <div className="fd-side-mark">f</div>
          {!collapsed && <span className="fd-side-word">FounDesk</span>}
        </div>

        {/* Workspace switcher */}
        {!collapsed && (
          <div className="fd-side-sec">
            <span className="fd-side-label">Workspace</span>
            <div className="fd-ws-wrap" ref={switcherRef}>
              <div className="fd-ws-pill" onClick={() => setSwitcherOpen(!switcherOpen)}>
                <div className="fd-ws-avatar">{wsInitial}</div>
                <div className="fd-ws-meta">
                  <span className="fd-ws-name">{activeWorkspace ? activeWorkspace.name : "Workspace"}</span>
                  {activeWorkspace && <span className="fd-ws-role">{activeWorkspace.role}</span>}
                </div>
                <ChevronsUpDown size={13} strokeWidth={2.2} className="fd-ws-caret" />
              </div>

              {switcherOpen && (
                <div className="fd-ws-pop" data-lenis-prevent>
                  <div className="fd-ws-list">
                    {workspaces.map(ws => {
                      const isActive = activeWorkspace && activeWorkspace.id === ws.id;
                      return (
                        <div
                          key={ws.id}
                          className={`fd-ws-row ${isActive ? "is-active" : ""}`}
                          onClick={() => handleSwitchWorkspace(ws.id)}
                        >
                          <div className="fd-ws-row-avatar">{ws.name.charAt(0).toUpperCase()}</div>
                          <div className="fd-ws-row-meta">
                            <div className="fd-ws-row-name">{ws.name}</div>
                            <span className="fd-ws-row-role">{ws.role}</span>
                          </div>
                          {isActive && <Check size={13} strokeWidth={3} className="fd-ws-row-check" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="fd-ws-foot">
                    {showCreateForm ? (
                      <form onSubmit={handleCreateWorkspace} className="fd-ws-form">
                        <input
                          type="text"
                          placeholder="Workspace name…"
                          className="fd-ws-input"
                          value={newWsName}
                          onChange={(e) => setNewWsName(e.target.value)}
                          autoFocus
                          required
                        />
                        <div className="fd-ws-form-actions">
                          <button type="submit" className="fd-ws-btn-primary">Create</button>
                          <button type="button" className="fd-ws-btn-ghost" onClick={() => setShowCreateForm(false)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <button className="fd-ws-add" onClick={() => setShowCreateForm(true)}>
                        <Plus size={12} strokeWidth={2.5} /> New workspace
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="fd-side-sec">
          <span className="fd-side-label">{collapsed ? "Menu" : "Command"}</span>
          <nav className="fd-side-nav">
            {menuItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `fd-side-item ${isActive ? "is-active" : ""} ${collapsed ? "is-collapsed" : ""}`}
                onClick={onNavigate}
              >
                <item.icon size={17} strokeWidth={1.9} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer — user identity + actions */}
      <div className={`fd-side-foot ${collapsed ? "is-collapsed" : ""}`}>
        <div className="fd-user">
          <div className="fd-user-avatar">
            {user?.picture ? (
              <img src={user.picture} alt="" className="fd-user-img" />
            ) : (
              <span className="fd-user-fallback">{userInitial}</span>
            )}
          </div>
          {!collapsed && (
            <div className="fd-user-meta">
              <span className="fd-user-name">{user?.name || user?.email || "User"}</span>
              <span className="fd-user-role">Founder</span>
            </div>
          )}
        </div>
        <div className="fd-foot-actions" ref={notifRef}>
          <button
            className="fd-icon-btn fd-cmd-trigger"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            title="Command Bar (Ctrl+K)"
            aria-label="Open command bar (Ctrl+K)"
          >
            <Sparkles size={14} strokeWidth={2} />
          </button>
          <div style={{ position: "relative" }}>
            <button
              className={`fd-icon-btn ${unreadCount > 0 ? "has-badge" : ""}`}
              onClick={() => setNotifOpen(!notifOpen)}
              title="Notifications"
            >
              <Bell size={14} strokeWidth={2} />
              {unreadCount > 0 && <span className="fd-badge-dot" />}
            </button>
            {notifOpen && (
              <div className="fd-notif-pop" data-lenis-prevent>
                <div className="fd-notif-head">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="fd-notif-markall" onClick={async () => {
                      try { await api.post("/api/notifications/read-all"); } catch (err) { console.error("[Sidebar] Failed to mark all notifications as read:", err); }
                      setNotifications([]);
                      setUnreadCount(0);
                    }}>
                      <Check size={10} strokeWidth={3} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="fd-notif-list">
                  {notifications.length === 0 ? (
                    <div className="fd-notif-empty">No notifications yet</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={n.id || i} className={`fd-notif-item ${n.is_unread ? "is-unread" : ""}`}>
                        <div className="fd-notif-title">{n.title}</div>
                        <div className="fd-notif-message">{n.message}</div>
                        <div className="fd-notif-time">{n.created_at}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="fd-icon-btn fd-logout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              localStorage.removeItem("workspaceId");
              window.location.href = "/";
            }}
            title="Logout"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;