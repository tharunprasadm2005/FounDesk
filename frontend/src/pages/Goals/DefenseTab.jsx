import { useState, useCallback, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { Icon, orangePill } from "./GoalsConstants";
import HeroNumber from "../../components/ui/HeroNumber";

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
  );
}
