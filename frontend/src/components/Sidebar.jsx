import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Target, Zap, Brain, Settings,
  ChevronsUpDown, ChevronLeft, ChevronRight, Plus, Check,
  Bell, LogOut, Sparkles
} from "lucide-react";
import api from "../utils/api";
import Logo from "./Logo";

let lastFetchedTime = 0;

const ITEM_HEIGHT = 40;
const ITEM_GAP = 4;

function SidebarIcon({ name, size = 18 }) {
  const paths = {
    dashboard: "M3 3h7v9H3zm11 0h7v5h-7zm0 9h7v9h-7zm-11 4h7v5H3z",
    plan: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    execute: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    memory: "M12 2a5 5 0 0 0-5 5v3a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4a3 3 0 0 0-3-3V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z",
    settings: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function Sidebar() {
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

  const activeIndex = menuItems.findIndex(item => location.pathname.startsWith(item.to));
  const indicatorTranslate = activeIndex >= 0 ? activeIndex * (ITEM_HEIGHT + ITEM_GAP) : 0;
  const indicatorVisible = activeIndex >= 0;

  const wsInitial = activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : "W";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`sidebar tier-glass ${collapsed ? "is-collapsed" : ""}`}
      style={{ width: collapsed ? "76px" : "252px" }}
    >
      <button
        onClick={handleToggleCollapse}
        className="dock-toggle"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className="sidebar-scroll">
        <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
          <div className="brand-mark">
            Fd
          </div>
          {!collapsed && (
            <span className="brand-text">
              FounDesk
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="ws-wrap" ref={switcherRef}>
            <div className="workspace-pill tier-neu" onClick={() => setSwitcherOpen(!switcherOpen)}>
              <div className="ws-avatar">{wsInitial}</div>
              <div className="ws-meta">
                <span className="ws-name">{activeWorkspace ? activeWorkspace.name : "Workspace"}</span>
                {activeWorkspace && <span className="ws-role">{activeWorkspace.role}</span>}
              </div>
              <ChevronsUpDown size={13} className="ws-caret" />
            </div>

            {switcherOpen && (
              <div className="ws-panel tier-glass" data-lenis-prevent>
                <div className="ws-panel-list">
                  {workspaces.map(ws => {
                    const isActive = activeWorkspace && activeWorkspace.id === ws.id;
                    return (
                      <div
                        key={ws.id}
                        className={`ws-row ${isActive ? "is-active" : ""}`}
                        onClick={() => handleSwitchWorkspace(ws.id)}
                      >
                        <div className="ws-row-avatar">{ws.name.charAt(0).toUpperCase()}</div>
                        <div className="ws-row-meta">
                          <div className="ws-row-name">{ws.name}</div>
                          <span className="ws-row-role">{ws.role}</span>
                        </div>
                        {isActive && <Check size={13} className="ws-row-check" />}
                      </div>
                    );
                  })}
                </div>

                <div className="ws-panel-footer">
                  {showCreateForm ? (
                    <form onSubmit={handleCreateWorkspace} className="ws-create-form">
                      <input
                        type="text"
                        placeholder="Workspace name..."
                        className="ws-input"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        autoFocus
                        required
                      />
                      <div className="ws-form-actions">
                        <button type="submit" className="ws-btn-primary">Create</button>
                        <button type="button" className="ws-btn-ghost" onClick={() => setShowCreateForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button className="ws-add" onClick={() => setShowCreateForm(true)}>
                      <Plus size={12} />
                      New workspace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="nav">
          {menuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              data-icon={item.label.toLowerCase()}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${collapsed ? "is-collapsed" : ""}`}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={`sidebar-footer tier-neu ${collapsed ? "is-collapsed" : ""}`}>
        <div className="user-profile">
          <div className="user-avatar">
            {user?.picture ? (
              <img src={user.picture} alt="" className="user-avatar-img" />
            ) : (
              <div className="user-avatar-fallback">{userInitial}</div>
            )}
          </div>
          {!collapsed && (
            <span className="user-name">{user?.name || user?.email || "User"}</span>
          )}
        </div>
        <div className="footer-actions" ref={notifRef}>
          <button
            className="cmd-trigger-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            title="Command Bar (Ctrl+K)"
            aria-label="Open command bar (Ctrl+K)"
            style={{ marginRight: "4px" }}
          >
            <Sparkles size={14} />
          </button>
          <div style={{ position: "relative" }}>
            <button
              className={`icon-btn ${unreadCount > 0 ? "has-badge" : ""}`}
              onClick={() => setNotifOpen(!notifOpen)}
              title="Notifications"
            >
              <Bell size={14} />
              {unreadCount > 0 && <span className="badge-dot" />}
            </button>

            {notifOpen && (
              <div className="notif-panel tier-glass" data-lenis-prevent>
                <div className="notif-head">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      className="notif-markall"
                      onClick={async () => {
                        try { await api.post("/api/notifications/mark-all-read"); } catch (err) { console.error("[Sidebar] Failed to mark all notifications as read:", err); }
                        setNotifications([]);
                        setUnreadCount(0);
                      }}
                    >
                      <Check size={10} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No notifications yet</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={n.id || i} className={`notif-item ${n.is_unread ? "is-unread" : ""}`}>
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{n.created_at}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="icon-btn logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              localStorage.removeItem("workspaceId");
              window.location.href = "/";
            }}
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
