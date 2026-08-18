import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Target, Zap, Brain, Settings,
  ChevronLeft, ChevronRight, Plus,
  LogOut
} from "lucide-react";
import api from "../utils/api";

let lastFetchedTime = 0;

function Sidebar({ mobileOpen = false, onNavigate }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [qaOpen, setQaOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return null; }
  });
  const qaRef = useRef(null);

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

    const handleClickOutside = (event) => {
      if (qaRef.current && !qaRef.current.contains(event.target)) {
        setQaOpen(false);
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

        {/* Current workspace — static, no switcher. Manage workspaces in Settings → Workspaces. */}
        {!collapsed && (
          <div className="fd-side-sec">
            <span className="fd-side-label">Workspace</span>
            <div className="fd-ws-wrap">
              <div className="fd-ws-pill" style={{ cursor: "default" }}>
                <div className="fd-ws-avatar">{wsInitial}</div>
                <div className="fd-ws-meta">
                  <span className="fd-ws-name">{activeWorkspace ? activeWorkspace.name : "Workspace"}</span>
                  {activeWorkspace && <span className="fd-ws-role">{activeWorkspace.role}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="fd-side-sec">
          <span className="fd-side-label">{collapsed ? "Menu" : "Pages"}</span>
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

      {/* Footer — quick add + user identity + logout */}
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
        <div className="fd-foot-actions">
          <div style={{ position: "relative" }} ref={qaRef}>
            <button
              className="fd-icon-btn fd-qa-trigger"
              onClick={() => setQaOpen(!qaOpen)}
              title="Quick add"
              aria-label="Quick add"
            >
              <Plus size={14} strokeWidth={2.4} />
            </button>
            {qaOpen && (
              <div className="fd-qa-pop" data-lenis-prevent>
                <div className="fd-qa-label">Quick add</div>
                <button className="fd-qa-item" onClick={() => { setQaOpen(false); onNavigate(); navigate("/execute?new=1"); }}>
                  <Plus size={12} strokeWidth={2.4} /> New task
                </button>
                <button className="fd-qa-item" onClick={() => { setQaOpen(false); onNavigate(); navigate("/plan?action=new-goal"); }}>
                  <Target size={12} strokeWidth={2.4} /> New goal
                </button>
                <button className="fd-qa-item" onClick={() => { setQaOpen(false); onNavigate(); navigate("/memory?action=new-decision"); }}>
                  <Brain size={12} strokeWidth={2.4} /> New decision
                </button>
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