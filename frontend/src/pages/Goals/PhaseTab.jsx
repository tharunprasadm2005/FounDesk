import { useState, useCallback, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { PHASE_LABELS, renderProgressBar } from "./GoalsConstants";
import { Stack, Inline, Card } from "../../components/layout";

export default function PhaseTab({ goals }) {
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [applyingPhase, setApplyingPhase] = useState(false);
  const [phaseDetail, setPhaseDetail] = useState(null);
  const [phaseDetailLoading, setPhaseDetailLoading] = useState(false);
  const [completedItems, setCompletedItems] = useState(new Set());

  const fetchTemplates = useCallback(async () => {
    try {
      const [tRes, wsRes] = await Promise.all([api.get("/api/templates"), api.get("/api/workspaces")]);
      setTemplates(tRes.data);
      if (wsRes.data?.length > 0) setWorkspace(wsRes.data[0]);
    } catch (err) { console.error("[Goals] Failed to fetch templates:", err); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleApplyPhase = async (name) => {
    try {
      setApplyingPhase(true);
      await api.post("/api/workspaces/apply-template", { template_name: name });
      fetchTemplates();
    } catch { toast("Failed to apply phase.", "error"); }
    finally { setApplyingPhase(false); }
  };

  useEffect(() => {
    const active = templates.find(t => t.is_active);
    if (active) {
      handleSelectPhase(active.name);
    }
  }, [templates]);

  const handleSelectPhase = async (name) => {
    try {
      setPhaseDetailLoading(true);
      setPhaseDetail(null);
      const res = await api.get(`/api/phase/${name}`);
      setPhaseDetail(res.data);
    } catch (err) { console.error("[Goals] Failed to select phase:", err); } finally { setPhaseDetailLoading(false); }
  };

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
      toast("Task created.", "success");
    } catch { toast("Failed to create task.", "error"); }
  };

  return (
    <Stack gap="gap-6" className="fade-in">
      <Card padding="p-6">
        {workspace ? (
          <Stack gap="gap-6">
            <Inline justify="justify-between" items="items-center">
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--japandi-text)", margin: 0, fontFamily: "'Clash Display', sans-serif" }}>
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
            </Inline>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", margin: "32px 0 40px", padding: "0 10px" }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px", background: "rgba(255,255,255,0.03)", zIndex: 1, transform: "translateY(-50%)" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, width: `${(Math.max(0, ["think", "build", "launch", "scale"].indexOf((workspace.active_phase || "build").toLowerCase())) / 3) * 100}%`, height: "2px", background: "var(--japandi-accent)", zIndex: 1, transform: "translateY(-50%)", transition: "width 0.5s ease" }} />

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
                      background: isActive ? "var(--ink)" : isCompleted ? "var(--japandi-surface)" : "var(--ink)",
                      border: isActive ? "2px solid var(--japandi-accent)" : isCompleted ? "1px solid var(--japandi-border)" : "1px solid var(--japandi-border)",
                      boxShadow: isActive ? "0 0 12px rgba(232, 80, 2, 0.2)" : "none",
                      color: isActive ? "var(--japandi-accent)" : isCompleted ? "var(--japandi-text)" : "var(--japandi-muted)",
                      fontWeight: "750", fontSize: "11px", transition: "all 0.3s"
                    }}>
                      {isCompleted ? "\u2713" : idx + 1}
                    </div>
                    <span style={{
                      marginTop: "8px", fontSize: "11.5px", fontWeight: isActive ? "750" : "500",
                      color: isActive ? "var(--japandi-text)" : "var(--japandi-muted)",
                      fontFamily: isActive ? "'Clash Display', sans-serif" : "inherit"
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {goals.length > 0 ? (
              <Stack gap="gap-3" className="border-t border-[var(--stone-200)] pt-5">
                <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block">
                  Phase Goals ({goals.filter(g => g.goal_type === "monthly").length} milestones, {goals.filter(g => g.goal_type === "weekly").length} sub-goals)
                </span>
                {goals.filter(g => g.goal_type === "monthly").map(goal => (
                  <Stack key={goal.id} gap="gap-2" className="py-3 border-b border-[var(--stone-200)] last:border-b-0">
                    <h5 className="text-sm font-heading font-bold text-[var(--sumi-900)] m-0">
                      📅 {goal.title}
                    </h5>
                    {goal.description && (
                      <p className="text-xs text-[var(--stone-400)] m-0 leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                    <Inline gap="gap-3" className="text-[11px] text-[var(--stone-400)]">
                      <span>Status: <strong className="text-[var(--sumi-900)] capitalize">{goal.status}</strong></span>
                      {goal.progress !== undefined && goal.progress !== null && (
                        <span>Progress: <strong className="text-[var(--japandi-accent)]">{goal.progress}%</strong></span>
                      )}
                    </Inline>
                    {(goals.filter(g => g.goal_type === "weekly" && g.parent_id === goal.id)).length > 0 && (
                      <Stack gap="gap-2" className="mt-2 pl-3">
                        {goals.filter(g => g.goal_type === "weekly" && g.parent_id === goal.id).map(wg => (
                          <Stack key={wg.id} gap="gap-0.5">
                            <span className="text-xs font-bold text-[var(--sumi-900)]">
                              📋 {wg.title}
                            </span>
                            <span className="text-[10px] text-[var(--stone-400)]">
                              Status: <strong className="capitalize text-[var(--sumi-900)]">{wg.status}</strong>
                            </span>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: 0, textAlign: "center" }}>
                No goals defined for the current phase yet. Your active phase is <strong>{PHASE_LABELS[workspace.active_phase] || (workspace.active_phase || "Build").replace(/_/g, " ")}</strong>.
              </p>
            )}
            )}
          </Stack>
        ) : (
          <p className="text-[13px] text-[var(--stone-400)] m-0 text-center">
            Loading workspace phase data...
          </p>
        )}
      </Card>
    </Stack>
  );
}
