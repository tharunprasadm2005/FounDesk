import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Brain,
  Check,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import api from "../utils/api";
import { useNotifications } from "../context/NotificationContext";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "Plan", icon: Target },
  { to: "/execute", label: "Execute", icon: Zap },
  { to: "/memory", label: "Memory", icon: Brain },
  { to: "/settings", label: "Settings", icon: Settings },
];

let lastFetchedTime = 0;

function WorkspaceSwitcher({ activeWorkspace, workspaces, onSwitch, onCreate }) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim());
    setName("");
    setShowCreate(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 text-left transition-colors hover:border-[var(--border-strong)]"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span className="fd-eyebrow block text-[10px]">Workspace</span>
          <span className="block truncate text-[14px] font-medium">{activeWorkspace?.name || "Workspace"}</span>
        </span>
        <ChevronsUpDown size={16} strokeWidth={1.5} className="text-[var(--text-subtle)]" />
      </button>

      {open && (
        <div className="fd-panel absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden p-1 shadow-[var(--shadow-float)]">
          <div className="max-h-[220px] overflow-y-auto">
            {workspaces.map((workspace) => {
              const active = activeWorkspace?.id === workspace.id;
              return (
                <button
                  key={workspace.id}
                  className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-2 text-left text-[14px] transition-colors ${active ? "bg-[var(--linen-100)]" : "hover:bg-[var(--linen-100)]"}`}
                  onClick={() => onSwitch(workspace.id)}
                >
                  <span className="truncate">{workspace.name}</span>
                  {active && <Check size={14} strokeWidth={1.5} />}
                </button>
              );
            })}
          </div>
          <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
            {showCreate ? (
              <form onSubmit={submit} className="flex flex-col gap-1 p-1">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" autoFocus />
                <div className="grid grid-cols-2 gap-1">
                  <Button type="submit" size="sm" variant="primary">Create</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <button className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-left text-[14px] text-[var(--text-muted)] hover:bg-[var(--linen-100)] hover:text-[var(--text-primary)]" onClick={() => setShowCreate(true)}>
                <Plus size={14} strokeWidth={1.5} /> New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="fd-button h-[36px] min-h-0 w-[36px] p-0" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && <span className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full bg-[var(--clay-500)]" />}
      </button>
      {open && (
        <div className="fd-panel absolute bottom-[calc(100%+8px)] left-0 z-30 w-[320px] overflow-hidden p-0 shadow-[var(--shadow-float)] md:left-auto md:right-0">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-2">
            <span className="text-[14px] font-medium">Notifications</span>
            {unreadCount > 0 && <Button size="sm" variant="ghost" onClick={markAllAsRead}>Mark read</Button>}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-3 text-center text-[13px] text-[var(--text-subtle)]">No notifications</p>
            ) : (
              notifications.slice(0, 8).map((notification) => (
                <div key={notification.id} className={`border-b border-[var(--border-subtle)] p-2 last:border-0 ${!notification.is_read ? "bg-[var(--linen-100)]" : ""}`}>
                  <p className="text-[13px] font-medium">{notification.title}</p>
                  <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{notification.message}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-subtle)]">{notification.created_at}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  });

  const fetchWorkspaces = async () => {
    const now = Date.now();
    if (now - lastFetchedTime < 5000) return;
    lastFetchedTime = now;
    try {
      const res = await api.get("/api/workspaces");
      const list = (res.data || []).filter((workspace) => workspace.member_status === "active");
      setWorkspaces(list);
      const storedId = parseInt(localStorage.getItem("workspaceId"), 10);
      const active = list.find((workspace) => workspace.id === storedId) || list[0];
      if (active) {
        localStorage.setItem("workspaceId", active.id.toString());
        setActiveWorkspace(active);
      }
    } catch (err) {
      console.error("Error fetching workspaces in sidebar:", err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleSwitchWorkspace = (id) => {
    localStorage.setItem("workspaceId", id.toString());
    window.location.reload();
  };

  const handleCreateWorkspace = async (name) => {
    const res = await api.post("/api/workspaces", { name, stage: "Build" });
    localStorage.setItem("workspaceId", res.data.id.toString());
    window.location.reload();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("workspaceId");
    window.location.href = "/";
  };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-subtle)] p-3">
        <button className="flex items-center gap-2 bg-transparent p-0 text-left" onClick={() => navigate("/dashboard")}>
          <span className="flex h-[36px] w-[36px] items-center justify-center rounded-[var(--radius)] bg-[var(--sumi-900)] font-heading text-[15px] text-[var(--washi-white)]">Fd</span>
          <span>
            <span className="block font-heading text-[20px] leading-none">FounDesk</span>
            <span className="fd-eyebrow text-[10px]">Founder OS</span>
          </span>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} workspaces={workspaces} onSwitch={handleSwitchWorkspace} onCreate={handleCreateWorkspace} />

        <button
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--linen-100)] px-2 py-2 text-left text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        >
          <Search size={15} strokeWidth={1.5} />
          <span className="flex-1">Search or command</span>
          <span className="font-mono text-[10px]">Ctrl K</span>
        </button>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-[14px] transition-colors ${isActive ? "bg-[var(--linen-100)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--linen-100)] hover:text-[var(--text-primary)]"}`}
            >
              <item.icon size={17} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={user?.name || user?.email} src={user?.picture} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user?.name || user?.email || "User"}</p>
            <p className="fd-eyebrow truncate text-[10px]">Account</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <button className="fd-button h-[36px] min-h-0 w-[36px] p-0" onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))} aria-label="Open command palette">
            <Sparkles size={16} strokeWidth={1.5} />
          </button>
          <NotificationPopover />
          <button className="fd-button h-[36px] min-h-0 w-[36px] p-0 text-[var(--clay-500)]" onClick={logout} aria-label="Log out">
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-2 md:hidden">
        <button className="fd-button h-[40px] min-h-0 w-[40px] p-0" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <button className="flex items-center gap-2 bg-transparent p-0 font-heading text-[18px]" onClick={() => navigate("/dashboard")}>
          FounDesk
        </button>
        <button className="fd-button h-[40px] min-h-0 w-[40px] p-0" onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))} aria-label="Open command palette">
          <Search size={18} strokeWidth={1.5} />
        </button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-50 bg-[var(--surface-overlay)] md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-0 z-50 w-[var(--shell-sidebar)] border-r border-[var(--border-subtle)] bg-[var(--surface-page)] transition-transform duration-280 ease-out-soft md:sticky md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute right-2 top-2 md:hidden">
          <button className="fd-button h-[36px] min-h-0 w-[36px] p-0" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={17} strokeWidth={1.5} />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}

export default Sidebar;
