import { useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import { track } from "../utils/track";
import { Icon } from "./Goals/GoalsConstants";
import CascadeTab from "./Goals/CascadeTab";
import DefenseTab from "./Goals/DefenseTab";
import PhaseTab from "./Goals/PhaseTab";
import FollowUpsTab from "./Goals/FollowUpsTab";
import { Section, Stack, Inline } from "../components/layout";

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
      setGoals(goalsRes.data?.items || goalsRes.data || []);
      const allTasks = tasksRes.data?.items || tasksRes.data || [];
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
    <Section padding="p-0" className="max-w-7xl mx-auto w-full font-ui">
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeSlide 0.35s ease-out; }
      `}</style>

      <Inline justify="justify-between" items="items-center" className="mb-[64px]">
        <Stack gap="gap-[8px]">
          <h1 className="text-[32px] md:text-[40px] font-heading text-sumi-900 m-0">Plan</h1>
          <p className="text-[12px] font-mono text-stone-400 m-0 uppercase tracking-widest">Map your startup roadmap and defend operational focus.</p>
        </Stack>
      </Inline>

      <Inline gap="gap-[8px]" className="mb-[48px] p-[4px] bg-linen-100 rounded-[4px] border border-stone-200 w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`flex items-center gap-[8px] px-[16px] py-[8px] rounded-[2px] text-[13px] font-medium transition-colors cursor-pointer outline-none ${
              activeTab === t.id 
                ? "bg-washi-white text-sumi-900 shadow-sm border border-stone-200" 
                : "text-stone-400 hover:text-sumi-900 border border-transparent bg-transparent"
            }`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </Inline>

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
    </Section>
  );
}
