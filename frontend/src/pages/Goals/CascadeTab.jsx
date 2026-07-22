import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { track } from "../../utils/track";
import { useToast } from "../../context/ToastContext";
import { Icon, PRIORITY_COLORS, renderProgressBar, renderSourceBadge, getGoalHealth, orangePill } from "./GoalsConstants";
import { ExternalLink, AlertTriangle } from "lucide-react";
import HeroNumber from "../../components/ui/HeroNumber";
import { Stack, Grid, Inline, Card } from "../../components/layout";

export default function CascadeTab({ goals, setGoals, unlinkedTasks, setUnlinkedTasks, teamMembers, setTeamMembers, onGoalsChange }) {
  const monthlyGoals = goals.filter(g => g.goal_type === "monthly");
  const weeklyGoals = goals.filter(g => g.goal_type === "weekly");
  const dailyGoals = goals.filter(g => g.goal_type === "daily");
  const navigate = useNavigate();
  const toast = useToast();

  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", goal_type: "monthly", parent_id: "", due_date: "", assignee_id: "" });
  const [quickTaskTitle, setQuickTaskTitle] = useState({});
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
      onGoalsChange();
    } catch { toast("Failed to create goal.", "error"); }
  };

  const handleStatusChange = async (goalId, status) => {
    try { await api.put(`/api/goals/${goalId}`, { status }); track("goal_status_updated", { goalId, status }); onGoalsChange(); }
    catch { toast("Failed to update goal.", "error"); }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Delete this goal?")) return;
    try { await api.delete(`/api/goals/${goalId}`); track("goal_deleted", { goalId }); onGoalsChange(); }
    catch { toast("Failed to delete goal.", "error"); }
  };

  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === "Done" ? "Not Started" : "Done";
      await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      track("task_toggled", { taskId: task.id, title: task.title, newStatus });
      onGoalsChange();
    } catch { toast("Failed to toggle task.", "error"); }
  };

  const handleQuickTask = async (e, goalId) => {
    e.preventDefault();
    const title = quickTaskTitle[goalId];
    if (!title?.trim()) return;
    try {
      await api.post("/api/tasks", { title: title.trim(), goal_id: goalId, priority: "P2", status: "Not Started" });
      setQuickTaskTitle(p => ({ ...p, [goalId]: "" }));
      onGoalsChange();
    } catch { toast("Failed to create task.", "error"); }
  };

  const navigateToTask = (taskId) => {
    navigate(`/execute?task=${taskId}`);
  };

  return (
    <>
      <Stack gap="gap-6" className="fade-in">
        {/* Stats Summary Row */}
        <Grid cols="grid-cols-1 md:grid-cols-3">
          <Card padding="p-6">
            <Stack gap="gap-1">
              <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest">Roadmap Goals</span>
              <HeroNumber value={goals.length} variant="neutral" />
              <span className="text-sm text-[var(--stone-400)]">{goals.length === 1 ? "Goal" : "Goals"} mapped</span>
            </Stack>
          </Card>
          <Card padding="p-6">
            <Stack gap="gap-1">
              <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest">Active Milestones</span>
              <HeroNumber
                value={goals.filter(g => g.goal_type === "monthly" && g.status === "in_progress").length}
                variant={goals.filter(g => g.goal_type === "monthly" && g.status === "in_progress").length > 0 ? "positive" : "neutral"}
              />
              <span className="text-sm text-[var(--stone-400)]">In progress</span>
            </Stack>
          </Card>
          <Card padding="p-6">
            <Stack gap="gap-1">
              <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest">Unlinked Tasks</span>
              <HeroNumber value={unlinkedTasks.length} variant="warning" />
              <span className="text-sm text-[var(--stone-400)]">Not connected to goals</span>
            </Stack>
          </Card>
        </Grid>

        {/* Add Milestone Button */}
          <Inline justify="justify-end">
            <button style={orangePill} className="orange-btn-hover" onClick={() => { setGoalForm({ title: "", description: "", goal_type: "weekly", parent_id: "", due_date: "", assignee_id: "" }); setShowGoalForm(true); }}>
              + Add Milestone
            </button>
          </Inline>

        {/* Filter/Sort Toolbar */}
          <Inline justify="justify-between" items="items-center">
          <Inline gap="gap-2" items="items-center">
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
          </Inline>
          <div className="text-sm font-semibold text-[var(--stone-400)]">
            {goals.length} goal{goals.length !== 1 ? "s" : ""}
          </div>
        </Inline>

        {goalsLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--japandi-muted)" }}>
            <span className="animate-pulse font-mono text-xs uppercase tracking-wider">Syncing Milestone Feed...</span>
          </div>
        ) : monthlyGoals.filter(mg => filterStatus === "all" || mg.status === filterStatus).length === 0 &&
          weeklyGoals.filter(w => !w.parent_id).filter(w => filterStatus === "all" || w.status === filterStatus).length === 0 ? (
          <Card padding="p-8" className="text-center">
            <Stack gap="gap-4" items="items-center">
              <p className="text-base text-[var(--stone-400)] m-0">
                No milestones mapped for this phase.
              </p>
              <button style={orangePill} className="orange-btn-hover" onClick={() => setShowGoalForm(true)}>
                Create First Goal
              </button>
            </Stack>
          </Card>
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
                  <Card key={mg.id} padding="p-6">
                    {/* Milestone Header */}
                    <Inline justify="justify-between" items="items-center" className="mb-4">
                      <Inline gap="gap-2" items="items-center">
                        <span onClick={() => {
                          const next = new Set(expandedMilestones);
                          isExpanded ? next.delete(mg.id) : next.add(mg.id);
                          setExpandedMilestones(next);
                        }} style={{ fontSize: "10px", color: "var(--japandi-muted)", cursor: "pointer", width: "18px", textAlign: "center", userSelect: "none" }}>
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        <span style={{ fontSize: "9.5px", color: "var(--japandi-accent)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", backgroundColor: "rgba(232, 80, 2, 0.08)", padding: "3px 8px", borderRadius: "5px" }}>
                          Monthly
                        </span>
                        {health && <span style={{ fontSize: "9.5px", fontWeight: "700", color: health.color }}>{health.label}</span>}
                      </Inline>
                      <Inline gap="gap-2" items="items-center">
                        <select value={mg.status} onChange={(e) => handleStatusChange(mg.id, e.target.value)}
                          className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--japandi-text)", outline: "none" }}>
                          <option value="pending" style={{ background: "var(--dark-gray)", color: "#8a8a85" }}>Pending</option>
                          <option value="in_progress" style={{ background: "var(--dark-gray)", color: "var(--japandi-accent)" }}>In Progress</option>
                          <option value="completed" style={{ background: "var(--dark-gray)", color: "#5dcaa5" }}>Completed</option>
                          <option value="failed" style={{ background: "var(--dark-gray)", color: "#ef4444" }}>Failed</option>
                        </select>
                        <span onClick={() => handleDeleteGoal(mg.id)}
                          className="glass-card-hover"
                          style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", fontSize: "11px", color: "#ef4444", cursor: "pointer", border: "none" }}>✕</span>
                      </Inline>
                    </Inline>

                    <Inline justify="justify-between" items="items-center">
                      <h3 onClick={() => fetchGoalDetail(mg.id)}
                        style={{ fontSize: "18px", fontWeight: "750", color: "var(--japandi-text)", margin: 0, letterSpacing: "-0.015em", fontFamily: "'Clash Display', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                        {mg.title}
                        <ExternalLink size={12} color="var(--japandi-muted)" style={{ opacity: 0.4 }} />
                      </h3>
                      {mg.due_date && (
                        <span style={{ fontSize: "10px", color: "var(--japandi-muted)", fontWeight: "600", whiteSpace: "nowrap" }}>
                          Due {new Date(mg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </Inline>

                    <Inline gap="gap-2" items="items-center" className="mt-1">
                      {assignee && (
                        <span style={{ fontSize: "10px", color: "var(--japandi-muted)" }}>
                          Owner: <span style={{ color: "var(--japandi-accent)", fontWeight: "600" }}>{assignee.user_name || assignee.name || assignee.email}</span>
                        </span>
                      )}
                      {renderSourceBadge(mg)}
                    </Inline>

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
                                borderLeft: `2.5px solid ${wk.status === "in_progress" ? "var(--japandi-accent)" : "rgba(255,255,255,0.03)"}`,
                                paddingLeft: "14px"
                              }}>
                                {/* Weekly header */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                    <span onClick={() => {
                                      const next = new Set(expandedWeekly);
                                      wkExpanded ? next.delete(wk.id) : next.add(wk.id);
                                      setExpandedWeekly(next);
                                    }} style={{ fontSize: "9px", color: "var(--japandi-muted)", cursor: "pointer", width: "14px", textAlign: "center", userSelect: "none", flexShrink: 0 }}>
                                      {wkExpanded ? "▼" : "▶"}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#53a1f5", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", backgroundColor: "rgba(83,161,245,0.08)", padding: "1px 6px", borderRadius: "4px", flexShrink: 0 }}>
                                      Weekly
                                    </span>
                                    <h4 style={{ fontSize: "14px", fontWeight: "650", color: "var(--japandi-text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wk.title}</h4>
                                    {wk.tasks?.length > 0 && (
                                      <span style={{ fontSize: "10px", color: "var(--japandi-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                        {doneTasks}/{wk.tasks?.length}
                                      </span>
                                    )}
                                    {wkHealth && <span style={{ fontSize: "9px", fontWeight: "700", color: wkHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{wkHealth.label}</span>}
                                  </div>
                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                    {wkAssignee && <span style={{ fontSize: "9px", color: "var(--japandi-accent)", fontWeight: "600", whiteSpace: "nowrap" }}>{wkAssignee.user_name || wkAssignee.name}</span>}
                                    {wk.due_date && <span style={{ fontSize: "9px", color: "var(--japandi-muted)", whiteSpace: "nowrap" }}>{new Date(wk.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                                    <select value={wk.status} onChange={(e) => handleStatusChange(wk.id, e.target.value)}
                                      className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--japandi-text)", outline: "none" }}>
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
                                              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--japandi-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dg.title}</span>
                                              {(dg.tasks || []).length > 0 && (
                                                <span style={{ fontSize: "9px", color: "var(--japandi-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>({dgDone}/{dg.tasks?.length})</span>
                                              )}
                                              {dgHealth && <span style={{ fontSize: "8px", fontWeight: "700", color: dgHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{dgHealth.label}</span>}
                                            </div>
                                            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                              {dgAssignee && <span style={{ fontSize: "9px", color: "var(--japandi-accent)", whiteSpace: "nowrap" }}>@{dgAssignee.user_name || dgAssignee.name}</span>}
                                              {dg.due_date && <span style={{ fontSize: "8px", color: "var(--japandi-muted)", whiteSpace: "nowrap" }}>{new Date(dg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
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
                                                    <Icon name={isDone ? "square-check" : "square"} size={11} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--japandi-muted)"} />
                                                  </span>
                                                  <span onClick={() => navigateToTask(t.id)} style={{ fontSize: "11.5px", color: isDone ? "var(--japandi-muted)" : "var(--japandi-text)", textDecoration: isDone ? "line-through" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                                    <ExternalLink size={9} color="var(--japandi-muted)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                                  </span>
                                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                                    {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text }}>{t.priority}</span>}
                                                    <span style={{ fontSize: "9px", color: isDone ? "#3ac69b" : "var(--japandi-muted)", fontWeight: "600", whiteSpace: "nowrap" }}>{isDone ? "Done" : t.status === "In Progress" ? "Active" : "Todo"}</span>
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
                                          }} style={{ fontSize: "9px", color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", marginTop: "2px", display: "inline-block" }}>
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
                                              <Icon name={isDone ? "square-check" : "square"} size={11} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--japandi-muted)"} />
                                            </span>
                                            <span onClick={() => navigateToTask(t.id)} style={{ fontSize: "11.5px", color: isDone ? "var(--japandi-muted)" : "var(--japandi-text)", textDecoration: isDone ? "line-through" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                              <ExternalLink size={9} color="var(--japandi-muted)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                            </span>
                                            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                              {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text }}>{t.priority}</span>}
                                              <span style={{ fontSize: "9px", color: isDone ? "#3ac69b" : "var(--japandi-muted)", fontWeight: "600", whiteSpace: "nowrap" }}>{isDone ? "Done" : t.status === "In Progress" ? "Active" : "Todo"}</span>
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
                                    }} style={{ fontSize: "9px", color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", display: "inline-block", marginTop: "2px" }}>
                                      + Add Daily Step
                                    </span>
                                  </div>
                                )}

                                {!wkExpanded && (wk.tasks?.length > 0 || wkDailyGoals.length > 0) && (
                                  <div style={{ fontSize: "9px", color: "var(--japandi-muted)", paddingLeft: "20px", marginTop: "2px" }}>
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
                              <p style={{ fontSize: "12px", color: "var(--japandi-muted)", margin: 0 }}>
                                No weekly sub-goals mapped to this milestone.{" "}
                                <span onClick={() => {
                                  setGoalForm(f => ({ ...f, goal_type: "weekly", parent_id: mg.id.toString() }));
                                  setShowGoalForm(true);
                                }} style={{ color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", fontSize: "11px" }}>
                                  Add one
                                </span>
                              </p>
                            </div>
                          ) : (
                            <span onClick={() => {
                              setGoalForm(f => ({ ...f, goal_type: "weekly", parent_id: mg.id.toString() }));
                              setShowGoalForm(true);
                            }} style={{ fontSize: "10px", color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", marginTop: "4px", display: "inline-block" }}>
                              + Add Weekly Action Step
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}

            {/* Standalone weekly goals */}
            {weeklyGoals.filter(w => !w.parent_id).filter(w => filterStatus === "all" || w.status === filterStatus).length > 0 && (
              <Card padding="p-6">
                <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest mb-4 block">
                  Standalone Weekly Action Steps
                </span>
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
                          }} style={{ fontSize: "9px", color: "var(--japandi-muted)", cursor: "pointer", width: "14px", textAlign: "center", userSelect: "none", flexShrink: 0 }}>
                            {wkExpanded ? "▼" : "▶"}
                          </span>
                          <span style={{ fontSize: "13.5px", color: "var(--japandi-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wk.title}</span>
                          {wkHealth && <span style={{ fontSize: "9px", fontWeight: "700", color: wkHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{wkHealth.label}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                          {wkAssignee && <span style={{ fontSize: "9px", color: "var(--japandi-accent)", fontWeight: "600", whiteSpace: "nowrap" }}>{wkAssignee.user_name || wkAssignee.name}</span>}
                          {wk.due_date && <span style={{ fontSize: "9.5px", color: "var(--japandi-muted)", whiteSpace: "nowrap" }}>{new Date(wk.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                          <select value={wk.status} onChange={(e) => handleStatusChange(wk.id, e.target.value)}
                            className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: "var(--japandi-text)", outline: "none" }}>
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
                                    <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--japandi-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dg.title}</span>
                                    {dgHealth && <span style={{ fontSize: "8px", fontWeight: "700", color: dgHealth.color, whiteSpace: "nowrap", flexShrink: 0 }}>{dgHealth.label}</span>}
                                  </div>
                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                                    {dgAssignee && <span style={{ fontSize: "9px", color: "var(--japandi-accent)", whiteSpace: "nowrap" }}>@{dgAssignee.user_name || dgAssignee.name}</span>}
                                    {dg.due_date && <span style={{ fontSize: "8px", color: "var(--japandi-muted)", whiteSpace: "nowrap" }}>{new Date(dg.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
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
                                  <Icon name={isDone ? "square-check" : "square"} size={10} stroke={isDone ? 2 : 1.5} color={isDone ? "#3ac69b" : "var(--japandi-muted)"} />
                                </span>
                                <span onClick={() => navigateToTask(t.id)} style={{ color: isDone ? "var(--japandi-muted)" : "var(--japandi-text)", textDecoration: isDone ? "line-through" : "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                  <ExternalLink size={8} color="var(--japandi-muted)" style={{ opacity: 0.3, flexShrink: 0 }} />
                                </span>
                                {t.priority && <span style={{ fontSize: "8px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px", background: pc.bg, color: pc.text, flexShrink: 0 }}>{t.priority}</span>}
                              </div>
                            );
                          })}
                          <span onClick={() => {
                            setGoalForm({ title: "", description: "", goal_type: "daily", parent_id: wk.id.toString(), due_date: "", assignee_id: "" });
                            setShowGoalForm(true);
                          }} style={{ fontSize: "9px", color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", display: "inline-block", marginTop: "4px" }}>
                            + Add Daily Step
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Unlinked tasks alert */}
            {unlinkedTasks.length > 0 && (
              <Card padding="p-4">
                <Inline gap="gap-2" items="items-center">
                  <Icon name="link" size={14} stroke={2} style={{ color: "var(--japandi-accent)" }} />
                  <p style={{ fontSize: "12.5px", color: "var(--japandi-muted)", margin: 0 }}>
                  {unlinkedTasks.length} task{unlinkedTasks.length === 1 ? " is" : "s are"} not connected to any milestone.{" "}
                  <span
                    onClick={() => navigate("/execute")}
                    style={{ color: "var(--japandi-accent)", cursor: "pointer", fontWeight: "700", textDecoration: "underline" }}
                    className="hover-underline"
                  >
                    Review on execution board →
                  </span>
                </p>
              </Inline>
            </Card>
            )}
          </>
        )}
      </Stack>

      {/* ─── New Goal Modal ───────────────────── */}
      {showGoalForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(5,5,4,0.75)", backdropFilter: "blur(18px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
        }}>
          <Card padding="p-6" style={{ width: "90%", maxWidth: "480px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "750", color: "var(--japandi-text)", margin: "0 0 20px", letterSpacing: "-0.015em", fontFamily: "'Clash Display', sans-serif" }}>Add Roadmap Item</h3>
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
                  style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "transparent", color: "var(--japandi-muted)", cursor: "pointer", fontWeight: "600" }}>
                  Cancel
                </button>
                <button type="submit" style={orangePill} className="orange-btn-hover">
                  Save Item
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ═══════════════ GOAL DETAIL DRAWER ═══════════════ */}
      {goalDetail && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw", background: "var(--ink)", borderLeft: "1px solid rgba(255,255,255,0.06)", zIndex: 1000, overflowY: "auto", padding: "24px", animation: "fadeSlide 0.2s ease-out", boxShadow: "-8px 0 40px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", padding: "2px 6px", borderRadius: "4px", background: "rgba(232,80,2,0.1)", color: "var(--japandi-accent)" }}>{goalDetail.goal.goal_type}</span>
                {goalDetail.goal.source_info && renderSourceBadge(goalDetail.goal)}
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "750", color: "var(--japandi-text)", margin: 0, fontFamily: "'Clash Display', sans-serif" }}>{goalDetail.goal.title}</h2>
            </div>
            <button onClick={closeGoalDetail} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--japandi-muted)", padding: "4px" }}>
              <Icon name="x" size={18} />
            </button>
          </div>

          {goalDetail.goal.description && (
            <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", fontSize: "12px", color: "var(--japandi-text)", marginBottom: "16px" }}>{goalDetail.goal.description}</div>
          )}

          {goalDetail.goal.at_risk && goalDetail.goal.risk_reason && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "11px", color: "#ef4444", fontWeight: "500", marginBottom: "16px" }}>
              <AlertTriangle size={14} /> {goalDetail.goal.risk_reason}
            </div>
          )}

          {renderProgressBar(goalDetail.goal, { showTasks: true })}

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>Status</h3>
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
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>Source Meeting</h3>
              <Card padding="p-3" style={{ fontSize: "12px", color: "var(--japandi-text)" }}>
                {goalDetail.source_meeting.title} &mdash; {goalDetail.source_meeting.date}
              </Card>
            </div>
          )}

          {goalDetail.tasks.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>
                Linked Tasks ({goalDetail.tasks.filter(t => t.status !== "Done").length} active / {goalDetail.tasks.length} total)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.tasks.map(t => (
                  <div key={t.id} onClick={() => navigateToTask(t.id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontSize: "11px", color: "var(--japandi-text)" }}>
                    <span onClick={(e) => { e.stopPropagation(); handleToggleTask(t); }} style={{ cursor: "pointer", display: "flex" }}>
                      <Icon name={t.status === "Done" ? "square-check" : "square"} size={10} color={t.status === "Done" ? "#3ac69b" : "var(--japandi-muted)"} />
                    </span>
                    <span style={{ flex: 1, textDecoration: t.status === "Done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                    <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: PRIORITY_COLORS[t.priority]?.bg || "transparent", color: PRIORITY_COLORS[t.priority]?.text || "var(--japandi-muted)" }}>{t.priority}</span>
                    <ExternalLink size={9} color="var(--japandi-muted)" style={{ opacity: 0.3 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.decisions.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>Linked Decisions ({goalDetail.decisions.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.decisions.map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", fontSize: "11px", color: "var(--japandi-text)" }}>
                    <span style={{ fontSize: "12px" }}>💡</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.decision?.substring(0, 100) || d.title || "Decision"}</span>
                    {d.confidence_score && <span style={{ fontSize: "9px", color: d.confidence_score >= 80 ? "var(--japandi-green)" : "var(--japandi-muted)" }}>{Math.round(d.confidence_score)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.sub_goals.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>Sub-Goals ({goalDetail.sub_goals.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.sub_goals.map(sg => (
                  <div key={sg.id} onClick={() => fetchGoalDetail(sg.id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontSize: "11px", color: "var(--japandi-text)" }}>
                    <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase", padding: "1px 4px", borderRadius: "3px", background: "rgba(83,161,245,0.1)", color: "#53a1f5", flexShrink: 0 }}>{sg.goal_type}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sg.title}</span>
                    <span style={{ fontSize: "9px", color: "var(--japandi-muted)" }}>{sg.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalDetail.recent_activity.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--japandi-text)", marginBottom: "8px" }}>Recent Activity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {goalDetail.recent_activity.slice(0, 10).map(a => (
                  <div key={`${a.type}-${a.id}`} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "10px", color: "var(--japandi-muted)" }}>
                    <span>{a.type === "task" ? "📋" : "💡"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ color: a.status === "Done" ? "var(--japandi-green)" : "var(--japandi-muted)" }}>{a.status}</span>
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
