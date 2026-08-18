import { useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import { track } from "../utils/track";
import { Icon } from "./Goals/GoalsConstants";
import CascadeTab from "./Goals/CascadeTab";
import DefenseTab from "./Goals/DefenseTab";
import PhaseTab from "./Goals/PhaseTab";
import FollowUpsTab from "./Goals/FollowUpsTab";

const tabs = [
  { id: "cascade", label: "Goal Cascade", icon: "target" },
  { id: "defense", label: "Calendar Defense", icon: "shield" },
  { id: "phase", label: "Active Phase", icon: "rocket" },
  { id: "followups", label: "Follow-ups", icon: "phone" },
];

export default function Goals() {
  const [activeTab, setActiveTab] = useState("cascade");

  const [goals, setGoals] = useState([]);
  const [unlinkedTasks, setUnlinkedTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const [goalsRes, tasksRes, wsRes] = await Promise.all([
        api.get("/api/goals"),
        api.get("/api/tasks?flat=true"),
        api.get("/api/workspaces"),
      ]);
      setGoals(goalsRes.data?.items || goalsRes.data || []);
      const allTasks = tasksRes.data?.items || tasksRes.data || [];
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
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="fd-page">
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .select-custom { outline: none; font-family: inherit; }
      `}</style>

      <div className="fd-hero hero-plan" data-anchor="P">
        <div className="fd-hero-main">
          <div className="fd-hero-kicker">The roadmap</div>
          <h1 className="fd-hero-title">Plan</h1>
          <p className="fd-hero-sub">Map your startup roadmap and defend operational focus.</p>
        </div>
        <div className="fd-hero-side">
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{goalsLoading ? "—" : goals.length}</span>
            <span className="fd-hero-chip-label">Goals mapped</span>
          </div>
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{goalsLoading ? "—" : unlinkedTasks.length}</span>
            <span className="fd-hero-chip-label">Tasks unlinked</span>
          </div>
        </div>
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

      {activeTab === "cascade" && (
        <CascadeTab
          goals={goals}
          setGoals={setGoals}
          unlinkedTasks={unlinkedTasks}
          setUnlinkedTasks={setUnlinkedTasks}
          teamMembers={teamMembers}
          setTeamMembers={setTeamMembers}
          goalsLoading={goalsLoading}
          onGoalsChange={fetchGoals}
        />
      )}

      {activeTab === "defense" && <DefenseTab />}
      {activeTab === "phase" && <PhaseTab goals={goals} />}
      {activeTab === "followups" && <FollowUpsTab />}
    </div>
  );
}
