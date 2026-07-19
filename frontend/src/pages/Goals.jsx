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

  const fetchGoals = useCallback(async () => {
    try {
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
    <div style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeSlide 0.35s ease-out; }
        .orange-btn-hover:hover { transform: translateY(-1.5px); }
        .orange-btn-hover:active { transform: translateY(0); }
        .select-custom { outline: none; font-family: inherit; }
        .select-custom:hover { border-color: transparent !important;!important; background-color: rgba(255, 255, 255, 0.05) !important; }
        .goal-checkbox:hover { color: var(--ember) !important; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--white)", margin: "0 0 2px", fontFamily: "'Clash Display', sans-serif" }}>Plan</h1>
          <p style={{ fontSize: "12.5px", color: "var(--light-gray)", margin: 0 }}>Map your startup roadmap and defend operational focus.</p>
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
          onGoalsChange={fetchGoals}
        />
      )}

      {activeTab === "defense" && <DefenseTab />}
      {activeTab === "phase" && <PhaseTab goals={goals} />}
      {activeTab === "followups" && <FollowUpsTab />}
    </div>
  );
}
