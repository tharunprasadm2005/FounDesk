import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Columns, List, AlertTriangle, ClipboardList,
  Plus, Search, ChevronLeft, ChevronRight, X,
  Check, RotateCcw, Edit3, Trash2, MoreHorizontal, Calendar,
  User, MessageSquare, SkipForward, Eye,
} from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";
import HeroNumber from "../components/ui/HeroNumber";

const ICON_MAP = {
  columns: Columns, list: List, blocker: AlertTriangle, standup: ClipboardList,
  plus: Plus, search: Search, left: ChevronLeft, right: ChevronRight,
  x: X, check: Check, reopen: RotateCcw, edit: Edit3, trash: Trash2,
  more: MoreHorizontal, calendar: Calendar, user: User, message: MessageSquare,
  resolve: SkipForward, view: Eye,
};

function Icon({ name, size = 16, stroke: strokeWidth = 1.5 }) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

const PRIORITY_COLORS = {
  P0: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P1: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P2: { bg: "rgba(59,130,246,0.1)", text: "var(--light-gray)" },
  P3: { bg: "rgba(107,114,128,0.08)", text: "var(--gray)" },
};

const STATUS_OPTIONS = ["Not Started", "In Progress", "Blocked", "Done", "Cancelled"];

const STATUS_COLORS = {
  "Not Started": "var(--graphite)",
  "In Progress": "var(--ember-light)",
  "Blocked": "var(--warning)",
  "Done": "var(--positive)",
  "Cancelled": "var(--graphite-dim)",
};

const KANBAN_COLUMNS = [
  { key: "Not Started", color: STATUS_COLORS["Not Started"] },
  { key: "In Progress", color: STATUS_COLORS["In Progress"] },
  { key: "Blocked", color: STATUS_COLORS["Blocked"] },
  { key: "Done", color: STATUS_COLORS["Done"] },
  { key: "Cancelled", color: STATUS_COLORS["Cancelled"] },
];

const SUBTITLE_MAP = {
  board: "Visualize and move tasks across stages.",
  list: "Review, sort, and bulk-manage all tasks.",
  blockers: "Track and resolve blocked tasks across the workspace.",
  standups: "Daily check-in: what you did, what's next, what's blocking.",
};

function Execute() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("board");
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [standups, setStandups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterGoal, setFilterGoal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [groupBy, setGroupBy] = useState("none");
  const [wipLimits, setWipLimits] = useState({});
  const [collapsedColumns, setCollapsedColumns] = useState(new Set());
  const [draggedOverCol, setDraggedOverCol] = useState(null);

  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showTaskDrawer, setShowTaskDrawer] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", priority: "P2", status: "Not Started",
    deadline: "", goal_id: "", parent_id: "", assignee_id: "",
    estimated_hours: "", phase_tag: "",
  });

  const [blockers, setBlockers] = useState([]);
  const [blockerSearch, setBlockerSearch] = useState("");
  const [blockerSort, setBlockerSort] = useState("priority");
  const [standupDate, setStandupDate] = useState(new Date().toISOString().split("T")[0]);
  const [standupForm, setStandupForm] = useState({ q1: "", q2: "", q3: "" });
  const [submittingStandup, setSubmittingStandup] = useState(false);
  const [nonResponders, setNonResponders] = useState([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterPhase) params.set("phase_tag", filterPhase);
      if (filterAssignee) params.set("assignee_id", filterAssignee);
      if (filterGoal) params.set("goal_id", filterGoal);
      if (searchQuery.trim()) params.set("search", searchQuery);
      params.set("flat", "true");

      const qs = params.toString() ? `?${params.toString()}` : "";
      const [tasksRes, goalsRes, wsRes] = await Promise.all([
        api.get(`/api/tasks${qs}`),
        api.get("/api/goals"),
        api.get("/api/workspaces"),
      ]);
      setTasks(tasksRes.data || []);
      setGoals(goalsRes.data || []);
      const wsId = localStorage.getItem("workspaceId");
      const ws = wsRes.data.find(w => w.id.toString() === wsId) || wsRes.data[0];
      setTeamMembers(ws?.members?.filter(m => m.status === "active") || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockers = async () => {
    try {
      const res = await api.get("/api/blockers");
      setBlockers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch blockers:", err);
    }
  };

  const fetchStandups = async () => {
    try {
      const res = await api.get(`/api/standups?date=${standupDate}`);
      setStandups(res.data?.submissions || []);
      setNonResponders(res.data?.non_responders || []);
    } catch (err) {
      console.error("Failed to fetch standups:", err);
    }
  };

  useEffect(() => {
    track("page_viewed", { page: "execute" });
    fetchTasks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (taskId && tasks.length > 0) {
      const found = tasks.find(t => t.id === parseInt(taskId));
      if (found) {
        setShowTaskDrawer(found);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [tasks]);

  useEffect(() => {
    if (filterStatus || filterPriority || filterPhase || filterAssignee || filterGoal || searchQuery) {
      const d = setTimeout(() => fetchTasks(), 300);
      return () => clearTimeout(d);
    }
  }, [filterStatus, filterPriority, filterPhase, filterAssignee, filterGoal, searchQuery]);

  useEffect(() => {
    if (activeTab === "standups") fetchStandups();
    if (activeTab === "blockers") fetchBlockers();
  }, [activeTab, standupDate]);

  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !(t.title || "").toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterPhase && t.phase_tag !== filterPhase) return false;
    if (filterAssignee && t.assignee_id !== parseInt(filterAssignee)) return false;
    if (filterGoal && t.goal_id !== parseInt(filterGoal)) return false;
    if (filterRisk && (t.risk_level || "").toLowerCase() !== filterRisk.toLowerCase()) return false;
    return true;
  });

  const getPhaseTags = () => {
    const tags = new Set();
    tasks.forEach(t => { if (t.phase_tag) tags.add(t.phase_tag); });
    return Array.from(tags);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/api/tasks/${id}`, { status: newStatus });
      track("task_status_changed", { taskId: id, newStatus });
      fetchTasks();
    } catch (err) {
      console.error("Task status update failed:", err);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Delete this task permanently?")) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      track("task_deleted", { taskId: id });
      fetchTasks();
    } catch (err) {
      console.error("Task delete failed:", err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      const payload = { ...taskForm };
      if (editTask) {
        await api.put(`/api/tasks/${editTask.id}`, payload);
        track("task_updated", { taskId: editTask.id });
      } else {
        await api.post("/api/tasks", payload);
        track("task_created", { title: taskForm.title });
      }
      setShowTaskForm(false);
      setEditTask(null);
      setTaskForm({ title: "", description: "", priority: "P2", status: "Not Started", deadline: "", goal_id: "", parent_id: "", assignee_id: "", estimated_hours: "", phase_tag: "" });
      fetchTasks();
    } catch (err) {
      console.error("Task save failed:", err);
    }
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "P2",
      status: task.status || "Not Started",
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      goal_id: task.goal_id || "",
      parent_id: task.parent_id || "",
      assignee_id: task.assignee_id || "",
      estimated_hours: task.estimated_hours || "",
      phase_tag: task.phase_tag || "",
    });
    setShowTaskForm(true);
  };

  const handleDrop = async (taskId, newStatus) => {
    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
      track("task_dragged", { taskId, newStatus });
      fetchTasks();
    } catch (err) {
      console.error("Drop update failed:", err);
    }
  };

  const handleSubmitStandup = async (e) => {
    e.preventDefault();
    if (!standupForm.q1.trim()) return;
    try {
      setSubmittingStandup(true);
      await api.post("/api/standups", {
        date: standupDate,
        q1_yesterday: standupForm.q1,
        q2_today: standupForm.q2,
        q3_blockers: standupForm.q3,
      });
      track("standup_submitted", { date: standupDate });
      setStandupForm({ q1: "", q2: "", q3: "" });
      fetchStandups();
    } catch (err) {
      console.error("Standup submit failed:", err);
    } finally {
      setSubmittingStandup(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const S = {
    container: { padding: "0 8px" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
    headerLeft: {},
    headerRight: { display: "flex", gap: "8px", alignItems: "center" },
    title: { margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--sand)", fontFamily: "'Clash Display', sans-serif" },
    subtitle: { margin: "4px 0 0", fontSize: "13px", color: "var(--graphite)" },
    tabBar: { display: "flex", gap: "4px", marginBottom: "20px", padding: "4px", backgroundColor: "rgba(20,20,22,0.8)", borderRadius: "12px", border: "1px solid rgba(107,107,111,0.15)", width: "fit-content" },
    tab: (active) => ({
      padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: 600, fontFamily: "'Satoshi', sans-serif",
      color: active ? "var(--sand)" : "var(--graphite)",
      backgroundColor: active ? "var(--brand-orange)" : "transparent",
      transition: "all 0.2s",
      display: "flex", alignItems: "center", gap: "6px",
    }),
    orangeBtn: { padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "var(--brand-orange)", color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: "'Satoshi', sans-serif", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" },
    filterBar: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" },
    select: { height: "36px", borderRadius: "8px", border: "1px solid rgba(107,107,111,0.2)", backgroundColor: "rgba(20,20,22,0.8)", color: "var(--sand)", padding: "0 10px", fontSize: "12px", fontFamily: "'Satoshi', sans-serif", outline: "none", cursor: "pointer" },
    searchInput: { height: "36px", borderRadius: "8px", border: "1px solid rgba(107,107,111,0.2)", backgroundColor: "rgba(20,20,22,0.8)", color: "var(--sand)", padding: "0 10px 0 30px", fontSize: "12px", fontFamily: "'Satoshi', sans-serif", outline: "none", width: "200px" },
    glassPanel: { backgroundColor: "rgba(20,20,22,0.6)", borderRadius: "12px", border: "1px solid rgba(107,107,111,0.12)", padding: "16px", backdropFilter: "blur(12px)" },
    column: { backgroundColor: "rgba(20,20,22,0.4)", borderRadius: "10px", border: "1px solid rgba(107,107,111,0.1)", minWidth: "220px", flex: "1", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" },
    columnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 4px" },
    card: { backgroundColor: "rgba(20,20,22,0.8)", borderRadius: "8px", border: "1px solid rgba(107,107,111,0.1)", padding: "10px 12px", cursor: "pointer", transition: "all 0.15s" },
    gridCard: { backgroundColor: "rgba(20,20,22,0.6)", borderRadius: "10px", border: "1px solid rgba(107,107,111,0.08)", padding: "12px 14px", marginBottom: "8px" },
    formOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    formModal: { backgroundColor: "var(--ink-2)", borderRadius: "16px", padding: "24px", width: "90%", maxWidth: "520px", maxHeight: "85vh", overflow: "auto", border: "1px solid rgba(107,107,111,0.15)" },
    formField: { marginBottom: "12px" },
    input: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(107,107,111,0.2)", backgroundColor: "rgba(0,0,0,0.3)", color: "var(--sand)", fontSize: "13px", fontFamily: "'Satoshi', sans-serif", outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(107,107,111,0.2)", backgroundColor: "rgba(0,0,0,0.3)", color: "var(--sand)", fontSize: "13px", fontFamily: "'Satoshi', sans-serif", outline: "none", resize: "vertical", minHeight: "80px", boxSizing: "border-box" },
    label: { display: "block", fontSize: "11px", fontWeight: 700, color: "var(--graphite)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" },
    drawer: { position: "fixed", top: 0, right: 0, width: "420px", height: "100vh", backgroundColor: "rgba(20,20,22,0.95)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(107,107,111,0.15)", zIndex: 999, padding: "24px", overflow: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,0.3)" },
    priorityBadge: (p) => ({ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, backgroundColor: PRIORITY_COLORS[p]?.bg || "rgba(107,114,128,0.08)", color: PRIORITY_COLORS[p]?.text || "var(--gray)" }),
    statusDot: (s) => ({ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLORS[s] || "var(--graphite)", flexShrink: 0 }),
    avatar: (name) => ({ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(232,80,2,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "var(--brand-orange)", flexShrink: 0 }),
    badge: (label) => ({ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, backgroundColor: "rgba(107,107,111,0.1)", color: "var(--graphite)" }),
  };

  const renderKanbanBoard = () => {
    const isCategoryGroup = groupBy === "source_category";
    if (isCategoryGroup) {
      const catGrouped = {};
      filteredTasks.forEach(t => {
        const cat = t.source_category || t.source || "Other";
        if (!catGrouped[cat]) catGrouped[cat] = [];
        catGrouped[cat].push(t);
      });
      const catEntries = Object.entries(catGrouped).sort((a, b) => b[1].length - a[1].length);
      return (
        <div style={{ display: "flex", gap: "12px", overflow: "auto", paddingBottom: "12px" }}>
          {catEntries.map(([cat, tasks]) => (
            <div key={cat} className="card-glass"
              style={{ minWidth: "240px", flex: "1", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", background: "rgba(20,20,22,0.45)" }}>
              <div style={S.columnHeader}>
                <span className="card-label" style={{ fontSize: "11px", color: "var(--graphite)" }}>{cat} <span style={{ opacity: 0.6 }}>({tasks.length})</span></span>
              </div>
              {tasks.map((task, idx) => (
                <div key={task.id} className="card-glass kanban-task-card stagger-item"
                  onClick={() => setShowTaskDrawer(task)}
                  style={{ padding: "12px", cursor: "pointer", background: "rgba(20,20,22,0.75)", animationDelay: `${idx * 40}ms` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span className={`badge-${(task.priority || "P2").toLowerCase()}`}>{task.priority}</span>
                    <span className={`badge-${(task.status || "Not Started").toLowerCase().replace(/\s+/g, "-")}`} style={{ fontSize: "10px" }}>{task.status}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)", marginBottom: "4px", lineHeight: 1.3 }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</div>}
                  {task.active_blockers && task.active_blockers.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ color: "var(--error)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>BLOCKED</span>
                      {task.active_blockers.slice(0, 2).map(b => (
                        <span key={b.id} style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(232,67,79,0.1)", color: "var(--warning)", fontWeight: 500 }}>{b.title}</span>
                      ))}
                      {task.active_blockers.length > 2 && <span style={{ fontSize: "9px", color: "var(--graphite)" }}>+{task.active_blockers.length - 2}</span>}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                    {task.assignee_name ? <div style={S.avatar(task.assignee_name)}>{task.assignee_name[0]}</div> : <div />}
                    {task.deadline && <span style={{ fontSize: "10px", color: new Date(task.deadline) < new Date() ? "var(--error)" : "var(--graphite)" }}>
                      {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>}
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "var(--graphite)" }}>No tasks</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    const grouped = {};
    KANBAN_COLUMNS.forEach(c => { grouped[c.key] = []; });
    filteredTasks.forEach(t => {
      if (t.is_blocked) {
        grouped["Blocked"].push(t);
        return;
      }
      const st = t.status || "Not Started";
      if (grouped[st]) grouped[st].push(t);
      else grouped["Not Started"].push(t);
    });

    return (
      <div style={{ display: "flex", gap: "12px", overflow: "auto", paddingBottom: "12px" }}>
        {KANBAN_COLUMNS.map(col => {
          const colTasks = grouped[col.key] || [];
          const isCollapsed = collapsedColumns.has(col.key);
          const wipLimit = wipLimits[col.key];
          const overWip = wipLimit && colTasks.length > wipLimit;
          return (
            <div key={col.key} className={`card-glass ${draggedOverCol === col.key ? "kanban-column-dragover" : ""}`}
              onDragOver={e => {
                e.preventDefault();
                if (draggedOverCol !== col.key) setDraggedOverCol(col.key);
              }}
              onDragLeave={() => setDraggedOverCol(null)}
              onDrop={e => {
                e.preventDefault();
                setDraggedOverCol(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) handleDrop(id, col.key);
              }}
              style={{ minWidth: isCollapsed ? "50px" : "240px", transition: "min-width 0.2s, background-color 0.2s, border-color 0.2s", flex: "1", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", background: "rgba(20,20,22,0.45)" }}>
              <div style={S.columnHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={S.statusDot(col.key)} />
                  {!isCollapsed && <span className="card-label" style={{ fontSize: "11px", color: col.key === "Blocked" ? "var(--warning)" : "var(--graphite)" }}>{col.key} <span style={{ opacity: 0.6 }}>({colTasks.length})</span>{col.key === "Blocked" && <span style={{ fontSize: "9px", color: "var(--graphite-dim)", marginLeft: "6px", fontStyle: "italic" }}>overlay</span>}</span>}
                </div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {overWip && <span style={{ color: "var(--error)", fontSize: "10px", fontWeight: 700 }}>WIP!</span>}
                  <span onClick={() => setCollapsedColumns(p => { const n = new Set(p); n.has(col.key) ? n.delete(col.key) : n.add(col.key); return n; })}
                    style={{ cursor: "pointer", color: "var(--graphite)", fontSize: "14px" }}>{isCollapsed ? "+" : "-"}</span>
                </div>
              </div>
              {!isCollapsed && col.key === "Done" && colTasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "4px", fontSize: "10px", color: "var(--graphite)" }}>
                  {(() => {
                    const now = new Date();
                    const todayStr = now.toDateString();
                    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const today = colTasks.filter(t => t.completed_at && new Date(t.completed_at).toDateString() === todayStr).length;
                    const thisWeek = colTasks.filter(t => t.completed_at && new Date(t.completed_at) >= weekStart).length;
                    const thisMonth = colTasks.filter(t => t.completed_at && new Date(t.completed_at) >= monthStart).length;
                    return [
                      { label: "Today", value: today },
                      { label: "This Week", value: thisWeek },
                      { label: "This Month", value: thisMonth },
                    ].map(s => (
                      <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{s.label}</span>
                        <span style={{ fontWeight: 600, color: "var(--sand)" }}>{s.value}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
              {!isCollapsed && colTasks.map((task, idx) => (
                <div key={task.id} className="card-glass kanban-task-card stagger-item" draggable
                  onDragStart={e => { e.dataTransfer.setData("text/plain", task.id); e.currentTarget.style.opacity = "0.5"; }}
                  onDragEnd={e => e.currentTarget.style.opacity = "1"}
                  onClick={() => setShowTaskDrawer(task)}
                  style={{ padding: "12px", cursor: "pointer", background: "rgba(20,20,22,0.75)", animationDelay: `${idx * 40}ms` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span className={`badge-${(task.priority || "P2").toLowerCase()}`}>{task.priority}</span>
                    {task.phase_tag && <span style={S.badge(task.phase_tag)}>{task.phase_tag}</span>}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)", marginBottom: "4px", lineHeight: 1.3 }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</div>}
                  {(task.source === "monday" || task.source_integration === "monday") && (task.progress_percentage !== null || task.risk_level) && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                      {task.progress_percentage !== null && (
                        <div style={{ flex: 1, height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${task.progress_percentage}%`, height: "100%", borderRadius: "2px", background: task.progress_percentage >= 80 ? "var(--positive)" : task.progress_percentage >= 40 ? "var(--ember)" : "var(--graphite)", transition: "width 0.3s ease" }} />
          </div>
      )}

                      {task.risk_level && (
                        <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, background: task.risk_level === "High" ? "rgba(232,67,79,0.12)" : task.risk_level === "Medium" ? "rgba(232,80,2,0.12)" : "rgba(58,202,165,0.1)", color: task.risk_level === "High" ? "var(--warning)" : task.risk_level === "Medium" ? "var(--ember)" : "var(--positive)" }}>{task.risk_level}</span>
                      )}
        </div>
      )}

                  {task.active_blockers && task.active_blockers.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ color: "var(--error)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>BLOCKED</span>
                      {task.active_blockers.slice(0, 2).map(b => (
                        <span key={b.id} style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(232,67,79,0.1)", color: "var(--warning)", fontWeight: 500 }}>{b.title}</span>
                      ))}
                      {task.active_blockers.length > 2 && <span style={{ fontSize: "9px", color: "var(--graphite)" }}>+{task.active_blockers.length - 2}</span>}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                    {task.assignee_name ? <div style={S.avatar(task.assignee_name)}>{task.assignee_name[0]}</div>
                      : <div />}
                    {task.deadline && <span style={{ fontSize: "10px", color: new Date(task.deadline) < new Date() ? "var(--error)" : "var(--graphite)" }}>
                      {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>}
                  </div>
                </div>
              ))}
              {!isCollapsed && colTasks.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "var(--graphite)" }}>No tasks</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const toggleSelect = (id) => {
      setSelectedTasks(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    return (
      <div className="card-glass" style={{ padding: "20px" }}>
        {filteredTasks.length === 0 && !loading && (
          <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "var(--graphite)" }}>No tasks match your filters.</div>
        )}
        {filteredTasks.map((task, idx) => {
          const isExpanded = expandedTaskId === task.id;
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done" && task.status !== "Cancelled";
          const isSelected = selectedTasks.has(task.id);
          return (
            <div key={task.id} className="stagger-item" style={{ borderTop: idx > 0 ? "1px solid var(--border-soft)" : "none", padding: "12px 0", animationDelay: `${idx * 30}ms` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", borderLeft: isOverdue ? `3px solid var(--warning)` : task.status === "Blocked" ? `3px solid var(--warning)` : `3px solid transparent`, paddingLeft: "8px", backgroundColor: isSelected ? "rgba(232,80,2,0.06)" : undefined, borderRadius: "4px" }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(task.id)} style={{ accentColor: "var(--brand-orange)" }} />
                <div style={S.statusDot(task.status)} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)", cursor: "pointer" }}>{task.title}</div>
                </div>
                <span className={`badge-${(task.priority || "P2").toLowerCase()}`} style={{ marginRight: "4px" }}>{task.priority}</span>
                {task.deadline && <span style={{ fontSize: "11px", color: isOverdue ? "var(--warning)" : "var(--graphite)", whiteSpace: "nowrap", marginRight: "8px" }}>
                  {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>}
                <div style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
                  {task.status === "Done" ? (
                    <button onClick={() => handleStatusChange(task.id, "In Progress")} className="list-action-btn" style={{ color: "var(--graphite)" }} title="Reopen"><Icon name="reopen" /></button>
                  ) : (
                    <button onClick={() => handleStatusChange(task.id, "Done")} className="list-action-btn" style={{ color: "var(--positive)" }} title="Done"><Icon name="check" /></button>
                  )}
                  <button onClick={() => openEditTask(task)} className="list-action-btn" style={{ color: "var(--graphite)" }} title="Edit"><Icon name="edit" /></button>
                  <button onClick={() => handleDeleteTask(task.id)} className="list-action-btn" style={{ color: "var(--warning)" }} title="Delete"><Icon name="trash" /></button>
                </div>
                <select value={task.status || "Not Started"} onChange={e => handleStatusChange(task.id, e.target.value)}
                  className="filter-pill" style={{ height: "30px", fontSize: "11px", padding: "0 24px 0 8px", backgroundPosition: "right 6px center", marginRight: "8px" }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "var(--dark-gray)" }}>{s}</option>)}
                </select>
                {task.assignee_name && <div style={S.avatar(task.assignee_name)} title={task.assignee_name}>{task.assignee_name[0]}</div>}
              </div>
              {isExpanded && (
                <div style={{ ...S.glassPanel, marginTop: "8px", marginLeft: "28px", fontSize: "12px", padding: "12px" }}>
                  {task.description && <div style={{ color: "var(--sand)", marginBottom: "8px" }}>{task.description}</div>}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "11px", color: "var(--graphite)" }}>
                    {task.goal_name && <span>Goal: <span style={{ color: "var(--sand)" }}>{task.goal_name}</span></span>}
                    {task.assignee_name && <span>Assignee: <span style={{ color: "var(--sand)" }}>{task.assignee_name}</span></span>}
                    {task.progress_percentage !== null && <span>Progress: <span style={{ color: "var(--sand)" }}>{task.progress_percentage}%</span></span>}
                    {task.risk_level && <span>Risk: <span style={{ color: task.risk_level === "High" ? "var(--warning)" : task.risk_level === "Medium" ? "var(--ember)" : "var(--positive)" }}>{task.risk_level}</span></span>}
                    {task.estimated_hours && <span>Est: <span style={{ color: "var(--sand)" }}>{task.estimated_hours}h</span></span>}
                    {task.phase_tag && <span>Phase: <span style={{ color: "var(--sand)" }}>{task.phase_tag}</span></span>}
                  </div>
        </div>
      )}

            </div>
          );
        })}
      </div>
    );
  };

  const SEVERITY_COLORS = {
    high: "var(--warning)",
    medium: "var(--brand-orange)",
    low: "var(--graphite-dim)",
  };
  const SEVERITY_LABELS = { high: "High", medium: "Medium", low: "Low" };

  const renderBlockerPanel = () => {
    const resolvedBlockers = blockers.filter(b => b.status === "resolved");
    const openBlockers = blockers.filter(b => b.status === "open");
    const displayBlockers = blockerSort === "resolved" ? resolvedBlockers : openBlockers;
    const sortedBlockers = [...displayBlockers].sort((a, b) => {
      if (blockerSort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (blockerSort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return (a.severity === "high" ? 0 : a.severity === "medium" ? 1 : 2) - (b.severity === "high" ? 0 : b.severity === "medium" ? 1 : 2);
    }).filter(b => !blockerSearch.trim() || b.title.toLowerCase().includes(blockerSearch.toLowerCase()) || (b.task_title || "").toLowerCase().includes(blockerSearch.toLowerCase()));

    const severityCounts = { high: 0, medium: 0, low: 0 };
    openBlockers.forEach(b => { const s = b.severity || "medium"; if (severityCounts[s] !== undefined) severityCounts[s]++; });

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", alignItems: "start" }}>
        <div className="card-glass" style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--graphite)" }}><Icon name="search" size={14} /></span>
              <input type="text" placeholder="Search blockers..." value={blockerSearch} onChange={e => setBlockerSearch(e.target.value)} className="plan-input" style={{ paddingLeft: "30px", fontSize: "12px", height: "36px", width: "180px" }} />
            </div>
            <select value={blockerSort} onChange={e => setBlockerSort(e.target.value)} className="filter-pill" style={{ height: "36px" }}>
              <option value="priority" style={{ background: "var(--dark-gray)" }}>Severity</option>
              <option value="oldest" style={{ background: "var(--dark-gray)" }}>Oldest</option>
              <option value="newest" style={{ background: "var(--dark-gray)" }}>Newest</option>
              <option value="resolved" style={{ background: "var(--dark-gray)" }}>Resolved</option>
            </select>
            <span style={{ fontSize: "12px", color: "var(--graphite)" }}>{openBlockers.length} open</span>
          </div>
          {sortedBlockers.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontSize: "13px", color: "var(--graphite)" }}>
              {blockerSort === "resolved" ? "No resolved blockers." : "No blocked tasks today. All clear."}
            </div>
          ) : sortedBlockers.map(b => {
            const sevColor = SEVERITY_COLORS[b.severity] || "var(--warning)";
            return (
              <div key={b.id} className="card-glass" style={{ borderLeft: `3px solid ${sevColor}`, marginBottom: "12px", padding: "16px", background: "rgba(20,20,22,0.6)", opacity: blockerSort === "resolved" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: b.status === "resolved" ? "var(--graphite)" : "var(--sand)" }}>{b.title}</span>
                  <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, backgroundColor: sevColor + "22", color: sevColor }}>{SEVERITY_LABELS[b.severity] || "Medium"}</span>
                </div>
                {b.description && <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "6px" }}>{b.description}</div>}
                {b.blocker_description && <div style={{ fontSize: "11px", padding: "6px 8px", backgroundColor: "rgba(193,8,1,0.06)", borderRadius: "6px", color: "var(--warning)", marginBottom: "6px" }}>Blocked: {b.blocker_description}</div>}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  {b.status === "open" && (
                    <button onClick={async () => { try { await api.put(`/api/blockers/${b.id}`, { status: "resolved" }); fetchBlockers(); } catch (e) { console.error(e); } }} style={{ ...S.orangeBtn, padding: "6px 14px", fontSize: "11px" }}>Resolve</button>
                  )}
                  {b.task_title && <span style={{ fontSize: "10px", color: "var(--graphite)", display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "8px" }}><Icon name="view" size={12} />{b.task_title}</span>}
                  {b.source_label && <span style={{ fontSize: "10px", color: "var(--graphite-dim)" }}>{b.source_label}</span>}
                  <span style={{ fontSize: "10px", color: "var(--graphite-dim)" }}>Created: {new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card-glass" style={{ padding: "20px" }}>
          <div className="card-label" style={{ fontSize: "11.5px", color: "var(--graphite)", marginBottom: "20px" }}>Blocker Summary</div>
          <div style={{ display: "flex", gap: "32px", marginBottom: "24px" }}>
            <div>
              <span className="card-label" style={{ fontSize: "10px" }}>Open</span>
              <HeroNumber
                as="div"
                value={openBlockers.length}
                variant={openBlockers.length > 0 ? "warning" : "neutral"}
                style={{ fontSize: "36px", marginTop: "4px" }}
              />
            </div>
            <div>
              <span className="card-label" style={{ fontSize: "10px" }}>Resolved</span>
              <HeroNumber
                as="div"
                value={resolvedBlockers.length}
                variant={resolvedBlockers.length > 0 ? "positive" : "neutral"}
                style={{ fontSize: "36px", marginTop: "4px" }}
              />
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
            <span className="card-label" style={{ fontSize: "10px", marginBottom: "4px" }}>By Severity</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {Object.entries(severityCounts).map(([s, c]) => {
                const sc = SEVERITY_COLORS[s] || "var(--graphite)";
                return (
                  <div key={s} className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "12px", alignItems: "center", background: "rgba(20,20,22,0.4)" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: sc }}>{SEVERITY_LABELS[s] || s}</span>
                    <HeroNumber
                      as="span"
                      value={c}
                      variant={c > 0 ? "neutral" : "zero"}
                      style={{ fontSize: "24px", marginTop: "4px" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [expandedStandupId, setExpandedStandupId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (standupId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [standupId]: { ...prev[standupId], [section]: !(prev[standupId]?.[section]) }
    }));
  };

  const navigateToRecord = (item, entryKey, sectionKey) => {
    const taskKeys = ["completed_tasks", "priority_tasks", "due_today", "overdue_tasks", "blocked_tasks"];
    const blockerKeys = ["blockers"];
    const meetingKeys = ["meetings", "upcoming_meetings"];
    const decisionKeys = ["decisions", "unresolved_decisions"];
    const goalKeys = ["goals_completed", "goal_progress", "goals_at_risk"];
    const businessKeys = ["crm_updates", "important_emails"];

    if (taskKeys.includes(entryKey)) {
      setActiveTab("board");
    } else if (blockerKeys.includes(entryKey)) {
      setActiveTab("blockers");
    } else if (goalKeys.includes(entryKey)) {
      navigate("/plan");
    } else if (meetingKeys.includes(entryKey) || decisionKeys.includes(entryKey)) {
      navigate("/memory");
    } else if (businessKeys.includes(entryKey)) {
      navigate("/dashboard");
    }
  };

  const renderCompiledSection = (standupId, compiled, sectionKey, icon, label, color) => {
    const section = compiled?.[sectionKey];
    if (!section) return null;
    const entries = Object.entries(section).filter(([k, v]) => Array.isArray(v) && v.length > 0);
    if (entries.length === 0) return null;
    const totalItems = entries.reduce((sum, [, v]) => sum + v.length, 0);
    const isOpen = expandedSections[standupId]?.[sectionKey];

    return (
      <div style={{ marginBottom: "8px" }}>
        <div onClick={() => toggleSection(standupId, sectionKey)}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", fontSize: "11px", fontWeight: 600, color: color, userSelect: "none" }}>
          <span style={{ fontSize: "13px" }}>{icon}</span>
          <span style={{ flex: 1 }}>{label}</span>
          <span className="badge" style={{ fontSize: "9px", background: "rgba(255,255,255,0.06)", color: "var(--graphite)", padding: "1px 6px", borderRadius: "8px" }}>{totalItems}</span>
          <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: "10px" }}>▶</span>
        </div>
        {isOpen && (
          <div style={{ padding: "4px 8px 8px 24px" }}>
            {entries.map(([key, items]) => (
              <div key={key} style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "var(--graphite)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{key.replace(/_/g, " ")}</div>
                {items.map((item, idx) => (
                  <div key={item.id || idx} onClick={() => navigateToRecord(item, key, sectionKey)}
                    style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--sand)", padding: "3px 4px", borderRadius: "4px", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {item.priority && <span style={{ fontSize: "9px", fontWeight: 700, color: PRIORITY_COLORS[item.priority]?.text || "var(--graphite)", marginRight: "4px" }}>{item.priority}</span>}
                    <span style={{ flex: 1 }}>{item.title}</span>
                    <span style={{ fontSize: "9px", color: "var(--graphite-dim)", marginRight: "4px" }}>id={item.id}</span>
                    {item.severity && <span style={{ fontSize: "9px", padding: "0 4px", borderRadius: "3px", background: item.severity === "high" ? "rgba(232,80,2,0.15)" : "rgba(245,158,11,0.12)", color: item.severity === "high" ? "var(--brand-orange)" : "var(--amber)" }}>{item.severity}</span>}
                    {item.days_overdue > 0 && <span style={{ fontSize: "9px", color: "var(--warning)" }}>{item.days_overdue}d overdue</span>}
                    {item.age_days > 0 && <span style={{ fontSize: "9px", color: "var(--graphite)" }}>{item.age_days}d</span>}
                    {item.confidence !== undefined && item.confidence !== null && <span style={{ fontSize: "9px", color: item.confidence >= 80 ? "var(--positive)" : item.confidence >= 50 ? "var(--amber)" : "var(--warning)" }}>{Math.round(item.confidence)}%</span>}
                    {item.status === "open" && <span style={{ fontSize: "9px", color: "var(--warning)" }}>Open</span>}
                    {item.deadline && <span style={{ fontSize: "9px", color: "var(--graphite)" }}>Due: {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      </div>
    );
  };

  const renderStandupCard = (s, isMine) => (
    <div key={s.id} className="card-glass" style={{ borderLeft: isMine ? "3px solid var(--ember-light)" : "3px solid transparent", padding: "14px", background: isMine ? "rgba(20,20,22,0.6)" : "transparent", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={S.avatar(s.user_name || "A")}>{(s.user_name || "A")[0]}</div>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--sand)" }}>{s.user_name}</span>
        <span style={{ fontSize: "10px", color: "var(--graphite)" }}>{new Date(s.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {s.compiled ? (
        <>
          {s.compiled.summary && (
            <div style={{ fontSize: "12px", color: "var(--sand)", lineHeight: "1.6", marginBottom: "12px", padding: "10px 12px", background: "rgba(59,130,246,0.06)", borderRadius: "6px", borderLeft: "2px solid rgba(59,130,246,0.2)" }}>
              <span style={{ fontSize: "15px", marginRight: "6px" }}>🤖</span>{s.compiled.summary}
            </div>
          )}
          {renderCompiledSection(s.id, s.compiled, "yesterday", "📋", "Yesterday", "var(--positive)")}
          {renderCompiledSection(s.id, s.compiled, "today", "📅", "Today", "var(--ember-light)")}
          {renderCompiledSection(s.id, s.compiled, "risks", "⚠️", "Risks & Blockers", "var(--warning)")}
          {renderCompiledSection(s.id, s.compiled, "business", "💼", "Business", "var(--amber)")}
        </>
      ) : (
        <>
          <div style={{ fontSize: "11px", color: "var(--sand)" }}>Yesterday: {s.q1_yesterday}</div>
          {s.q2_today && <div style={{ fontSize: "11px", color: "var(--sand)", marginTop: "4px" }}>Today: {s.q2_today}</div>}
          {s.q3_blockers && <div style={{ fontSize: "11px", color: "var(--warning)", marginTop: "4px" }}>Blockers: {s.q3_blockers}</div>}
        </>
      )}
    </div>
  );

  const renderDailyStandups = () => {
    const isToday = standupDate === todayStr;
    const myStandup = standups.find(s => s.user_id === currentUser?.id);
    const others = standups.filter(s => s.user_id !== currentUser?.id);
    const hasStandupToday = isToday && myStandup;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "16px", alignItems: "start" }}>
        <div className="card-glass" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => setStandupDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split("T")[0]; })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--graphite)" }}><Icon name="left" /></button>
              <span className="card-label" style={{ fontSize: "11px", color: isToday ? "var(--ember-light)" : "var(--sand)" }}>
                {new Date(standupDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {(() => {
                const diff = Math.round((new Date(standupDate) - new Date(todayStr)) / 86400000);
                let label = "";
                if (diff === 0) label = "Today";
                else if (diff === -1) label = "Yesterday";
                else if (diff === -2) label = "Day Before";
                else if (diff === 1) label = "Tomorrow";
                else if (diff === 2) label = "Day After";
                else if (diff === -7) label = "Last Week";
                else if (diff === 7) label = "Next Week";
                if (!label) return null;
                return <span style={{ fontSize: "9px", color: diff === 0 ? "var(--ember-light)" : "var(--graphite)", background: diff === 0 ? "rgba(232,80,2,0.08)" : "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: "8px", fontWeight: diff === 0 ? 600 : 400 }}>{label}</span>;
              })()}
              {!isToday && (
                <button onClick={() => setStandupDate(todayStr)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ember-light)", fontSize: "10px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "8px" }}>Back to Today</button>
              )}
              <button onClick={() => setStandupDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split("T")[0]; })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--graphite)" }}><Icon name="right" /></button>
            </div>
          </div>

          {isToday && !hasStandupToday && (
            <form onSubmit={handleSubmitStandup}>
              <div style={S.formField}>
                <label style={S.label}>What did you do yesterday?</label>
                <textarea value={standupForm.q1} onChange={e => setStandupForm(p => ({ ...p, q1: e.target.value }))} className="plan-input" style={{ width: "100%", resize: "vertical", minHeight: "80px", fontSize: "13px" }} placeholder="Completed API refactor, reviewed PR #42..." rows={3} />
              </div>
              <div style={S.formField}>
                <label style={S.label}>What will you do today?</label>
                <textarea value={standupForm.q2} onChange={e => setStandupForm(p => ({ ...p, q2: e.target.value }))} className="plan-input" style={{ width: "100%", resize: "vertical", minHeight: "80px", fontSize: "13px" }} placeholder="Start on notification system, fix login bug..." rows={3} />
              </div>
              <div style={S.formField}>
                <label style={S.label}>Any blockers?</label>
                <textarea value={standupForm.q3} onChange={e => setStandupForm(p => ({ ...p, q3: e.target.value }))} className="plan-input" style={{ width: "100%", resize: "vertical", minHeight: "80px", fontSize: "13px" }} placeholder="Waiting on API key from IT..." rows={2} />
              </div>
              <button type="submit" disabled={submittingStandup || !standupForm.q1.trim()} style={{ ...S.orangeBtn, opacity: submittingStandup ? 0.6 : 1, cursor: submittingStandup ? "not-allowed" : "pointer", marginTop: "8px" }}>
                {submittingStandup ? "Submitting..." : "Submit Standup"}
              </button>
            </form>
          )}

          {isToday && hasStandupToday && (
            <div style={{ fontSize: "12px", color: "var(--positive)", padding: "8px 0", textAlign: "center" }}>✓ Checked in today</div>
          )}

          {!isToday && (
            <div style={{ fontSize: "12px", color: "var(--graphite)", padding: "8px 0", textAlign: "center" }}>Viewing historical submissions</div>
          )}
        </div>

        <div className="card-glass" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span className="card-label">Submissions</span>
            <span className="badge badge-positive">{standups.length} submitted</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {myStandup && renderStandupCard(myStandup, true)}
            {others.map(s => renderStandupCard(s, false))}
            {standups.length === 0 && (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: "12px", color: "var(--graphite)" }}>No standups for this date.</div>
            )}
          </div>

          {nonResponders.length > 0 && (
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span className="badge badge-warning" style={{ fontSize: "9px" }}>{nonResponders.length}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--graphite)" }}>Haven't checked in</span>
              </div>
              {nonResponders.map(nr => (
                <div key={nr.user_id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", fontSize: "11px", color: "var(--graphite)" }}>
                  <div style={S.avatar(nr.user_name || nr.email || "?")}>{(nr.user_name || nr.email || "?")[0]}</div>
                  <span>{nr.user_name || nr.email}</span>
                  {nr.role && <span style={{ fontSize: "9px", color: "var(--graphite-dim)" }}>{nr.role}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <h1 style={S.title}>Execute</h1>
          <p style={S.subtitle}>{SUBTITLE_MAP[activeTab] || "Manage and track your team's tasks."}</p>
        </div>
        <div style={S.headerRight}>
          <button onClick={() => { setEditTask(null); setTaskForm({ title: "", description: "", priority: "P2", status: "Not Started", deadline: "", goal_id: "", parent_id: "", assignee_id: "", estimated_hours: "", phase_tag: "" }); setShowTaskForm(true); }} style={S.orangeBtn}><Icon name="plus" /> New Task</button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div className="view-tabs">
          {["board", "list", "blockers", "standups"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`view-tab ${activeTab === tab ? "active" : ""}`}
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              <Icon name={tab === "board" ? "columns" : tab === "list" ? "list" : tab === "blockers" ? "blocker" : "standup"} size={14} />
              {tab === "board" ? "Kanban Board" : tab === "list" ? "List View" : tab === "blockers" ? "Blocker Panel" : "Daily Standups"}
            </button>
          ))}
        </div>
      </div>

      {(activeTab === "board" || activeTab === "list") && (
        <>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[
              { label: "Total", value: tasks.length, color: "var(--graphite)" },
              { label: "In Progress", value: tasks.filter(t => t.status === "In Progress").length, color: STATUS_COLORS["In Progress"] },
              { label: "Blocked", value: tasks.filter(t => t.status === "Blocked" || t.is_blocked).length, color: STATUS_COLORS["Blocked"] },
              { label: "Completed", value: tasks.filter(t => t.status === "Done").length, color: STATUS_COLORS["Done"] },
              { label: "Overdue", value: tasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length, color: "var(--error)" },
              { label: "P0", value: tasks.filter(t => t.priority === "P0").length, color: "var(--warning)" },
            ].map(s => (
              <div key={s.label} className="card-glass" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(20,20,22,0.3)" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: "11px", color: "var(--graphite)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        <div style={{ ...S.filterBar, gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--graphite)" }}><Icon name="search" size={14} /></span>
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="plan-input" style={{ paddingLeft: "30px", fontSize: "12px", height: "36px", width: "180px" }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-pill">
            <option value="" style={{ background: "var(--dark-gray)" }}>All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "var(--dark-gray)" }}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-pill">
            <option value="" style={{ background: "var(--dark-gray)" }}>All priorities</option>
            {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p} style={{ background: "var(--dark-gray)" }}>{p}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="filter-pill">
            <option value="" style={{ background: "var(--dark-gray)" }}>All risks</option>
            {["High", "Medium", "Low"].map(r => <option key={r} value={r} style={{ background: "var(--dark-gray)" }}>{r}</option>)}
          </select>
          <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} className="filter-pill">
            <option value="" style={{ background: "var(--dark-gray)" }}>All phases</option>
            {getPhaseTags().map(t => <option key={t} value={t} style={{ background: "var(--dark-gray)" }}>{t}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="filter-pill">
            <option value="" style={{ background: "var(--dark-gray)" }}>All assignees</option>
            {teamMembers.map(m => <option key={m.user_id} value={m.user_id} style={{ background: "var(--dark-gray)" }}>{m.user_name || m.email}</option>)}
          </select>
          {activeTab === "board" && (
            <>
              <select value={filterGoal} onChange={e => setFilterGoal(e.target.value)} className="filter-pill">
                <option value="" style={{ background: "var(--dark-gray)" }}>All goals</option>
                {goals.map(g => <option key={g.id} value={g.id} style={{ background: "var(--dark-gray)" }}>{g.title}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-pill">
                <option value="default" style={{ background: "var(--dark-gray)" }}>Default</option>
                <option value="priority" style={{ background: "var(--dark-gray)" }}>Priority</option>
                <option value="deadline" style={{ background: "var(--dark-gray)" }}>Deadline</option>
                <option value="newest" style={{ background: "var(--dark-gray)" }}>Newest</option>
              </select>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="filter-pill">
                <option value="none" style={{ background: "var(--dark-gray)" }}>No grouping</option>
                <option value="status" style={{ background: "var(--dark-gray)" }}>Status</option>
                <option value="source_category" style={{ background: "var(--dark-gray)" }}>Source Category</option>
                <option value="assignee" style={{ background: "var(--dark-gray)" }}>Assignee</option>
                <option value="phase" style={{ background: "var(--dark-gray)" }}>Phase</option>
                <option value="priority" style={{ background: "var(--dark-gray)" }}>Priority</option>
              </select>
            </>
          )}
        </div>
        </>
      )}

      {activeTab === "board" && renderKanbanBoard()}
      {activeTab === "list" && renderListView()}
      {activeTab === "blockers" && renderBlockerPanel()}
      {activeTab === "standups" && renderDailyStandups()}

      {showTaskForm && (
        <div style={S.formOverlay} onClick={() => setShowTaskForm(false)}>
          <div style={S.formModal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--sand)" }}>{editTask ? "Edit Task" : "New Task"}</h3>
              <button onClick={() => setShowTaskForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--graphite)" }}><Icon name="x" /></button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div style={S.formField}><label style={S.label}>Title *</label><input type="text" value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} className="plan-input" style={{ width: "100%" }} placeholder="Task title" required /></div>
              <div style={S.formField}><label style={S.label}>Description</label><textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} className="plan-input" style={{ width: "100%", minHeight: "80px", resize: "vertical" }} placeholder="Describe the task..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={S.label}>Priority</label><select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="plan-select" style={{ width: "100%" }}>
                  {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p} style={{ background: "var(--dark-gray)" }}>{p}</option>)}
                </select></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={S.label}>Status</label><select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="plan-select" style={{ width: "100%" }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "var(--dark-gray)" }}>{s}</option>)}
                </select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={S.label}>Deadline</label><input type="date" value={taskForm.deadline} onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} className="plan-input" style={{ width: "100%" }} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={S.label}>Est. Hours</label><input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm(p => ({ ...p, estimated_hours: e.target.value }))} className="plan-input" style={{ width: "100%" }} placeholder="8" /></div>
              </div>
              <div style={S.formField}><label style={S.label}>Goal</label><select value={taskForm.goal_id} onChange={e => setTaskForm(p => ({ ...p, goal_id: e.target.value }))} className="plan-select" style={{ width: "100%" }}>
                <option value="" style={{ background: "var(--dark-gray)" }}>None</option>
                {goals.map(g => <option key={g.id} value={g.id} style={{ background: "var(--dark-gray)" }}>{g.title}</option>)}
              </select></div>
              <div style={S.formField}><label style={S.label}>Assignee</label><select value={taskForm.assignee_id} onChange={e => setTaskForm(p => ({ ...p, assignee_id: e.target.value }))} className="plan-select" style={{ width: "100%" }}>
                <option value="" style={{ background: "var(--dark-gray)" }}>Unassigned</option>
                {teamMembers.map(m => <option key={m.user_id} value={m.user_id} style={{ background: "var(--dark-gray)" }}>{m.user_name || m.email}</option>)}
              </select></div>
              <div style={S.formField}><label style={S.label}>Phase Tag</label><input type="text" value={taskForm.phase_tag} onChange={e => setTaskForm(p => ({ ...p, phase_tag: e.target.value }))} className="plan-input" style={{ width: "100%" }} placeholder="e.g. Sprint-1" /></div>
              <button type="submit" disabled={!taskForm.title.trim()} style={{ ...S.orangeBtn, width: "100%", justifyContent: "center", marginTop: "8px", opacity: !taskForm.title.trim() ? 0.6 : 1, cursor: !taskForm.title.trim() ? "not-allowed" : "pointer" }}>{editTask ? "Update Task" : "Create Task"}</button>
            </form>
          </div>
        </div>
      )}

      {showTaskDrawer && (
        <div style={S.drawer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--sand)", flex: 1 }}>{showTaskDrawer.title}</h3>
            <button onClick={() => setShowTaskDrawer(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--graphite)" }}><Icon name="x" /></button>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <span className={`badge-${(showTaskDrawer.priority || "P2").toLowerCase()}`}>{showTaskDrawer.priority}</span>
            <span className="badge" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: STATUS_COLORS[showTaskDrawer.status || "Not Started"] }}>{showTaskDrawer.status}</span>
            {showTaskDrawer.phase_tag && <span style={S.badge(showTaskDrawer.phase_tag)}>{showTaskDrawer.phase_tag}</span>}
          </div>
          {showTaskDrawer.description && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", color: "var(--graphite)", marginBottom: "6px" }}>Notes / Business Reason</div>
              <div style={{ fontSize: "13px", color: "var(--graphite)", lineHeight: 1.5 }}>{showTaskDrawer.description}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "var(--graphite)" }}>
            {showTaskDrawer.goal_name && <div>Goal: <span style={{ color: "var(--sand)" }}>{showTaskDrawer.goal_name}</span></div>}
            {showTaskDrawer.assignee_name && <div>Assignee: <span style={{ color: "var(--sand)" }}>{showTaskDrawer.assignee_name}</span></div>}
            {showTaskDrawer.progress_percentage !== null && <div>Progress: <span style={{ color: "var(--sand)" }}>{showTaskDrawer.progress_percentage}%</span></div>}
            {showTaskDrawer.risk_level && <div>Risk: <span style={{ color: showTaskDrawer.risk_level === "High" ? "var(--warning)" : showTaskDrawer.risk_level === "Medium" ? "var(--ember)" : "var(--positive)" }}>{showTaskDrawer.risk_level}</span></div>}
            {showTaskDrawer.deadline && <div>Deadline: <span style={{ color: new Date(showTaskDrawer.deadline) < new Date() ? "var(--warning)" : "var(--sand)" }}>{new Date(showTaskDrawer.deadline).toLocaleDateString()}</span></div>}
            {showTaskDrawer.estimated_hours && <div>Est. Hours: <span style={{ color: "var(--sand)" }}>{showTaskDrawer.estimated_hours}</span></div>}
            {showTaskDrawer.created_at && <div>Created: <span style={{ color: "var(--sand)" }}>{new Date(showTaskDrawer.created_at).toLocaleDateString()}</span></div>}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
            <button onClick={() => { openEditTask(showTaskDrawer); setShowTaskDrawer(null); }} style={{ ...S.orangeBtn, padding: "6px 14px", fontSize: "12px" }}>Edit</button>
            <button onClick={() => handleDeleteTask(showTaskDrawer.id)} style={{ ...S.orangeBtn, padding: "6px 14px", fontSize: "12px", backgroundColor: "transparent", border: "1px solid var(--warning)", color: "var(--warning)" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Execute;
