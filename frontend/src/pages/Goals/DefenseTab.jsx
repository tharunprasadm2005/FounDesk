import { useState, useCallback, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { Icon, orangePill } from "./GoalsConstants";
import HeroNumber from "../../components/ui/HeroNumber";
import { Stack, Grid, Inline, Card } from "../../components/layout";

export default function DefenseTab({ activeTab }) {
  const toast = useToast();

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
      toast("Working hours saved.", "success");
    } catch { toast("Failed to save working hours.", "error"); }
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
    } catch { toast("Failed to move meeting.", "error"); }
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
    } catch { toast("Failed to dismiss.", "error"); }
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

  return (
    <Stack gap="gap-4" className="fade-in">
      {defenseLoading ? (
        <Card padding="p-8" className="text-center">
          <p className="text-sm text-[var(--stone-400)] m-0">Analyzing schedule defense configurations...</p>
        </Card>
      ) : (
        <>
          {/* Calendar connection banner */}
          <Card padding="p-6">
            <Inline justify="justify-between" items="items-center">
              <Inline gap="gap-3" items="items-center">
                <Icon name="calendar" size={14} style={{ color: "var(--muted-gold)" }} />
                <Stack gap="gap-0.5">
                  <span className="text-sm font-semibold text-[var(--sumi-900)]">Google Calendar</span>
                <span className={`badge ${calendarConnected ? 'badge-positive' : 'badge-warning'}`} style={{ marginLeft: "12px" }}>
                  {calendarConnected ? "Connected" : "Not connected"}
                </span>
                </Stack>
              </Inline>
              {!calendarConnected && (
                <span className="text-xs font-semibold text-[var(--stone-400)]">
                  Connect in Settings → Integrations
                </span>
              )}
            </Inline>
          </Card>

          {/* Two-column layout: Left=Config, Right=Stats+Timeline */}
          <Grid cols="grid-cols-1 md:grid-cols-2" gap="gap-6">

            {/* Left: Rules & Configuration */}
            <Stack gap="gap-6">
              <Card padding="p-6">
                <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block mb-3">Working Hours</span>
                <Inline gap="gap-3" items="items-end">
                  <Stack gap="gap-1" className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--stone-400)] block">Start</label>
                    <input type="time" className="plan-input" value={`${String(wsCalendarRules.start_hour).padStart(2, "0")}:00`}
                      onChange={(e) => setWsCalendarRules(p => ({ ...p, start_hour: parseInt(e.target.value.split(":")[0]) }))}
                      style={{ width: "100%" }} />
                  </Stack>
                  <Stack gap="gap-1" className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--stone-400)] block">End</label>
                    <input type="time" className="plan-input" value={`${String(wsCalendarRules.end_hour).padStart(2, "0")}:00`}
                      onChange={(e) => setWsCalendarRules(p => ({ ...p, end_hour: parseInt(e.target.value.split(":")[0]) }))}
                      style={{ width: "100%" }} />
                  </Stack>
                  <button onClick={handleSaveHours} disabled={savingHours}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "var(--japandi-accent)", color: "var(--washi-white)", fontWeight: "700", cursor: "pointer", fontSize: "11px" }}>
                    {savingHours ? "Saving..." : "Save"}
                  </button>
                </Inline>
              </Card>

              <Card padding="p-6">
                <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block mb-3">Active Shields ({rulesData.rules?.length || 0})</span>
                <Stack gap="gap-2">
                  {rulesData.rules?.length > 0 ? rulesData.rules.map((r, i) => (
                    <Inline key={i} gap="gap-2" items="items-center" className="p-2 rounded-lg bg-[rgba(255,255,255,0.01)]">
                      <Icon name="shield" size={13} stroke={2} style={{ color: "var(--japandi-accent)" }} />
                      <span className="text-xs font-semibold text-[var(--japandi-text)]">{r.label}</span>
                    </Inline>
                  )) : (
                    <p className="text-xs text-[var(--stone-400)] m-0">No shields active. Set working hours and connect a calendar.</p>
                  )}
                </Stack>
              </Card>
            </Stack>

            {/* Right: Stats + Day Timeline */}
            <Stack gap="gap-6">
              {/* Stats cards */}
              <Grid cols="grid-cols-2">
                <Card padding="p-6">
                  <Stack gap="gap-1">
                    <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block">Protected / day</span>
                    <HeroNumber
                      value={`${wsCalendarRules.end_hour - wsCalendarRules.start_hour}h`}
                      variant="neutral"
                    />
                    <span className="text-xs text-[var(--stone-400)]">Shielded time slot</span>
                  </Stack>
                </Card>
                <Card padding="p-6">
                  <Stack gap="gap-1">
                    <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block">Conflicts</span>
                    <HeroNumber
                      value={rulesData.suggestions?.length || 0}
                      variant={rulesData.suggestions?.length > 0 ? "warning" : "positive"}
                    />
                    <span className="text-xs text-[var(--stone-400)]">Overlapping meetings</span>
                  </Stack>
                </Card>
              </Grid>

              {/* Visual Day Timeline */}
              <Card padding="p-6" className="flex-1 flex flex-col">
                <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block mb-4">Today's Schedule</span>
                <Stack gap="gap-1" className="flex-1">
                  {Array.from({ length: 14 }, (_, i) => {
                    const hour = i + 7; // 7:00 - 20:00
                    const isProtected = hour >= wsCalendarRules.start_hour && hour < wsCalendarRules.end_hour;
                    const hasMeeting = rulesData.suggestions?.some(s => {
                      const st = s.start_time ? new Date(s.start_time).getHours() : -1;
                      return st === hour;
                    });
                    return (
                      <Inline key={hour} gap="gap-2" items="items-center" className={hour < 8 || hour > 19 ? "opacity-30" : ""}>
                        <span className="text-[8.5px] font-bold text-[var(--stone-400)] w-6 text-right shrink-0">
                          {hour}:00
                        </span>
                        <div style={{
                          flex: 1, height: "10px", borderRadius: "3px",
                          backgroundColor: hasMeeting ? "rgba(232,67,79,0.12)" : isProtected ? "rgba(62,207,142,0.12)" : "rgba(255,255,255,0.02)",
                          position: "relative"
                        }}>
                          {(hasMeeting || isProtected) && (
                            <div style={{
                              height: "100%", borderRadius: "2px", width: "100%",
                              background: hasMeeting
                                ? "linear-gradient(90deg, var(--japandi-red), transparent)"
                                : "linear-gradient(90deg, var(--japandi-green), transparent)"
                            }} />
                          )}
                        </div>
                      </Inline>
                    );
                  })}
                </Stack>
                <Inline gap="gap-3" className="mt-4 text-[9px] text-[var(--stone-400)]">
                  <span><span style={{ color: "var(--japandi-green)", marginRight: "4px" }}>■</span> Protected</span>
                  <span><span style={{ color: "var(--japandi-red)", marginRight: "4px" }}>■</span> Meeting</span>
                  <span><span style={{ color: "rgba(255, 255, 255, 0.05)", marginRight: "4px" }}>■</span> Available</span>
                </Inline>
              </Card>
            </Stack>
          </Grid>

          {/* Suggestions section */}
          <Card padding="p-6">
            <span className="text-xs font-mono text-[var(--stone-400)] uppercase tracking-widest block mb-4">
              Move Suggestions {rulesData.suggestions?.length > 0 ? `(${rulesData.suggestions.length})` : ""}
            </span>
            {rulesData.suggestions?.length > 0 ? (
              <Stack gap="gap-3">
                {rulesData.suggestions.map((s, i) => (
                  <Inline key={i} justify="justify-between" items="items-center" className="p-4 bg-[rgba(232,80,2,0.03)] rounded-xl">
                    <Stack gap="gap-1" className="flex-1">
                      <span className="text-[13.5px] font-bold text-[var(--sumi-900)]">
                        📅 {s.meeting_title}
                      </span>
                      <Inline gap="gap-3" className="text-[11px] text-[var(--stone-400)] flex-wrap">
                        {s.start_time && <span>Cur: {formatTime(s.start_time)}–{formatTime(s.end_time)} ({calcDuration(s.start_time, s.end_time)})</span>}
                        {s.action && <span className="font-semibold text-[var(--japandi-accent)]">→ {s.action}</span>}
                      </Inline>
                    </Stack>
                    <Inline gap="gap-3" className="shrink-0">
                      <button onClick={() => handleApproveSuggestion(s)}
                        style={{ fontSize: "11.5px", color: "var(--washi-white)", background: "var(--japandi-accent)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none" }}>
                        Approve Move
                      </button>
                      <button onClick={() => handleDismissSuggestion(s)}
                        style={{ fontSize: "11.5px", color: "var(--stone-400)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                        Dismiss
                      </button>
                    </Inline>
                  </Inline>
                ))}
              </Stack>
            ) : (
              <Stack gap="gap-1" items="items-center" className="py-6 text-center">
                <p className="text-[13px] text-[var(--stone-400)] m-0">
                  No meeting alerts or overlaps today.
                </p>
                <p className="text-[11px] text-[var(--stone-400)] m-0">
                  All scheduled events respect your protected hours.
                </p>
              </Stack>
            )}
          </Card>
        </>
      )}
    </Stack>
  );
}
