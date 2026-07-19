import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, Shield, Rocket, Phone, CheckSquare, Square, Link2,
  AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink,
  X as XIcon,
} from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";
import HeroNumber from "../components/ui/HeroNumber";

const ICON_MAP = {
  target: Target,
  shield: Shield,
  rocket: Rocket,
  phone: Phone,
  "square-check": CheckSquare,
  square: Square,
  link: Link2,
  "alert-triangle": AlertTriangle,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  minus: Minus,
  externalLink: ExternalLink,
  x: XIcon,
};

function Icon({ name, size = 18, stroke: strokeWidth = 1.5 }) {
  const LucideIcon = ICON_MAP[name] || Target;
  return <LucideIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

const PRIORITY_COLORS = {
  P0: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P1: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P2: { bg: "rgba(59,130,246,0.1)", text: "var(--light-gray)" },
  P3: { bg: "rgba(107,114,128,0.08)", text: "var(--gray)" },
};

function Goals() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cascade");

  // ─── Goal Cascade ─────────────────────────────
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [unlinkedTasks, setUnlinkedTasks] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", goal_type: "monthly", parent_id: "", due_date: "", assignee_id: "" });
  const [quickTaskTitle, setQuickTaskTitle] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedWeekly, setExpandedWeekly] = useState(new Set());
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [goalDetail, setGoalDetail] = useState(null);
  const [goalDetailLoading, setGoalDetailLoading] = useState(false);

  const fetchGoalDetail = async (goalId) => {
    try {
      setGoalDetailLoading(true);
      const res = await api.get(`/api/goals/${goalId}/detail`);
      setGoalDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch goal detail:", err);
    } finally {
      setGoalDetailLoading(false);
    }
  };

  const closeGoalDetail = () => {
    setGoalDetail(null);
  };

  const fetchGoals = useCallback(async () => {
    try {
      setGoalsLoading(true);
      const [goalsRes, tasksRes, wsRes] = await Promise.all([
        api.get("/api/goals"),
        api.get("/api/tasks?flat=true"),
        api.get("/api/workspaces"),
      ]);
      setGoals(goalsRes.data);
      const allTasks = tasksRes.data || [];
      const unlinked = allTasks.filter(t => !t.goal_id && t.status !== "Done" && t.status !== "Cancelled");
      setUnlinkedTasks(unlinked);
      const wsId = localStorage.getItem("workspaceId");
      const currentWS = wsRes.data.find(w => w.id.toString() === wsId) || wsRes.data[0];
      setTeamMembers(currentWS?.members?.filter(m => m.status === "active") || []);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); track("page_viewed", { page: "goals" }); }, [fetchGoals]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new-goal") {
      setGoalForm({ title: "", description: "", goal_type: "weekly", parent_id: "", due_date: "", assignee_id: "" });
      setShowGoalForm(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const monthlyGoals = goals.filter(g => g.goal_type === "monthly");
  const weeklyGoals = goals.filter(g => g.goal_type === "weekly");
  const dailyGoals = goals.filter(g => g.goal_type === "daily");

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    try {
      const payload = {
        title: goalForm.title,
        description: goalForm.description,
        goal_type: goalForm.goal_type,
        parent_id: null,
        due_date: goalForm.due_date || null,
        assignee_id: goalForm.assignee_id || null,
      };
      if (goalForm.goal_type === "weekly" && goalForm.parent_id) payload.parent_id = parseInt(goalForm.parent_id);
      if (goalForm.goal_type === "daily" && goalForm.parent_id) payload.parent_id = parseInt(goalForm.parent_id);
      await api.post("/api/goals", payload);
      track("goal_created", { title: goalForm.title, goal_type: goalForm.goal_type });
      setGoalForm({ title: "", description: "", goal_type: "monthly", parent_id: "", due_date: "", assignee_id: "" });
      setShowGoalForm(false);
      fetchGoals();
    } catch { alert("Failed to create goal."); }
  };

  const handleStatusChange = async (goalId, status) => {
    try { await api.put(`/api/goals/${goalId}`, { status }); track("goal_status_updated", { goalId, status }); fetchGoals(); }
    catch { alert("Failed to update goal."); }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Delete this goal?")) return;
    try { await api.delete(`/api/goals/${goalId}`); track("goal_deleted", { goalId }); fetchGoals(); }
    catch { alert("Failed to delete goal."); }
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === "Done" ? "Not Started" : "Done";
      await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      track("task_toggled", { taskId: task.id, title: task.title, newStatus });
      fetchGoals();
    } catch { alert("Failed to toggle task."); }
  };

  const handleQuickTask = async (e, goalId) => {
    e.preventDefault();
    const title = quickTaskTitle[goalId];
    if (!title?.trim()) return;
    try {
      await api.post("/api/tasks", { title: title.trim(), goal_id: goalId, priority: "P2", status: "Not Started" });
      setQuickTaskTitle(p => ({ ...p, [goalId]: "" }));
      fetchGoals();
    } catch { alert("Failed to create task."); }
  };

  const navigateToTask = (taskId) => {
    navigate(`/execute?task=${taskId}`);
  };

  const TrendIcon = ({ trend }) => {
    if (trend === "accelerating") return <TrendingUp size={12} color="var(--positive)" />;
    if (trend === "stalling") return <TrendingDown size={12} color="var(--warning)" />;
    return <Minus size={12} color="var(--graphite)" />;
  };

  const SOURCE_BADGES = {
    manual: { icon: "🔧", label: "Manual" },
    meeting: { icon: "📋", label: "From Meeting" },
    decision: { icon: "💡", label: "From Decision" },
    ai: { icon: "🤖", label: "AI Generated" },
    extraction: { icon: "🤖", label: "AI Generated" },
    integration: { icon: "🔗", label: "Integrated" },
  };

  const handleProgressUpdate = async (goalId, progress) => {
    const val = Math.min(Math.max(parseInt(progress) || 0, 0), 100);
    try { await api.put(`/api/goals/${goalId}`, { progress: val }); fetchGoals(); }
    catch { alert("Failed to update progress."); }
  };

  const getGoalHealth = (goal) => {
    if (goal.at_risk && goal.risk_reason) {
      return { label: goal.risk_reason, color: goal.status === "at_risk" ? "#ef4444" : "#eab308" };
    }
    if (!goal.due_date || goal.status === "completed" || goal.status === "failed") return null;
    const diff = Math.ceil((new Date(goal.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#ef4444" };
    if (diff <= 3) return { label: `${diff}d to deadline`, color: "#eab308" };
    return { label: `${diff}d to deadline`, color: "#3acaa5" };
  };

  const renderProgressBar = (goal, options = {}) => {
    const { showTasks = true, clickable = false, size = "normal" } = options;
    const progress = goal.progress || 0;
    const done = goal.completed_task_count || 0;
    const total = goal.total_task_count || 0;
    const barHeight = size === "small" ? "4px" : "6px";
    const barColor = progress >= 100 ? "var(--positive)" : goal.at_risk ? "var(--warning)" : "var(--brand-orange)";
    return (
      <div style={{ marginTop: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--light-gray)", fontWeight: "500" }}>Progress</span>
            {goal.progress_trend && <TrendIcon trend={goal.progress_trend} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {showTasks && total > 0 && (
              <span style={{ fontSize: "10px", color: "var(--graphite)", fontWeight: "500" }}>
                {done}/{total} tasks
              </span>
            )}
            <span style={{ fontSize: "11px", color: "var(--white)", fontWeight: "700" }}>{progress}%</span>
          </div>
        </div>
        <div style={{ height: barHeight, background: "rgba(255,255,255,0.03)", borderRadius: "4px", cursor: clickable ? "pointer" : "default", overflow: "hidden" }}>
          <div style={{ height: barHeight, width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${barColor}, ${progress >= 100 ? "#3acaa5" : "#F16001"})`, borderRadius: "4px", transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
        </div>
      </div>
    );
  };

  const renderSourceBadge = (goal) => {
    const info = goal.source_info || {};
    const badge = SOURCE_BADGES[info.type] || SOURCE_BADGES.manual;
    return (
      <span style={{ fontSize: "9px", color: "var(--graphite)", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}>
        {badge.icon} {info.label || badge.label}
      </span>
    );
  };

  // ─── Calendar Defense ─────────────────────────
  const [rulesData, setRulesData] = useState({ rules: [], suggestions: [] });
  const [defenseLoading, setDefenseLoading] = useState(false);
  const [wsCalendarRules, setWsCalendarRules] = useState({ start_hour: 9, end_hour: 18 });
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const fetchRules = useCallback(async (skipLoading) => {
    try {
      if (!skipLoading) setDefenseLoading(true);
      const [wsRes, intRes] = await Promise.all([
        api.get("/api/workspaces"),
        api.get("/api/integrations").catch(() => ({ data: {} })),
      ]);
      const intData = intRes.data || {};
      setCalendarConnected(!!(intData.google_calendar?.connected || intData.outlook_calendar?.connected));
      const wsId = localStorage.getItem("workspaceId");
      const currentWS = wsRes.data.find(w => w.id.toString() === wsId) || wsRes.data[0];
      if (currentWS) {
        const cr = currentWS.calendar_rules || {};
        setWsCalendarRules({ start_hour: cr.start_hour || 9, end_hour: cr.end_hour || 18 });
      }
      try {
        const defRes = await api.get("/api/calendar/defense/rules");
        setRulesData(defRes.data);
      } catch { setRulesData({ rules: [], suggestions: [] }); }
    } catch { setRulesData({ rules: [], suggestions: [] }); }
    finally { if (!skipLoading) setDefenseLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "defense") fetchRules(); }, [activeTab, fetchRules]);

  const handleSaveHours = async () => {
    try {
      setSavingHours(true);
      const wsRes = await api.get("/api/workspaces");
      const wsId = localStorage.getItem("workspaceId");
      const currentWS = wsRes.data.find(w => w.id.toString() === wsId) || wsRes.data[0];
      if (!currentWS) return;
      await api.put(`/api/workspaces/${currentWS.id}`, {
        calendar_rules: {
          ...(currentWS.calendar_rules || {}),
          start_hour: parseInt(wsCalendarRules.start_hour) || 9,
          end_hour: parseInt(wsCalendarRules.end_hour) || 18,
        },
      });
      await fetchRules(true);
      alert("Working hours saved.");
    } catch { alert("Failed to save working hours."); }
    finally { setSavingHours(false); }
  };

  const handleApproveSuggestion = async (s) => {
    try {
      await api.post("/api/calendar/defense/suggestion", {
        action: "approved", start_time: s.start_time, end_time: s.end_time,
      });
      setRulesData(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(
          x => x.start_time !== s.start_time && x.end_time !== s.end_time
        ),
      }));
      await fetchRules(true);
    } catch { alert("Failed to move meeting."); }
  };

  const handleDismissSuggestion = async (s) => {
    try {
      await api.post("/api/calendar/defense/suggestion", {
        action: "rejected", start_time: s.start_time, end_time: s.end_time,
      });
      setRulesData(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(
          x => x.start_time !== s.start_time && x.end_time !== s.end_time
        ),
      }));
      await fetchRules(true);
    } catch { alert("Failed to dismiss."); }
  };

  const formatTime = (t) => {
    if (!t) return "";
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const calcDuration = (start, end) => {
    if (!start || !end) return "";
    const diff = Math.round((new Date(end) - new Date(start)) / 60000);
    if (diff >= 60) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${diff}m`;
  };

  // ─── Active Phase ─────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [applyingPhase, setApplyingPhase] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const [tRes, wsRes] = await Promise.all([api.get("/api/templates"), api.get("/api/workspaces")]);
      setTemplates(tRes.data);
      if (wsRes.data?.length > 0) setWorkspace(wsRes.data[0]);
    } catch (err) { console.error("[Goals] Failed to fetch templates:", err); }
  }, []);

  useEffect(() => { if (activeTab === "phase") fetchTemplates(); }, [activeTab, fetchTemplates]);

  const handleApplyPhase = async (name) => {
    try {
      setApplyingPhase(true);
      await api.post("/api/workspaces/apply-template", { template_name: name });
      fetchTemplates();
    } catch { alert("Failed to apply phase."); }
    finally { setApplyingPhase(false); }
  };

  const [phaseDetail, setPhaseDetail] = useState(null);
  const [phaseDetailLoading, setPhaseDetailLoading] = useState(false);

  useEffect(() => {
    const active = templates.find(t => t.is_active);
    if (active && activeTab === "phase") {
      handleSelectPhase(active.name);
    }
  }, [templates, activeTab]);

  const handleSelectPhase = async (name) => {
    try {
      setPhaseDetailLoading(true);
      setPhaseDetail(null);
      const res = await api.get(`/api/phase/${name}`);
      setPhaseDetail(res.data);
    } catch (err) { console.error("[Goals] Failed to select phase:", err); } finally { setPhaseDetailLoading(false); }
  };

  const [completedItems, setCompletedItems] = useState(new Set());

  const loadCompletedItems = (templateName) => {
    try { const stored = localStorage.getItem(`phase_checklist_${templateName}`); return new Set(stored ? JSON.parse(stored) : []); }
    catch { return new Set(); }
  };
  const saveCompletedItems = (templateName, items) => {
    localStorage.setItem(`phase_checklist_${templateName}`, JSON.stringify([...items]));
  };

  useEffect(() => {
    if (phaseDetail?.template?.name) setCompletedItems(loadCompletedItems(phaseDetail.template.name));
  }, [phaseDetail]);

  const toggleChecklistItem = (itemId) => {
    const next = new Set(completedItems);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    setCompletedItems(next);
    if (phaseDetail?.template?.name) saveCompletedItems(phaseDetail.template.name, next);
  };

  const handleCreateTaskFromChecklist = async (item) => {
    try {
      await api.post("/api/tasks", { title: item.title, priority: item.priority || "P2", status: "Not Started" });
      alert("Task created.");
    } catch { alert("Failed to create task."); }
  };

  const PHASE_LABELS = {
    think: "Think",
    build: "Build",
    launch: "Launch",
    scale: "Scale",
  };

  // ─── Follow-ups ───────────────────────────────
  const [followUps, setFollowUps] = useState([]);
  const [fuLoading, setFuLoading] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      setFuLoading(true);
      const res = await api.get("/api/follow-ups?status=pending");
      setFollowUps(res.data);
    } catch (err) { console.error("[Goals] Failed to fetch follow-ups:", err); } finally { setFuLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "followups") fetchFollowUps(); }, [activeTab, fetchFollowUps]);

  const handleFuStatus = async (id, status) => {
    try { await api.put(`/api/follow-ups/${id}`, { status }); fetchFollowUps(); }
    catch { alert("Failed to update."); }
  };

  const daysAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    return `${diff} days ago`;
  };

  // ─── Shared ───────────────────────────────────
  const tabs = [
    { id: "cascade", label: "Goal Cascade", icon: "target" },
    { id: "defense", label: "Calendar Defense", icon: "shield" },
    { id: "phase", label: "Active Phase", icon: "rocket" },
    { id: "followups", label: "Follow-ups", icon: "phone" },
  ];

  const tabBtnStyle = (active) => ({
    fontSize: "12.5px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'Clash Display', sans-serif",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: active ? "var(--void)" : "var(--graphite)",
    background: active ? "var(--ember)" : "transparent",
    transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
  });

  const chipStyle = {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--sand)",
    background: "var(--ink)",
    border: "none",
    padding: "5px 10px",
    borderRadius: "8px",
    display: "inline-block",
    transition: "all 0.2s"
  };

  const orangePill = {
    fontSize: "12.5px",
    color: "var(--void)",
    background: "var(--ember)",
    padding: "8px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    border: "none",
    fontFamily: "'Satoshi', sans-serif",
    transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
  };

  return (
    <>
    <div style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeSlide 0.35s ease-out; }
        .tab-bar {
          background-color: var(--ink-2);
          border: none;
          border-radius: 12px;
          padding: 4px;
          display: inline-flex;
          gap: 2px;
        }
        .orange-btn-hover:hover {
          transform: translateY(-1.5px);
        }
        .orange-btn-hover:active {
          transform: translateY(0);
        }
        .select-custom {
          outline: none;
          font-family: inherit;
        }
        .select-custom:hover {
          border-color: transparent !important;!important;
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .goal-checkbox:hover {
          color: var(--ember) !important;
        }
      `}</style>

      {/* Header + Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--white)", margin: "0 0 2px", fontFamily: "'Clash Display', sans-serif" }}>Plan</h1>
          <p style={{ fontSize: "12.5px", color: "var(--light-gray)", margin: 0 }}>Map your startup roadmap and defend operational focus.</p>
        </div>
        {activeTab === "cascade" && (
          <button style={orangePill} className="orange-btn-hover" onClick={() => setShowGoalForm(true)}>
            + Add Milestone
          </button>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div className="view-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`view-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ GOAL CASCADE ═══════════════ */}
      {activeTab === "cascade" && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

          {/* Stats Summary Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "22px", marginBottom: "8px" }}>
            <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="card-label">Roadmap Goals</span>
              <HeroNumber value={goals.length} variant="neutral" />
              <span className="card-hero-support">{goals.length === 1 ? "Goal" : "Goals"} mapped</span>
            </div>
            <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="card-label">Active Milestones</span>
              <HeroNumber
                value={goals.filter(g => g.goal_type === "monthly" && g.status === "in_progress").length}
                variant={goals.filter(g => g.goal_type === "monthly" && g.status === "in_progress").length > 0 ? "positive" : "neutral"}
              />
              <span className="card-hero-support">In progress</span>
            </div>
            <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="card-label">Unlinked Tasks</span>
              <HeroNumber value={unlinkedTasks.length} variant="warning" />
              <span className="card-hero-support">Not connected to goals</span>
            </div>
          </div>

          {/* Filter/Sort Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="plan-select"
                style={{ fontSize: "11px", padding: "6px 28px 6px 12px" }}>
                <option value="all" style={{ background: "var(--dark-gray)" }}>All Status</option>
                <option value="pending" style={{ background: "var(--dark-gray)" }}>Pending</option>
                <option value="in_progress" style={{ background: "var(--dark-gray)" }}>In Progress</option>
                <option value="completed" style={{ background: "var(--dark-gray)" }}>Completed</option>
                <option value="failed" style={{ background: "var(--dark-gray)" }}>Failed</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="plan-select"
                style={{ fontSize: "11px", padding: "6px 28px 6px 12px" }}>
                <option value="newest" style={{ background: "var(--dark-gray)" }}>Newest</option>
                <option value="oldest" style={{ background: "var(--dark-gray)" }}>Oldest</option>
                <option value="deadline" style={{ background: "var(--dark-gray)" }}>By Deadline</option>
              </select>
            </div>
            <div style={{ fontSize: "11px", color: "var(--light-gray)", fontWeight: "600" }}>
              {goals.length} goal{goals.length !== 1 ? "s" : ""}
            </div>
          </div>

          {goalsLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--light-gray)" }}>
              <span className="animate-pulse font-mono text-xs uppercase tracking-wider">Syncing Milestone Feed...</span>
            </div>
          ) : monthlyGoals.filter(mg => filterStatus === "all" || mg.status === filterStatus).length === 0 &&
            weeklyGoals.filter(w => !w.parent_id).filter(w => filterStatus === "all" || w.status === filterStatus).length === 0 ? (
            <div className="card-glass" style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 16px", color: "var(--light-gray)", fontSize: "14px" }}>
                No milestones mapped for this phase.
              </p>
              <button style={orangePill} className="orange-btn-hover" onClick={() => setShowGoalForm(true)}>
                Create First Goal
              </button>
            </div>
          ) : (
            <>
              {monthlyGoals
                .filter(mg => filterStatus === "all" || mg.status === filterStatus)
                .sort((a, b) => {
                  if (sortBy === "deadline") return (a.due_date || "z") < (b.due_date || "z") ? -1 : 1;
                  if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
                  return new Date(b.created_at) - new Date(a.created_at);
                })
                .map(mg => {
                  const kids = weeklyGoals.filter(w => w.parent_id === mg.id)
                    .filter(w => filterStatus === "all" || w.status === filterStatus);
                  const isExpanded = expandedMilestones.has(mg.id);
                  const health = getGoalHealth(mg);
                  const assignee = teamMembers.find(m => (m.user_id?.toString() || m.id?.toString()) === mg.assignee_id?.toString());
                  const progressVal = mg.progress !== undefined ? mg.progress : 0;

                  return (
                    <div key={mg.id} className="card-glass">
                      {/* Milestone Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span onClick={() => {
                            const next = new Set(expandedMilestones);
                            isExpanded ? next.delete(mg.id) : next.add(mg.id);
                            setExpandedMilestones(next);
                          }} style={{ fontSize: "10px", color: "var(--light-gray)", cursor: "pointer", width: "18px", textAlign: "center", userSelect: "none" }}>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span style={{ fontSize: "9.5px", color: "var(--brand-orange)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", backgroundColor: "rgba(232, 80, 2, 0.08)", padding: "3px 8px", borderRadius: "5px" }}>
                            Monthly
                          </span>
                          {health && <span style={{ fontSize: "9.5px", fontWeight: "700", color: health.color }}>{health.label}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <select value={mg.status} onChange={(e) => handleStatusChange(mg.id, e.target.value)}
                            className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--sand)", outline: "none" }}>
                            <option value="pending" style={{ background: "var(--dark-gray)", color: "#8a8a85" }}>Pending</option>
                            <option value="in_progress" style={{ background: "var(--dark-gray)", color: "var(--brand-orange)" }}>In Progress</option>
                            <option value="completed" style={{ background: "var(--dark-gray)", color: "#5dcaa5" }}>Completed</option>
                            <option value="failed" style={{ background: "var(--dark-gray)", color: "#ef4444" }}>Failed</option>
                          </select>
                          <span onClick={() => handleDeleteGoal(mg.id)}
                            className="glass-card-hover"
                            style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", border: "none" }}>✕</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 onClick={() => fetchGoalDetail(mg.id)}
                          style={{ fontSize: "18px", fontWeight: "750", color: "var(--white)", margin: 0, letterSpacing: "-0.015em", fontFamily: "'Clash Display', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                          {mg.title}
                          <ExternalLink size={12} color="var(--graphite)" style={{ opacity: 0.4 }} />
                        </h3>
                        {mg.due_date && (
                          <span style={{ fontSize: "10px", color: "var(--light-gray)", fontWeight: "600", whiteSpace: "nowrap" }}>
                            Due {new Date(mg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        {assignee && (
                          <span style={{ fontSize: "10px", color: "var(--light-gray)" }}>
                            Owner: <span style={{ color: "var(--brand-orange)", fontWeight: "600" }}>{assignee.user_name || assignee.name || assignee.email}</span>
                          </span>
                        )}
                        {renderSourceBadge(mg)}
                      </div>

                      {/* At-risk banner */}
                      {mg.at_risk && mg.risk_reason && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", padding: "6px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "10px", color: "#ef4444", fontWeight: "500" }}>
                          <AlertTriangle size={12} /> {mg.risk_reason}
                        </div>
                      )}

                      {/* Progress bar with auto task tracking */}
                      {renderProgressBar(mg, { showTasks: true, clickable: false })}

                      {isExpanded && (
                        <>
                          {mg.description && (
                            <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.01)", border: "none" }}>
                              {mg.description}
                            </div>
                          )}

                          {/* Weekly sub-goals */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {kids.map(wk => {
                              const wkExpanded = expandedWeekly.has(wk.id);
                              const wkHealth = getGoalHealth(wk);
                              const wkAssignee = teamMembers.find(m => (m.user_id?.toString() || m.id?.toString()) === wk.assignee_id?.toString());
                              const wkDailyGoals = dailyGoals.filter(d => d.parent_id === wk.id)
                                .filter(d => filterStatus === "all" || d.status === filterStatus);
                              const doneTasks = (wk.tasks || []).filter(t => t.status === "Done").length;

                              return (
                                <div key={wk.id} style={{
                                  borderLeft: `2.5px solid ${wk.status === "in_progress" ? "var(--brand-orange)" : "rgba(255,255,255,0.03)"}`,
                                  paddingLeft: "14px"
                                }}>
                                  {/* Weekly header */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                      <span onClick={() => {
                                        const next = new Set(expandedWeekly);
                                        wkExpanded ? next.delete(wk.id) : next.add(wk.id);
                                        setExpandedWeekly(next);
                                      }} style={{ fontSize: "9px", color: "var(--light-gray)", cursor: "pointer", width: "14px", textAlign: "center", userSelect: "none", flexShrink: 0 }}>
                                        {wkExpanded ? "▼" : "▶"}
                                      </span>
                                      <span style={{ fontSize: "11px", color: "#53a1f5", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", backgroundColor: "rgba(83,161,245,0.08)", padding: "1px 6px", borderRadius: "4px", flexShrink: 0 }}>
                                        Weekly
                                      </span>
                                      <h4 style={{ fontSize: "14px", fontWeight: "650", color: "var(--white)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wk.title}</h4>
                                      {wk.tasks?.length > 0 && (
                                        <span style={{ fontSize: "10px", color: "var(--light-gray)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                          {doneTasks}/{wk.tasks?.length}
                                        </span>
                                      )}
                                      {wkHealth && <span style={{ fontSize: "9px", fontWeight: "700", color: wkHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{wkHealth.label}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                      {wkAssignee && <span style={{ fontSize: "9px", color: "var(--brand-orange)", fontWeight: "600", whiteSpace: "nowrap" }}>{wkAssignee.user_name || wkAssignee.name}</span>}
                                      {wk.due_date && <span style={{ fontSize: "9px", color: "var(--light-gray)", whiteSpace: "nowrap" }}>{new Date(wk.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                      <select value={wk.status} onChange={(e) => handleStatusChange(wk.id, e.target.value)}
                                        className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--sand)", outline: "none" }}>
                                        <option value="pending" style={{ background: "var(--dark-gray)" }}>Pending</option>
                                        <option value="in_progress" style={{ background: "var(--dark-gray)" }}>In Progress</option>
                                        <option value="completed" style={{ background: "var(--dark-gray)" }}>Completed</option>
                                        <option value="failed" style={{ background: "var(--dark-gray)" }}>Failed</option>
                                      </select>
                                      <span onClick={() => handleDeleteGoal(wk.id)}
                                        style={{ fontSize: "10px", color: "#ef4444", cursor: "pointer", opacity: 0.5 }}>✕</span>
                                    </div>
                                  </div>

                                  {wkExpanded && (
                                    <div style={{ paddingLeft: "6px" }}>
                                      {/* Daily goals under this weekly */}
                                      {wkDailyGoals.map(dg => {
                                        const dgHealth = getGoalHealth(dg);
                                        const dgAssignee = teamMembers.find(m => (m.user_id?.toString() || m.id?.toString()) === dg.assignee_id?.toString());
                                        const dgDone = (dg.tasks || []).filter(t => t.status === "Done").length;
                                        return (
                                          <div key={dg.id} style={{
                                            marginLeft: "10px",
                                            padding: "6px 0 6px 10px",
                                            borderLeft: "none",
                                            marginBottom: "4px"
                                          }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: "9px", color: "#3acaa5", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", backgroundColor: "rgba(58,202,165,0.08)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>
                                                  Daily
                                                </span>
                                                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--white)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dg.title}</span>
                                                {(dg.tasks || []).length > 0 && (
                                                  <span style={{ fontSize: "9px", color: "var(--light-gray)", whiteSpace: "nowrap", flexShrink: 0 }}>({dgDone}/{dg.tasks?.length})</span>
                                                )}
                                                {dgHealth && <span style={{ fontSize: "8px", fontWeight: "700", color: dgHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{dgHealth.label}</span>}
                                              </div>
                                              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                                {dgAssignee && <span style={{ fontSize: "9px", color: "var(--brand-orange)", whiteSpace: "nowrap" }}>@{dgAssignee.user_name || dgAssignee.name}</span>}
                                                {dg.due_date && <span style={{ fontSize: "8px", color: "var(--light-gray)", whiteSpace: "nowrap" }}>{new Date(dg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                                <select value={dg.status} onChange={(e) => handleStatusChange(dg.id, e.target.value)}
                                                  style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", border: "none" }}>
                                                  <option value="pending" style={{ background: "var(--dark-gray)" }}>Pending</option>
                                                  <option value="in_progress" style={{ background: "var(--dark-gray)" }}>Active</option>
                                                  <option value="completed" style={{ background: "var(--dark-gray)" }}>Done</option>
                                                </select>
                                                <span onClick={() => handleDeleteGoal(dg.id)} style={{ fontSize: "9px", color: "#ef4444", cursor: "pointer", opacity: 0.4 }}>✕</span>
                                              </div>
                                            </div>

                                            {/* Tasks under daily goal */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "4px" }}>
                                              {(dg.tasks || []).map(t => {
                                                const isDone = t.status === "Done";
                                                const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.P2;
                                                return (
                                                  <div key={t.id} style={{
                                                    display: "flex", alignItems: "center",
                                                    padding: "2px 8px", borderRadius: "4px",
                                                    backgroundColor: "rgba(255,255,255,0.005)"
                                                  }}>
                                                    <span onClick={() => handleToggleTask(t)} style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: "6px" }}>
                                                      <Icon name={isDone ? "square-check" : "square"} size={11} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--light-gray)"} />
                                                    </span>
                                                    <span onClick={() => navigateToTask(t.id)} style={{ fontSize: "11.5px", color: isDone ? "var(--gray)" : "var(--white)", textDecoration: isDone ? "line-through" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                                      <ExternalLink size={9} color="var(--graphite)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                                    </span>
                                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                                      {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text }}>{t.priority}</span>}
                                                      <span style={{ fontSize: "9px", color: isDone ? "#3ac69b" : "var(--light-gray)", fontWeight: "600", whiteSpace: "nowrap" }}>{isDone ? "Done" : t.status === "In Progress" ? "Active" : "Todo"}</span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Quick add task for daily goal */}
                                            <form onSubmit={(e) => handleQuickTask(e, dg.id)} style={{ display: "flex", gap: "4px" }}>
                                              <input type="text" placeholder="Add task..." value={quickTaskTitle[dg.id] || ""}
                                                onChange={(e) => setQuickTaskTitle(p => ({ ...p, [dg.id]: e.target.value }))}
                                                style={{ flex: 1, padding: "4px 8px", borderRadius: "5px", border: "none" }} />
                                              <button type="submit" style={{ padding: "4px 8px", borderRadius: "5px", border: "none" }}>Add</button>
                                            </form>

                                            {/* Inline add daily sub-goal link */}
                                            <span onClick={() => {
                                              setGoalForm({ title: "", description: "", goal_type: "daily", parent_id: wk.id.toString(), due_date: "", assignee_id: "" });
                                              setShowGoalForm(true);
                                            }} style={{ fontSize: "9px", color: "var(--brand-orange)", cursor: "pointer", fontWeight: "700", marginTop: "2px", display: "inline-block" }}>
                                              + Add Daily Step
                                            </span>
                                          </div>
                                        );
                                      })}

                                      {/* Tasks directly under weekly goal */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "6px" }}>
                                        {(wk.tasks || []).map(t => {
                                          const isDone = t.status === "Done";
                                          const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.P2;
                                          return (
                                            <div key={t.id} style={{
                                              display: "flex", alignItems: "center",
                                              padding: "2px 8px", borderRadius: "4px",
                                              backgroundColor: "rgba(255,255,255,0.005)"
                                            }}>
                                              <span onClick={() => handleToggleTask(t)} style={{ cursor: "pointer", display: "flex", alignItems: "center", marginRight: "6px" }}>
                                                <Icon name={isDone ? "square-check" : "square"} size={11} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--light-gray)"} />
                                              </span>
                                              <span onClick={() => navigateToTask(t.id)} style={{ fontSize: "11.5px", color: isDone ? "var(--gray)" : "var(--white)", textDecoration: isDone ? "line-through" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                                <ExternalLink size={9} color="var(--graphite)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                              </span>
                                              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                                {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text }}>{t.priority}</span>}
                                                <span style={{ fontSize: "9px", color: isDone ? "#3ac69b" : "var(--light-gray)", fontWeight: "600", whiteSpace: "nowrap" }}>{isDone ? "Done" : t.status === "In Progress" ? "Active" : "Todo"}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Quick add task for weekly goal */}
                                      <form onSubmit={(e) => handleQuickTask(e, wk.id)} style={{ display: "flex", gap: "4px" }}>
                                        <input type="text" placeholder="Quick add task..." value={quickTaskTitle[wk.id] || ""}
                                          onChange={(e) => setQuickTaskTitle(p => ({ ...p, [wk.id]: e.target.value }))}
                                          style={{ flex: 1, padding: "4px 8px", borderRadius: "5px", border: "none" }} />
                                        <button type="submit" style={{ padding: "4px 8px", borderRadius: "5px", border: "none" }}>Add</button>
                                      </form>

                                      {/* Add daily sub-goal link */}
                                      <span onClick={() => {
                                        setGoalForm({ title: "", description: "", goal_type: "daily", parent_id: wk.id.toString(), due_date: "", assignee_id: "" });
                                        setShowGoalForm(true);
                                      }} style={{ fontSize: "9px", color: "var(--brand-orange)", cursor: "pointer", fontWeight: "700", display: "inline-block", marginTop: "2px" }}>
                                        + Add Daily Step
                                      </span>
                                    </div>
                                  )}

                                  {!wkExpanded && (wk.tasks?.length > 0 || wkDailyGoals.length > 0) && (
                                    <div style={{ fontSize: "9px", color: "var(--light-gray)", paddingLeft: "20px", marginTop: "2px" }}>
                                      {wk.tasks?.length} task{wk.tasks?.length !== 1 ? "s" : ""}
                                      {wkDailyGoals.length > 0 && ` · ${wkDailyGoals.length} daily step${wkDailyGoals.length !== 1 ? "s" : ""}`}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Add weekly goal link */}
                            {kids.length === 0 ? (
                              <div style={{ borderLeft: "none", paddingLeft: "18px" }}>
                                <p style={{ fontSize: "12px", color: "var(--light-gray)", margin: 0 }}>
                                  No weekly sub-goals mapped to this milestone.{" "}
                                  <span onClick={() => {
                                    setGoalForm(f => ({ ...f, goal_type: "weekly", parent_id: mg.id.toString() }));
                                    setShowGoalForm(true);
                                  }} style={{ color: "var(--brand-orange)", cursor: "pointer", fontWeight: "700", fontSize: "11px" }}>
                                    Add one
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <span onClick={() => {
                                setGoalForm(f => ({ ...f, goal_type: "weekly", parent_id: mg.id.toString() }));
                                setShowGoalForm(true);
                              }} style={{ fontSize: "10px", color: "var(--brand-orange)", cursor: "pointer", fontWeight: "700", marginTop: "4px", display: "inline-block" }}>
                                + Add Weekly Action Step
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

              {/* Standalone weekly goals */}
              {weeklyGoals.filter(w => !w.parent_id).filter(w => filterStatus === "all" || w.status === filterStatus).length > 0 && (
                <div className="card-glass">
                  <p className="card-label">
                    Standalone Weekly Action Steps
                  </p>
                  {weeklyGoals.filter(w => !w.parent_id).filter(w => filterStatus === "all" || w.status === filterStatus).map(wk => {
                    const wkHealth = getGoalHealth(wk);
                    const wkAssignee = teamMembers.find(m => (m.user_id?.toString() || m.id?.toString()) === wk.assignee_id?.toString());
                    const wkDailyGoals = dailyGoals.filter(d => d.parent_id === wk.id)
                      .filter(d => filterStatus === "all" || d.status === filterStatus);
                    const wkExpanded = expandedWeekly.has(wk.id);
                    return (
                      <div key={wk.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, padding: "12px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                            <span onClick={() => {
                              const next = new Set(expandedWeekly);
                              wkExpanded ? next.delete(wk.id) : next.add(wk.id);
                              setExpandedWeekly(next);
                            }} style={{ fontSize: "9px", color: "var(--light-gray)", cursor: "pointer", width: "14px", textAlign: "center", userSelect: "none", flexShrink: 0 }}>
                              {wkExpanded ? "▼" : "▶"}
                            </span>
                            <span style={{ fontSize: "13.5px", color: "var(--white)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wk.title}</span>
                            {wkHealth && <span style={{ fontSize: "9px", fontWeight: "700", color: wkHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{wkHealth.label}</span>}
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                            {wkAssignee && <span style={{ fontSize: "9px", color: "var(--brand-orange)", fontWeight: "600", whiteSpace: "nowrap" }}>{wkAssignee.user_name || wkAssignee.name}</span>}
                            {wk.due_date && <span style={{ fontSize: "9.5px", color: "var(--light-gray)", whiteSpace: "nowrap" }}>{new Date(wk.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                            <select value={wk.status} onChange={(e) => handleStatusChange(wk.id, e.target.value)}
                              className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--sand)", outline: "none" }}>
                              <option value="pending" style={{ background: "var(--dark-gray)" }}>Pending</option>
                              <option value="in_progress" style={{ background: "var(--dark-gray)" }}>In Progress</option>
                              <option value="completed" style={{ background: "var(--dark-gray)" }}>Completed</option>
                            </select>
                            <span onClick={() => handleDeleteGoal(wk.id)} style={{ fontSize: "12px", color: "#ef4444", cursor: "pointer", opacity: 0.5, padding: "0 4px" }}>✕</span>
                          </div>
                        </div>

                        {wkExpanded && (
                          <div style={{ paddingLeft: "20px", marginTop: "6px" }}>
                            {wkDailyGoals.map(dg => {
                              const dgHealth = getGoalHealth(dg);
                              const dgAssignee = teamMembers.find(m => (m.user_id?.toString() || m.id?.toString()) === dg.assignee_id?.toString());
                              return (
                                <div key={dg.id} style={{ marginBottom: "4px", padding: "4px 0 4px 10px", borderLeft: "none" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: "9px", color: "#3acaa5", fontWeight: "800", backgroundColor: "rgba(58,202,165,0.08)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>DAILY</span>
                                      <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--white)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dg.title}</span>
                                      {dgHealth && <span style={{ fontSize: "8px", fontWeight: "700", color: dgHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{dgHealth.label}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                      {dgAssignee && <span style={{ fontSize: "9px", color: "var(--brand-orange)", whiteSpace: "nowrap" }}>@{dgAssignee.user_name || dgAssignee.name}</span>}
                                      {dg.due_date && <span style={{ fontSize: "8px", color: "var(--light-gray)", whiteSpace: "nowrap" }}>{new Date(dg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                      <select value={dg.status} onChange={(e) => handleStatusChange(dg.id, e.target.value)}
                                        style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", border: "none" }}>
                                        <option value="pending" style={{ background: "var(--dark-gray)" }}>Pending</option>
                                        <option value="in_progress" style={{ background: "var(--dark-gray)" }}>Active</option>
                                        <option value="completed" style={{ background: "var(--dark-gray)" }}>Done</option>
                                      </select>
                                      <span onClick={() => handleDeleteGoal(dg.id)} style={{ fontSize: "9px", color: "#ef4444", cursor: "pointer", opacity: 0.4 }}>✕</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {(wk.tasks || []).map(t => {
                              const isDone = t.status === "Done";
                              const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.P2;
                              return (
                                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px", fontSize: "11px" }}>
                                  <span onClick={() => handleToggleTask(t)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    <Icon name={isDone ? "square-check" : "square"} size={10} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--light-gray)"} />
                                  </span>
                                  <span onClick={() => navigateToTask(t.id)} style={{ color: isDone ? "var(--gray)" : "var(--white)", textDecoration: isDone ? "line-through" : "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                    <ExternalLink size={8} color="var(--graphite)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                  </span>
                                  {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text, flexShrink: 0 }}>{t.priority}</span>}
                                </div>
                              );
                            })}
                            <span onClick={() => {
                              setGoalForm({ title: "", description: "", goal_type: "daily", parent_id: wk.id.toString(), due_date: "", assignee_id: "" });
                              setShowGoalForm(true);
                            }} style={{ fontSize: "9px", color: "var(--brand-orange)", cursor: "pointer", fontWeight: "700", display: "inline-block", marginTop: "4px" }}>
                              + Add Daily Step
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unlinked tasks alert */}
              {unlinkedTasks.length > 0 && (
                <div className="card-glass" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="link" size={14} stroke={2} style={{ color: "var(--ember-light)" }} />
                  <p style={{ fontSize: "12.5px", color: "var(--graphite)", margin: 0 }}>
                    {unlinkedTasks.length} task{unlinkedTasks.length === 1 ? " is" : "s are"} not connected to any milestone.{" "}
                    <span
                      onClick={() => navigate("/execute")}
                      style={{ color: "var(--ember-light)", cursor: "pointer", fontWeight: "700", textDecoration: "underline" }}
                      className="hover-underline"
                    >
                      Review on execution board →
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ CALENDAR DEFENSE ═══════════════ */}
      {activeTab === "defense" && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {defenseLoading ? (
            <div className="card-glass" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0 }}>Analyzing schedule defense configurations...</p>
            </div>
          ) : (
            <>
              {/* Calendar connection banner */}
              <div className="card-glass" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon name="calendar" size={14} style={{ color: "var(--muted-gold)" }} />
                  <div>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--white)" }}>Google Calendar</span>
                    <span className={`badge ${calendarConnected ? 'badge-positive' : 'badge-warning'}`} style={{ marginLeft: "12px" }}>
                      {calendarConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
                {!calendarConnected && (
                  <span style={{ fontSize: "11px", color: "var(--light-gray)", fontWeight: "600" }}>
                    Connect in Settings → Integrations
                  </span>
                )}
              </div>

              {/* Two-column layout: Left=Config, Right=Stats+Timeline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>

                {/* Left: Rules & Configuration */}
                <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <p className="card-label">Working Hours</p>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginTop: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "10px", color: "var(--light-gray)", fontWeight: "700", marginBottom: "4px", display: "block" }}>Start</label>
                        <input type="time" className="plan-input" value={`${String(wsCalendarRules.start_hour).padStart(2, "0")}:00`}
                          onChange={(e) => setWsCalendarRules(p => ({ ...p, start_hour: parseInt(e.target.value.split(":")[0]) }))}
                          style={{ width: "100%" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "10px", color: "var(--light-gray)", fontWeight: "700", marginBottom: "4px", display: "block" }}>End</label>
                        <input type="time" className="plan-input" value={`${String(wsCalendarRules.end_hour).padStart(2, "0")}:00`}
                          onChange={(e) => setWsCalendarRules(p => ({ ...p, end_hour: parseInt(e.target.value.split(":")[0]) }))}
                          style={{ width: "100%" }} />
                      </div>
                      <button onClick={handleSaveHours} disabled={savingHours}
                        style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: "var(--ember)", color: "var(--void)", fontWeight: "700", cursor: "pointer", fontSize: "11px" }}>
                        {savingHours ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="card-label">Active Shields ({rulesData.rules?.length || 0})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                      {rulesData.rules?.length > 0 ? rulesData.rules.map((r, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "8px 12px", borderRadius: "8px",
                          background: "rgba(255,255,255,0.01)"
                        }}>
                          <Icon name="shield" size={13} stroke={2} style={{ color: "var(--ember-light)" }} />
                          <span style={{ fontSize: "12px", color: "var(--white)", fontWeight: "600" }}>{r.label}</span>
                        </div>
                      )) : (
                        <p style={{ fontSize: "12px", color: "var(--light-gray)", margin: 0 }}>No shields active. Set working hours and connect a calendar.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Stats + Day Timeline */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Stats cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
                    <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="card-label">Protected / day</span>
                      <HeroNumber
                        value={`${wsCalendarRules.end_hour - wsCalendarRules.start_hour}h`}
                        variant="neutral"
                      />
                      <span className="card-hero-support">Shielded time slot</span>
                    </div>
                    <div className="card-glass" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="card-label">Conflicts</span>
                      <HeroNumber
                        value={rulesData.suggestions?.length || 0}
                        variant={rulesData.suggestions?.length > 0 ? "warning" : "positive"}
                      />
                      <span className="card-hero-support">Overlapping meetings</span>
                    </div>
                  </div>

                  {/* Visual Day Timeline */}
                  <div className="card-glass" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <p className="card-label" style={{ marginBottom: "16px" }}>Today's Schedule</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      {Array.from({ length: 14 }, (_, i) => {
                        const hour = i + 7; // 7:00 - 20:00
                        const isProtected = hour >= wsCalendarRules.start_hour && hour < wsCalendarRules.end_hour;
                        const hasMeeting = rulesData.suggestions?.some(s => {
                          const st = s.start_time ? new Date(s.start_time).getHours() : -1;
                          return st === hour;
                        });
                        return (
                          <div key={hour} style={{ display: "flex", alignItems: "center", gap: "6px", opacity: hour < 8 || hour > 19 ? 0.3 : 1 }}>
                            <span style={{ fontSize: "8.5px", color: "var(--graphite)", fontWeight: "700", width: "22px", textAlign: "right", flexShrink: 0 }}>
                              {hour}:00
                            </span>
                            <div style={{
                              flex: 1, height: "10px", borderRadius: "3px",
                              backgroundColor: hasMeeting ? "rgba(232,67,79,0.12)" : isProtected ? "rgba(62,207,142,0.12)" : "rgba(255,255,255,0.02)",
                              border: "none",
                              position: "relative"
                            }}>
                              {(hasMeeting || isProtected) && (
                                <div style={{
                                  height: "100%", borderRadius: "2px",
                                  width: "100%",
                                  background: hasMeeting
                                    ? "linear-gradient(90deg, var(--warning), transparent)"
                                    : "linear-gradient(90deg, var(--positive), transparent)"
                                }} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "14px", marginTop: "12px", fontSize: "9px", color: "var(--graphite)" }}>
                      <span><span style={{ color: "var(--positive)", marginRight: "4px" }}>■</span> Protected</span>
                      <span><span style={{ color: "var(--warning)", marginRight: "4px" }}>■</span> Meeting</span>
                      <span><span style={{ color: "rgba(255, 255, 255, 0.05)", marginRight: "4px" }}>■</span> Available</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions section */}
              <div className="card-glass">
                <p className="card-label" style={{ marginBottom: "16px" }}>
                  Move Suggestions {rulesData.suggestions?.length > 0 ? `(${rulesData.suggestions.length})` : ""}
                </p>
                {rulesData.suggestions?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {rulesData.suggestions.map((s, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 16px", background: `rgba(232,80,2,0.03)`, borderRadius: "12px",
                        border: "none",
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--white)", marginBottom: "4px" }}>
                            📅 {s.meeting_title}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--graphite)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            {s.start_time && <span>Cur: {formatTime(s.start_time)}–{formatTime(s.end_time)} ({calcDuration(s.start_time, s.end_time)})</span>}
                            {s.action && <span style={{ color: "var(--ember-light)", fontWeight: "600" }}>→ {s.action}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                          <button onClick={() => handleApproveSuggestion(s)}
                            style={{ fontSize: "11.5px", color: "var(--void)", background: "var(--ember)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none" }}>
                            Approve Move
                          </button>
                          <button onClick={() => handleDismissSuggestion(s)}
                            style={{ fontSize: "11.5px", color: "var(--graphite)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: "0 0 4px" }}>
                      No meeting alerts or overlaps today.
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--graphite)", margin: 0 }}>
                      All scheduled events respect your protected hours.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ ACTIVE PHASE ═══════════════ */}
      {activeTab === "phase" && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div className="card-glass">
            {workspace ? (
              <div>
                {/* Phase header with health badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--white)", margin: 0, fontFamily: "'Clash Display', sans-serif" }}>
                      {PHASE_LABELS[workspace.active_phase] || (workspace.active_phase || "Build").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                    <span className="badge badge-positive" style={{ marginTop: "6px" }}>
                      Active Phase
                    </span>
                  </div>
                  {workspace.active_health && (
                    <span className={`badge ${workspace.active_health === "healthy" ? "badge-positive" : "badge-warning"}`} style={{ textTransform: "capitalize" }}>
                      {workspace.active_health.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Horizontal Phase Progression Indicator */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", margin: "32px 0 40px", padding: "0 10px" }}>
                  {/* Connecting Line */}
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px", background: "rgba(255,255,255,0.03)", zIndex: 1, transform: "translateY(-50%)" }} />
                  <div style={{ position: "absolute", top: "50%", left: 0, width: `${(Math.max(0, ["think", "build", "launch", "scale"].indexOf((workspace.active_phase || "build").toLowerCase())) / 3) * 100}%`, height: "2px", background: "var(--ember)", zIndex: 1, transform: "translateY(-50%)", transition: "width 0.5s ease" }} />

                  {["think", "build", "launch", "scale"].map((p, idx) => {
                    const activePhaseIdx = ["think", "build", "launch", "scale"].indexOf((workspace.active_phase || "build").toLowerCase());
                    const isCompleted = idx < activePhaseIdx;
                    const isActive = idx === activePhaseIdx;
                    const label = p.charAt(0).toUpperCase() + p.slice(1);
                    return (
                      <div key={p} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, position: "relative" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isActive ? "var(--ink)" : isCompleted ? "var(--surface)" : "var(--ink)",
                          border: isActive ? "2px solid var(--ember)" : isCompleted ? "1px solid var(--border-soft)" : "1px solid var(--border-glass)",
                          boxShadow: isActive ? "0 0 12px rgba(232, 80, 2, 0.2)" : "none",
                          color: isActive ? "var(--ember-light)" : isCompleted ? "var(--sand)" : "var(--graphite)",
                          fontWeight: "750", fontSize: "11px", transition: "all 0.3s"
                        }}>
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span style={{
                          marginTop: "8px", fontSize: "11.5px", fontWeight: isActive ? "750" : "500",
                          color: isActive ? "var(--sand)" : "var(--graphite)",
                          fontFamily: isActive ? "'Clash Display', sans-serif" : "inherit"
                        }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Real goals from this workspace */}
                {goals.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-glass)", paddingTop: "20px" }}>
                    <p className="card-label">
                      Phase Goals ({goals.filter(g => g.goal_type === "monthly").length} milestones, {goals.filter(g => g.goal_type === "weekly").length} sub-goals)
                    </p>
                    {goals.filter(g => g.goal_type === "monthly").map(goal => (
                      <div key={goal.id} style={{
                        border: "none",
                        padding: "14px 0", borderBottom: "1px solid var(--border-soft)"
                      }}>
                        <h5 style={{ fontSize: "14px", fontWeight: "750", color: "var(--ember-light)", margin: "0 0 8px", fontFamily: "'Clash Display', sans-serif" }}>
                          📅 {goal.title}
                        </h5>
                        {goal.description && (
                          <p style={{ fontSize: "12px", color: "var(--graphite)", margin: "0 0 10px", lineHeight: "1.4" }}>
                            {goal.description}
                          </p>
                        )}
                        <div style={{ fontSize: "11px", color: "var(--graphite)", display: "flex", gap: "10px" }}>
                          <span>Status: <strong style={{ color: "var(--sand)", textTransform: "capitalize" }}>{goal.status}</strong></span>
                          {goal.progress !== undefined && goal.progress !== null && (
                            <span>Progress: <strong style={{ color: "var(--ember-light)" }}>{goal.progress}%</strong></span>
                          )}
                        </div>
                        {/* Child weekly goals */}
                        {(goals.filter(g => g.goal_type === "weekly" && g.parent_id === goal.id)).length > 0 && (
                          <div style={{ marginTop: "10px", borderLeft: "none", paddingLeft: "14px" }}>
                            {goals.filter(g => g.goal_type === "weekly" && g.parent_id === goal.id).map(wg => (
                              <div key={wg.id} style={{ marginBottom: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--sand)" }}>
                                  📋 {wg.title}
                                </span>
                                <div style={{ fontSize: "10px", color: "var(--graphite)", marginTop: "2px" }}>
                                  Status: <strong style={{ textTransform: "capitalize", color: "var(--sand)" }}>{wg.status}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0, textAlign: "center" }}>
                    No goals defined for the current phase yet. Your active phase is <strong>{PHASE_LABELS[workspace.active_phase] || (workspace.active_phase || "Build").replace(/_/g, " ")}</strong>.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0, textAlign: "center" }}>
                Loading workspace phase data...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ FOLLOW-UPS ═══════════════ */}
      {activeTab === "followups" && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div className="card-glass">
            {fuLoading ? (
              <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0 }}>Syncing follow-up database...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {followUps.length > 0 ? followUps.slice(0, 3).map((fu, idx) => (
                  <div key={fu.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 0",
                    borderBottom: idx === Math.min(followUps.length, 3) - 1 ? "none" : "1px solid var(--border-soft)",
                  }}>
                    <span style={{ fontSize: "13.5px", color: "var(--white)", fontWeight: "500" }}>
                      {fu.person_name} — {fu.last_contact_date ? `Last contact ${daysAgo(fu.last_contact_date)}` : "No contact logged"}
                    </span>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button onClick={() => handleFuStatus(fu.id, "completed")}
                        style={{ fontSize: "11.5px", color: "var(--void)", background: "var(--ember)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none" }}>
                        Logged Follow-up
                      </button>
                      <button onClick={() => handleFuStatus(fu.id, "dismissed")}
                        style={{ fontSize: "11.5px", color: "var(--graphite)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                )) : (
                  <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0, padding: "20px 0", textAlign: "center" }}>
                    All relationship follow-ups are up to date.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── New Goal Modal ───────────────────── */}
      {showGoalForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(5,5,4,0.75)", backdropFilter: "blur(18px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
        }}>
          <div className="card-glass" style={{ width: "90%", maxWidth: "480px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "750", color: "var(--white)", margin: "0 0 20px", letterSpacing: "-0.015em", fontFamily: "'Clash Display', sans-serif" }}>Add Roadmap Item</h3>
            <form onSubmit={handleCreateGoal}>
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="card-label">Item Type</label>
                <select
                  value={goalForm.goal_type}
                  onChange={(e) => setGoalForm(f => ({ ...f, goal_type: e.target.value, parent_id: "" }))}
                  className="plan-input">
                  <option value="monthly" style={{ background: "var(--dark-gray)" }}>Monthly Milestone</option>
                  <option value="weekly" style={{ background: "var(--dark-gray)" }}>Weekly Action Step</option>
                  <option value="daily" style={{ background: "var(--dark-gray)" }}>Daily Step</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="card-label">Title</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Implement waitlist schemas and analytics"
                  className="plan-input"
                  required
                />
              </div>

              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="card-label">Description</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Scope or context..."
                  className="plan-input"
                  rows={3}
                />
              </div>

              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="card-label">Due Date</label>
                <input
                  type="date"
                  value={goalForm.due_date}
                  onChange={(e) => setGoalForm(f => ({ ...f, due_date: e.target.value }))}
                  className="plan-input"
                />
              </div>

              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="card-label">Assignee</label>
                <select
                  value={goalForm.assignee_id}
                  onChange={(e) => setGoalForm(f => ({ ...f, assignee_id: e.target.value }))}
                  className="plan-input">
                  <option value="" style={{ background: "var(--dark-gray)" }}>-- Unassigned --</option>
                  {teamMembers.map(m => (
                    <option key={m.user_id || m.id} value={m.user_id || m.id} style={{ background: "var(--dark-gray)" }}>
                      {m.user_name || m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>

              {goalForm.goal_type === "weekly" && (
                <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="card-label">Parent Milestone</label>
                  <select
                    value={goalForm.parent_id}
                    onChange={(e) => setGoalForm(f => ({ ...f, parent_id: e.target.value }))}
                    className="plan-input">
                    <option value="" style={{ background: "var(--dark-gray)" }}>-- Standalone --</option>
                    {monthlyGoals.map(m => <option key={m.id} value={m.id} style={{ background: "var(--dark-gray)" }}>{m.title}</option>)}
                  </select>
                </div>
              )}

              {goalForm.goal_type === "daily" && (
                <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="card-label">Parent Weekly Step</label>
                  <select
                    value={goalForm.parent_id}
                    onChange={(e) => setGoalForm(f => ({ ...f, parent_id: e.target.value }))}
                    className="plan-input">
                    <option value="" style={{ background: "var(--dark-gray)" }}>-- Standalone --</option>
                    {weeklyGoals.map(w => <option key={w.id} value={w.id} style={{ background: "var(--dark-gray)" }}>{w.title}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "transparent", color: "var(--graphite)", cursor: "pointer", fontWeight: "600" }}>
                  Cancel
                </button>
                <button type="submit" style={orangePill} className="orange-btn-hover">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>

      {/* ═══════════════ GOAL DETAIL DRAWER ═══════════════ */}
      {goalDetail && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw", background: "var(--ink)", borderLeft: "1px solid rgba(255,255,255,0.06)", zIndex: 1000, overflowY: "auto", padding: "24px", animation: "fadeSlide 0.2s ease-out", boxShadow: "-8px 0 40px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", padding: "2px 6px", borderRadius: "4px", background: "rgba(232,80,2,0.1)", color: "var(--brand-orange)" }}>{goalDetail.goal.goal_type}</span>
                {goalDetail.goal.source_info && renderSourceBadge(goalDetail.goal)}
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "750", color: "var(--white)", margin: 0, fontFamily: "'Clash Display', sans-serif" }}>{goalDetail.goal.title}</h2>
            </div>
            <button onClick={closeGoalDetail} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--graphite)", padding: "4px" }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          {goalDetail.goal.description && (
            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", fontSize: "12px", color: "var(--sand)", marginBottom: "16px" }}>{goalDetail.goal.description}</div>
          )}

          {goalDetail.goal.at_risk && goalDetail.goal.risk_reason && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "11px", color: "#ef4444", fontWeight: "500", marginBottom: "16px" }}>
              <AlertTriangle size={14} /> {goalDetail.goal.risk_reason}
            </div>
          )}

          {renderProgressBar(goalDetail.goal, { showTasks: true })}

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>Status</h3>
            <select value={goalDetail.goal.status} onChange={(e) => { handleStatusChange(goalDetail.goal.id, e.target.value); setGoalDetail(null); }}
              style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "6px", border: "none", width: "100%" }}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>

          {goalDetail.source_meeting && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>Source Meeting</h3>
              <div className="card-glass" style={{ padding: "10px 12px", fontSize: "12px", color: "var(--sand)" }}>
                {goalDetail.source_meeting.title} &mdash; {goalDetail.source_meeting.date}
              </div>
            </div>
          )}

          {goalDetail.tasks.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>
                Linked Tasks ({goalDetail.tasks.filter(t => t.status !== "Done").length} active / {goalDetail.tasks.length} total)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.tasks.map(t => (
                  <div key={t.id} onClick={() => navigateToTask(t.id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontSize: "11px", color: "var(--sand)" }}>
                    <span onClick={(e) => { e.stopPropagation(); handleToggleTask(t); }} style={{ cursor: "pointer", display: "flex" }}>
                      <Icon name={t.status === "Done" ? "square-check" : "square"} size={10} color={t.status === "Done" ? "#3ac69b" : "var(--light-gray)"} />
                    </span>
                    <span style={{ flex: 1, textDecoration: t.status === "Done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                    <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: PRIORITY_COLORS[t.priority]?.bg || "transparent", color: PRIORITY_COLORS[t.priority]?.text || "var(--graphite)" }}>{t.priority}</span>
                    <ExternalLink size={9} color="var(--graphite)" style={{ opacity: 0.3 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.decisions.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>Linked Decisions ({goalDetail.decisions.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.decisions.map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", fontSize: "11px", color: "var(--sand)" }}>
                    <span style={{ fontSize: "12px" }}>💡</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.decision?.substring(0, 100) || d.title || "Decision"}</span>
                    {d.confidence_score && <span style={{ fontSize: "9px", color: d.confidence_score >= 80 ? "var(--positive)" : "var(--graphite)" }}>{Math.round(d.confidence_score)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.sub_goals.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>Sub-Goals ({goalDetail.sub_goals.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.sub_goals.map(sg => (
                  <div key={sg.id} onClick={() => fetchGoalDetail(sg.id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontSize: "11px", color: "var(--sand)" }}>
                    <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", padding: "1px 4px", borderRadius: "3px", background: "rgba(83,161,245,0.1)", color: "#53a1f5", flexShrink: 0 }}>{sg.goal_type}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sg.title}</span>
                    <span style={{ fontSize: "9px", color: "var(--graphite)" }}>{sg.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.recent_activity.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--white)", marginBottom: "8px" }}>Recent Activity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.recent_activity.slice(0, 10).map(a => (
                  <div key={`${a.type}-${a.id}`} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "10px", color: "var(--graphite)" }}>
                    <span>{a.type === "task" ? "📋" : "💡"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ color: a.status === "Done" ? "var(--positive)" : "var(--graphite)" }}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => { handleDeleteGoal(goalDetail.goal.id); setGoalDetail(null); }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "11px", fontWeight: 600, flex: 1 }}>
              Delete Goal
            </button>
          </div>
        </div>
      )}

      {/* Overlay when drawer is open */}
      {goalDetail && (
        <div onClick={closeGoalDetail} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />
      )}

    </>
  );
}

export default Goals;

