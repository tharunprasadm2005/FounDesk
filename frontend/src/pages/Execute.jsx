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
import { Section, Grid, Stack, Inline } from "../components/layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const ICON_MAP = {
  columns: Columns, list: List, blocker: AlertTriangle, standup: ClipboardList,
  plus: Plus, search: Search, left: ChevronLeft, right: ChevronRight,
  x: X, check: Check, reopen: RotateCcw, edit: Edit3, trash: Trash2,
  more: MoreHorizontal, calendar: Calendar, user: User, message: MessageSquare,
  resolve: SkipForward, view: Eye,
};

function Icon({ name, size = 16, stroke: strokeWidth = 1.5, className = "" }) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={strokeWidth} className={className} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

const PRIORITY_COLORS = {
  P0: { bg: "bg-clay-500/10", text: "text-clay-500" },
  P1: { bg: "bg-clay-500/10", text: "text-clay-500" },
  P2: { bg: "bg-indigo-ink/10", text: "text-indigo-ink" },
  P3: { bg: "bg-stone-400/10", text: "text-stone-400" },
};

const STATUS_OPTIONS = ["Not Started", "In Progress", "Blocked", "Done", "Cancelled"];

const STATUS_COLORS = {
  "Not Started": "bg-stone-400",
  "In Progress": "bg-indigo-ink",
  "Blocked": "bg-clay-500",
  "Done": "bg-moss-600",
  "Cancelled": "bg-stone-200",
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
      setTasks(tasksRes.data?.items || tasksRes.data || []);
      setGoals(goalsRes.data?.items || goalsRes.data || []);
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
        <Inline gap="gap-[16px]" className="overflow-x-auto overflow-y-hidden pb-4 items-start w-full">
          {catEntries.map(([cat, tasks]) => (
            <Card key={cat} padding="p-[16px]" className="min-w-[280px] flex-1 bg-linen-100/50">
              <Stack gap="gap-[12px]">
                <Inline justify="justify-between" items="items-center" className="px-1 mb-1">
                  <span className="text-[12px] font-bold text-stone-400 uppercase tracking-widest m-0">{cat} <span className="opacity-60">({tasks.length})</span></span>
                </Inline>
                {tasks.map((task) => (
                  <Card key={task.id} padding="p-[16px]"
                    className="cursor-pointer bg-washi-white hover:border-stone-400 transition-colors"
                    onClick={() => setShowTaskDrawer(task)}>
                    <Inline justify="justify-between" items="items-start" className="mb-[8px]">
                      <span className={`px-[6px] py-[2px] rounded-[2px] text-[10px] font-bold ${PRIORITY_COLORS[task.priority || "P2"]?.bg} ${PRIORITY_COLORS[task.priority || "P2"]?.text}`}>{task.priority || "P2"}</span>
                    </Inline>
                    <div className="text-[14px] font-medium text-sumi-900 mb-[4px] leading-snug">{task.title}</div>
                    {task.description && <div className="text-[12px] text-stone-400 mb-[8px] line-clamp-2">{task.description}</div>}
                    <Inline justify="justify-between" items="items-center" className="mt-auto pt-[8px]">
                      {task.assignee_name ? <div className="w-[24px] h-[24px] rounded-full bg-linen-100 flex items-center justify-center text-[10px] font-bold text-sumi-900 border border-stone-200">{task.assignee_name[0]}</div> : <div />}
                      {task.deadline && <span className={`text-[11px] ${new Date(task.deadline) < new Date() ? "text-clay-500" : "text-stone-400"}`}>
                        {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>}
                    </Inline>
                  </Card>
                ))}
                {tasks.length === 0 && (
                  <div className="p-[24px] text-center text-[12px] text-stone-400">No tasks</div>
                )}
              </Stack>
            </Card>
          ))}
        </Inline>
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
      <Inline gap="gap-[16px]" className="overflow-x-auto overflow-y-hidden pb-4 items-start h-full">
        {KANBAN_COLUMNS.map(col => {
          const colTasks = grouped[col.key] || [];
          const isCollapsed = collapsedColumns.has(col.key);
          return (
            <Card key={col.key} padding="p-[16px]" className={`transition-all bg-linen-100/50 ${draggedOverCol === col.key ? "border-indigo-ink border-dashed" : ""} flex flex-col h-full`}
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
              style={{ minWidth: isCollapsed ? "64px" : "280px", flex: "0 0 auto", maxHeight: "100%" }}>
              <Stack gap="gap-[12px]" className="h-full flex flex-col">
                <Inline justify="justify-between" items="items-center" className="px-1 mb-1 shrink-0">
                  <Inline gap="gap-[8px]" items="items-center">
                    <div className={`w-[8px] h-[8px] rounded-full ${col.color}`} />
                    {!isCollapsed && <span className={`text-[12px] font-bold uppercase tracking-widest ${col.key === "Blocked" ? "text-clay-500" : "text-stone-400"} m-0`}>{col.key} <span className="opacity-60">({colTasks.length})</span></span>}
                  </Inline>
                  <span onClick={() => setCollapsedColumns(p => { const n = new Set(p); n.has(col.key) ? n.delete(col.key) : n.add(col.key); return n; })}
                    className="cursor-pointer text-stone-400 text-[14px] hover:text-sumi-900 transition-colors">{isCollapsed ? "+" : "−"}</span>
                </Inline>
                
                {!isCollapsed && (
                  <div className="flex flex-col gap-[12px] overflow-y-auto flex-1 pb-2">
                    {colTasks.map((task) => (
                      <Card key={task.id} padding="p-[16px]" className="cursor-pointer bg-washi-white hover:border-stone-400 transition-colors shrink-0" draggable
                        onDragStart={e => { e.dataTransfer.setData("text/plain", task.id); e.currentTarget.style.opacity = "0.5"; }}
                        onDragEnd={e => e.currentTarget.style.opacity = "1"}
                        onClick={() => setShowTaskDrawer(task)}>
                        <Inline justify="justify-between" items="items-start" className="mb-[8px]">
                          <span className={`px-[6px] py-[2px] rounded-[2px] text-[10px] font-bold ${PRIORITY_COLORS[task.priority || "P2"]?.bg} ${PRIORITY_COLORS[task.priority || "P2"]?.text}`}>{task.priority || "P2"}</span>
                        </Inline>
                        <div className="text-[14px] font-medium text-sumi-900 mb-[4px] leading-snug">{task.title}</div>
                        {task.description && <div className="text-[12px] text-stone-400 mb-[8px] line-clamp-2">{task.description}</div>}
                        
                        <Inline justify="justify-between" items="items-center" className="mt-auto pt-[8px]">
                          {task.assignee_name ? <div className="w-[24px] h-[24px] rounded-full bg-linen-100 flex items-center justify-center text-[10px] font-bold text-sumi-900 border border-stone-200">{task.assignee_name[0]}</div> : <div />}
                          {task.deadline && <span className={`text-[11px] ${new Date(task.deadline) < new Date() ? "text-clay-500" : "text-stone-400"}`}>
                            {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>}
                        </Inline>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="p-[24px] text-center text-[12px] text-stone-400 m-0">No tasks</div>
                    )}
                  </div>
                )}
              </Stack>
            </Card>
          );
        })}
      </Inline>
    );
  };

  const renderListView = () => {
    const toggleSelect = (id) => {
      setSelectedTasks(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    return (
      <Card padding="p-0" className="overflow-hidden">
        {filteredTasks.length === 0 && !loading && (
          <div className="p-[48px] text-center text-[14px] text-stone-400">No tasks match your filters.</div>
        )}
        {filteredTasks.map((task, idx) => {
          const isExpanded = expandedTaskId === task.id;
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done" && task.status !== "Cancelled";
          const isSelected = selectedTasks.has(task.id);
          return (
            <div key={task.id} className="border-b border-stone-200 last:border-0" style={{ padding: "12px 16px" }}>
              <Inline gap="gap-[16px]" items="items-center" className={`pl-2 rounded-[4px] ${isSelected ? "bg-linen-100" : ""} ${isOverdue ? "border-l-[4px] border-l-clay-500" : task.status === "Blocked" ? "border-l-[4px] border-l-clay-500" : "border-l-[4px] border-l-transparent"}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(task.id)} className="w-4 h-4 rounded-[2px] border-stone-400 text-sumi-900 focus:ring-sumi-900" />
                <div className={`w-[8px] h-[8px] rounded-full ${STATUS_COLORS[task.status || "Not Started"]}`} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                  <div className="text-[14px] font-medium text-sumi-900">{task.title}</div>
                </div>
                <span className={`px-[6px] py-[2px] rounded-[2px] text-[10px] font-bold ${PRIORITY_COLORS[task.priority || "P2"]?.bg} ${PRIORITY_COLORS[task.priority || "P2"]?.text} mr-2`}>{task.priority || "P2"}</span>
                {task.deadline && <span className={`text-[12px] whitespace-nowrap mr-4 ${isOverdue ? "text-clay-500" : "text-stone-400"}`}>
                  {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>}
                <Inline gap="gap-[8px]" className="mr-4">
                  {task.status === "Done" ? (
                    <button onClick={() => handleStatusChange(task.id, "In Progress")} className="text-stone-400 hover:text-sumi-900 bg-transparent border-none cursor-pointer outline-none p-1 transition-colors" title="Reopen"><Icon name="reopen" size={16} /></button>
                  ) : (
                    <button onClick={() => handleStatusChange(task.id, "Done")} className="text-moss-600 hover:text-sumi-900 bg-transparent border-none cursor-pointer outline-none p-1 transition-colors" title="Done"><Icon name="check" size={16} /></button>
                  )}
                  <button onClick={() => openEditTask(task)} className="text-stone-400 hover:text-sumi-900 bg-transparent border-none cursor-pointer outline-none p-1 transition-colors" title="Edit"><Icon name="edit" size={16} /></button>
                  <button onClick={() => handleDeleteTask(task.id)} className="text-clay-500 hover:opacity-80 bg-transparent border-none cursor-pointer outline-none p-1 transition-colors" title="Delete"><Icon name="trash" size={16} /></button>
                </Inline>
              </Inline>
              {isExpanded && (
                <div className="bg-linen-100 rounded-[4px] p-[16px] mt-3 ml-[32px] text-[13px]">
                  {task.description && <div className="text-sumi-900 mb-3">{task.description}</div>}
                  <Inline gap="gap-[24px]" className="flex-wrap text-[12px] text-stone-400">
                    {task.goal_name && <span>Goal: <span className="text-sumi-900 font-medium">{task.goal_name}</span></span>}
                    {task.assignee_name && <span>Assignee: <span className="text-sumi-900 font-medium">{task.assignee_name}</span></span>}
                    {task.estimated_hours && <span>Est: <span className="text-sumi-900 font-medium">{task.estimated_hours}h</span></span>}
                    {task.phase_tag && <span>Phase: <span className="text-sumi-900 font-medium">{task.phase_tag}</span></span>}
                  </Inline>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    );
  };

  const renderBlockerPanel = () => {
    return (
      <Card padding="p-[48px]">
        <div className="text-center text-stone-400 text-[14px]">Blocker panel under redesign. Check back later.</div>
      </Card>
    );
  };

  const renderDailyStandups = () => {
    return (
      <Card padding="p-[48px]">
        <div className="text-center text-stone-400 text-[14px]">Standups under redesign. Check back later.</div>
      </Card>
    );
  };

  return (
    <Section padding="p-0" className="max-w-7xl mx-auto w-full font-ui h-full flex flex-col">
      <header className="mb-[64px] shrink-0">
        <Inline justify="justify-between" items="items-start">
          <Stack gap="gap-[8px]">
            <h1 className="text-[32px] md:text-[40px] font-heading text-sumi-900 m-0">Execute</h1>
            <p className="text-[12px] font-mono text-stone-400 m-0 uppercase tracking-widest">{SUBTITLE_MAP[activeTab]}</p>
          </Stack>
          <Button variant="primary" onClick={() => { setEditTask(null); setTaskForm({ title: "", description: "", priority: "P2", status: "Not Started", deadline: "", goal_id: "", parent_id: "", assignee_id: "", estimated_hours: "", phase_tag: "" }); setShowTaskForm(true); }} className="flex items-center gap-2">
            <Icon name="plus" size={16} /> New Task
          </Button>
        </Inline>
      </header>

      <div className="mb-[32px] shrink-0">
        <Inline gap="gap-[8px]" className="p-[4px] bg-linen-100 rounded-[4px] border border-stone-200 w-fit flex-wrap">
          {["board", "list", "blockers", "standups"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-[8px] px-[16px] py-[8px] rounded-[2px] text-[13px] font-medium transition-colors cursor-pointer outline-none ${
                activeTab === tab 
                  ? "bg-washi-white text-sumi-900 shadow-sm border border-stone-200" 
                  : "text-stone-400 hover:text-sumi-900 border border-transparent bg-transparent"
              }`}
            >
              <Icon name={tab === "board" ? "columns" : tab === "list" ? "list" : tab === "blockers" ? "blocker" : "standup"} size={14} />
              {tab === "board" ? "Kanban" : tab === "list" ? "List" : tab === "blockers" ? "Blockers" : "Standups"}
            </button>
          ))}
        </Inline>
      </div>

      {(activeTab === "board" || activeTab === "list") && (
        <div className="mb-[32px] shrink-0">
          <Inline gap="gap-[12px]" className="flex-wrap items-center">
            <Input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-[240px]" 
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Inline>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-[500px]">
        {activeTab === "board" && renderKanbanBoard()}
        {activeTab === "list" && renderListView()}
        {activeTab === "blockers" && renderBlockerPanel()}
        {activeTab === "standups" && renderDailyStandups()}
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowTaskForm(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[500px] shadow-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <Inline justify="justify-between" items="items-center" className="mb-[24px]">
              <h3 className="m-0 text-[20px] font-heading text-sumi-900">{editTask ? "Edit Task" : "New Task"}</h3>
              <button onClick={() => setShowTaskForm(false)} className="bg-transparent border-none cursor-pointer text-stone-400 hover:text-sumi-900 outline-none p-1"><Icon name="x" size={20} /></button>
            </Inline>
            <form onSubmit={handleCreateTask}>
              <Stack gap="gap-[16px]">
                <Stack gap="gap-[8px]">
                  <label className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">Title *</label>
                  <Input type="text" value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" required />
                </Stack>
                <Stack gap="gap-[8px]">
                  <label className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">Description</label>
                  <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} className="w-full min-h-[100px] resize-y p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors font-sans" placeholder="Describe the task..." />
                </Stack>
                <Grid cols="grid-cols-2" gap="gap-[16px]">
                  <Stack gap="gap-[8px]">
                    <label className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="w-full h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                      {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Stack>
                  <Stack gap="gap-[8px]">
                    <label className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">Status</label>
                    <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))} className="w-full h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Stack>
                </Grid>
                <Button type="submit" variant="primary" className="w-full mt-[16px]" disabled={!taskForm.title.trim()}>
                  {editTask ? "Update Task" : "Create Task"}
                </Button>
              </Stack>
            </form>
          </Card>
        </div>
      )}

      {showTaskDrawer && (
        <div className="fixed top-0 right-0 w-[480px] max-w-full h-[100vh] bg-washi-white border-l border-stone-200 z-[999] p-[32px] overflow-y-auto shadow-xl flex flex-col font-ui transform transition-transform">
          <Inline justify="justify-between" items="items-start" className="mb-[32px]">
            <h3 className="m-0 text-[24px] font-heading text-sumi-900 flex-1 pr-4">{showTaskDrawer.title}</h3>
            <button onClick={() => setShowTaskDrawer(null)} className="bg-transparent border-none cursor-pointer text-stone-400 hover:text-sumi-900 outline-none p-1"><Icon name="x" size={24} /></button>
          </Inline>
          
          <Inline gap="gap-[12px]" items="items-center" className="mb-[32px] flex-wrap">
            <span className={`px-[8px] py-[4px] rounded-[2px] text-[11px] font-bold ${PRIORITY_COLORS[showTaskDrawer.priority || "P2"]?.bg} ${PRIORITY_COLORS[showTaskDrawer.priority || "P2"]?.text}`}>{showTaskDrawer.priority || "P2"}</span>
            <span className={`px-[8px] py-[4px] rounded-[2px] text-[11px] font-bold text-washi-white ${STATUS_COLORS[showTaskDrawer.status || "Not Started"]}`}>{showTaskDrawer.status || "Not Started"}</span>
          </Inline>

          {showTaskDrawer.description && (
            <div className="mb-[48px]">
              <div className="text-[12px] font-bold uppercase tracking-widest text-stone-400 mb-[16px]">Description</div>
              <div className="text-[14px] text-sumi-900 leading-relaxed font-sans whitespace-pre-wrap">{showTaskDrawer.description}</div>
            </div>
          )}

          <Stack gap="gap-[16px]" className="text-[13px] text-stone-400 mt-auto border-t border-stone-200 pt-[32px]">
            {showTaskDrawer.goal_name && <div>Goal: <span className="text-sumi-900 font-medium">{showTaskDrawer.goal_name}</span></div>}
            {showTaskDrawer.assignee_name && <div>Assignee: <span className="text-sumi-900 font-medium">{showTaskDrawer.assignee_name}</span></div>}
            {showTaskDrawer.deadline && <div>Deadline: <span className={new Date(showTaskDrawer.deadline) < new Date() ? "text-clay-500 font-medium" : "text-sumi-900 font-medium"}>{new Date(showTaskDrawer.deadline).toLocaleDateString()}</span></div>}
          </Stack>
          
          <Inline gap="gap-[16px]" className="mt-[48px]">
            <Button variant="secondary" onClick={() => { openEditTask(showTaskDrawer); setShowTaskDrawer(null); }} className="flex-1">Edit Task</Button>
            <Button variant="secondary" onClick={() => handleDeleteTask(showTaskDrawer.id)} className="flex-1 text-clay-500 hover:text-clay-500 hover:border-clay-500">Delete</Button>
          </Inline>
        </div>
      )}
    </Section>
  );
}

export default Execute;
