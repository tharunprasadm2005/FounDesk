import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, ListChecks, Calendar, AlertTriangle, HelpCircle,
  FileText, Plug, Activity, ArrowRight,
} from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";
import Gauge from "../components/ui/gauge";
import HeroNumber from "../components/ui/HeroNumber";

const ICON_MAP = {
  target: Target,
  "list-check": ListChecks,
  calendar: Calendar,
  "alert-triangle": AlertTriangle,
  "help-circle": HelpCircle,
  notes: FileText,
  plug: Plug,
  activity: Activity,
  "calendar-event": Calendar,
  "arrow-right": ArrowRight,
};

function Icon({ name, size = 18, stroke: strokeWidth = 1.5 }) {
  const LucideIcon = ICON_MAP[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

// Custom Interactive SVG Line/Area Chart Component
function ProductivityChart({ dataPoints = [4, 7, 5, 11, 8, 14, 9], labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const width = 500;
  const height = 140;
  const padding = 20;

  const maxVal = Math.max(...dataPoints, 12);
  const minVal = 0;

  const points = dataPoints.map((val, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (dataPoints.length - 1);
    const y = height - padding - ((val - minVal) * (height - padding * 2)) / (maxVal - minVal);
    return { x, y, value: val, label: labels[idx] };
  });

  // Calculate smooth cubic bezier path
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Path for gradient area under the curve
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find closest point by X coordinate
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
    setMousePos({ x: points[closestIdx].x, y: points[closestIdx].y });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--ember)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Gradient fill */}
        {areaD && <path d={areaD} fill="url(#chartGradient)" />}

        {/* Clean curve line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--ember-light)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {points.map((pt, idx) => (
          <g key={idx}>
            {/* Draw smaller outline points */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === idx ? 5 : 3.5}
              fill="var(--surface-2)"
              stroke="var(--ember-light)"
              strokeWidth="2"
              style={{ transition: "r 0.15s" }}
            />
          </g>
        ))}

        {/* Active tracking vertical line */}
        {hoveredIdx !== null && (
          <line
            x1={mousePos.x}
            y1={padding}
            x2={mousePos.x}
            y2={height - padding}
            stroke="rgba(232,80,2,0.2)"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Floating glassmorphic tooltip */}
      {hoveredIdx !== null && (
        <div style={{
          position: "absolute",
          left: `${(mousePos.x / width) * 100}%`,
          top: `${(mousePos.y / height) * 100 - 32}%`,
          transform: "translate(-50%, -100%)",
          backgroundColor: "rgba(22, 22, 20, 0.9)",
          border: "none",
          borderRadius: "8px",
          padding: "6px 10px",
          color: "var(--white)",
          fontSize: "11px",
          fontWeight: "700",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
          zIndex: 10,
          fontFamily: "'Satoshi', sans-serif"
        }}>
          <span style={{ color: "var(--light-gray)", fontWeight: "500", marginRight: "6px" }}>{points[hoveredIdx].label}:</span>
          {points[hoveredIdx].value} {points[hoveredIdx].value === 1 ? 'task' : 'tasks'}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (isInitial = false, signal) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const dashRes = await api.get("/api/dashboard", { signal });
      if (signal?.aborted) return;
      setData(dashRes.data);
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.name !== "AbortError") {
        console.error("Dashboard fetch error:", err);
      }
    } finally {
      if (isInitial && !signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    track("dashboard_viewed");
    const abortController = new AbortController();
    fetchDashboard(true, abortController.signal);
    const interval = setInterval(() => fetchDashboard(false, abortController.signal), 60000);
    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, [fetchDashboard]);

  // Compute active task count priority breakdown
  const activeTasks = data?.signal_board?.active_task_count || 0;
  const p0Count = data?.signal_board?.p0_count || 0;
  const p1Count = data?.signal_board?.p1_count || 0;
  const p2Count = Math.max(0, activeTasks - p0Count - p1Count);

  const totalBreakdown = p0Count + p1Count + p2Count;
  const p0Percent = totalBreakdown > 0 ? (p0Count / totalBreakdown) * 100 : 0;
  const p1Percent = totalBreakdown > 0 ? (p1Count / totalBreakdown) * 100 : 0;
  const p2Percent = totalBreakdown > 0 ? (p2Count / totalBreakdown) * 100 : 0;

  const cs = data?.command_strip || {};
  const sb = data?.signal_board || {};
  const side = data?.sidebar || {};

  const formatTime = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  const isP0orP1 = (t) => t.priority === "P0" || t.priority === "P1";
  const topTaskCount = cs.top_tasks?.filter(isP0orP1).length || 0;
  const hasConflicts = cs.calendar_conflicts?.length > 0;

  const digestEntries = Object.entries(side.integration_digest || {});
  const maxDigestShow = 4;

  // Active goal progress compute
  const goalProgress = cs.active_goal?.progress || 0;

  const completedDataPoints = sb.completion_data_points && sb.completion_data_points.length === 7
    ? sb.completion_data_points
    : [0, 0, 0, 0, 0, 0, 0];
  const totalCompletedThisWeek = sb.completed_this_week ?? completedDataPoints.reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div style={{ padding: "80px 0", textAlign: "center" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div className="relative flex items-center justify-center" style={{ width: "40px", height: "40px" }}>
            <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "36px", fontWeight: "950", color: "var(--brand-orange)", lineHeight: 1, letterSpacing: "-0.04em" }}>F</span>
            <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: "36px", fontWeight: "950", color: "transparent", WebkitTextStroke: "1.5px var(--brand-orange)", lineHeight: 1, marginLeft: "1.5px" }}>d</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--gray)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1.5px", textTransform: "uppercase" }} className="animate-pulse">
            Synchronizing dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-zone" style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Satoshi', sans-serif" }}>

      {/* Welcome Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--white)", margin: "0 0 4px", letterSpacing: "-0.02em", fontFamily: "'Clash Display', sans-serif" }}>
            Welcome back, {user?.name?.split(" ")[0] || "Founder"}
          </h1>
          <p style={{ fontSize: "11px", color: "var(--graphite)", margin: 0, fontWeight: "500", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento">

        {/* 1. Active Goal (gauge) */}
        <div className="hybrid c-goal">
          <p className="card-label" style={{ fontSize: "11px", color: "var(--graphite)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="target" size={13} stroke={2} /> Active Goal
          </p>
          <div className="goal-title">
            {cs.active_goal?.title ? cs.active_goal.title : (
              <div style={{ fontSize: "13.5px", color: "var(--graphite)", fontWeight: "500" }}>
                No active milestone.{" "}
                <span onClick={() => navigate("/plan")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700" }}>
                  Set first goal →
                </span>
              </div>
            )}
          </div>
          <div className="gauge-wrap">
            <div className="gauge-inset">
              <Gauge value={goalProgress} size="L" />
            </div>
          </div>
        </div>

        {/* 2. Focus Checklist */}
        <div className="card-glass c-checklist">
          <p className="card-label" style={{ fontSize: "11px", color: "var(--graphite)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="list-check" size={13} stroke={2} /> Focus Checklist
          </p>
          {topTaskCount > 0 ? (
            <>
              <h2 style={{ fontSize: "26px", fontWeight: "900", color: "var(--white)", margin: "0 0 4px", fontFamily: "'Clash Display', sans-serif" }}>
                {topTaskCount} <span style={{ fontSize: "12.5px", color: "var(--graphite)", fontWeight: "500", fontFamily: "inherit" }}>{topTaskCount === 1 ? 'P0/P1 item' : 'P0/P1 items'} today</span>
              </h2>
              <span onClick={() => navigate("/execute")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700", fontSize: "11px" }}>
                Open tasks workspace →
              </span>
            </>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>
              Nothing marked P0/P1 today.{" "}
              <span onClick={() => navigate("/execute")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700" }}>
                Open tasks workspace →
              </span>
            </p>
          )}
        </div>

        {/* 3. Schedule Defense */}
        <div className="card-glass c-schedule">
          <p className="card-label" style={{ fontSize: "11px", color: "var(--graphite)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="calendar" size={13} stroke={2} /> Schedule Defense
          </p>
          <HeroNumber
            as="div"
            value={hasConflicts ? cs.calendar_conflicts.length : 0}
            variant={hasConflicts ? "warning" : "positive"}
          />
          <div className="card-hero-support">
            {hasConflicts ? (cs.calendar_conflicts.length === 1 ? 'Conflict detected' : 'Conflicts detected') : 'No conflicts today'}
          </div>
        </div>

        {/* 4. Workload Tracker */}
        <div className="hybrid c-workload">
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p className="card-label" style={{ fontSize: "11px", color: "var(--graphite)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icon name="activity" size={13} stroke={2} /> Workload
              </p>
              <HeroNumber
                as="div"
                value={activeTasks}
                variant="neutral"
              />
              <div className="card-hero-support">
                {activeTasks === 1 ? 'Active task' : 'Active tasks'} in queue
              </div>
            </div>

            {/* Priority breakdown bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "8px 0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--sand)", fontWeight: "500" }}>
                  <span style={{ color: "var(--graphite)" }}>P0 Priority</span>
                  <span>{p0Count} {p0Count === 1 ? 'task' : 'tasks'}</span>
                </div>
                <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(138, 138, 143, 0.12)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${p0Percent}%`, height: "100%", backgroundColor: "var(--ember)", borderRadius: "2px", transition: "width 0.5s ease" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--sand)", fontWeight: "500" }}>
                  <span style={{ color: "var(--graphite)" }}>P1 High</span>
                  <span>{p1Count} {p1Count === 1 ? 'task' : 'tasks'}</span>
                </div>
                <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(138, 138, 143, 0.12)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${p1Percent}%`, height: "100%", backgroundColor: "var(--ember)", borderRadius: "2px", transition: "width 0.5s ease" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--sand)", fontWeight: "500" }}>
                  <span style={{ color: "var(--graphite)" }}>P2 Normal</span>
                  <span>{p2Count} {p2Count === 1 ? 'task' : 'tasks'}</span>
                </div>
                <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(138, 138, 143, 0.12)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${p2Percent}%`, height: "100%", backgroundColor: "var(--ember)", borderRadius: "2px", transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>

            <span onClick={() => navigate("/execute")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700", fontSize: "11px", display: "inline-block", marginTop: "4px" }}>
              Manage queue →
            </span>
          </div>
        </div>

        {/* 5. Velocity Trend */}
        <div className="card-glass c-velocity">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
            <div>
              <p className="card-label" style={{ fontSize: "11px", color: "var(--graphite)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icon name="activity" size={14} stroke={2} /> Velocity Trend
              </p>
              <HeroNumber
                as="div"
                value={totalCompletedThisWeek}
                variant="positive"
              />
              <div className="card-hero-support">
                Completed tasks this week
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--graphite)", fontWeight: "600", backgroundColor: "rgba(255,255,255,0.02)", padding: "4px 10px", borderRadius: "8px", border: "none", fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--brand-orange)" }} />
              <span>Last 7 Days</span>
            </div>
          </div>
          <ProductivityChart dataPoints={completedDataPoints} />
        </div>

        {/* 6. Active Blockers */}
        <div className={`card-glass c-blockers ${sb.blockers?.length > 0 ? "blocker-warn" : ""}`}>
          <p className="card-label" style={{ fontSize: "11.5px", color: sb.blockers?.length > 0 ? "var(--warning)" : "var(--graphite)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            <Icon name="alert-triangle" size={14} stroke={2} /> Active Blockers
          </p>
          {sb.blockers?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "130px", overflowY: "auto" }}>
              {sb.blockers.map((b, i) => (
                <div key={b.task_id || i}>
                  <p style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--sand)", margin: "0 0 4px" }}>
                    {b.title}
                  </p>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "11px", color: "var(--graphite)" }}>
                    <span>{b.hours_blocked ? `Blocked for ${b.hours_blocked}h` : "Blocking project"}</span>
                    {b.source_label && (
                      <span style={{ background: "rgba(255,255,255,0.03)", padding: "1px 6px", borderRadius: "4px", fontSize: "9.5px", color: "var(--graphite)" }}>
                        {b.source_label}
                      </span>
                    )}
                    <span>·</span>
                    <span onClick={() => navigate(`/execute?task=${b.task_id}`)} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700" }}>
                      Unblock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>Nothing halting workflows right now.</p>
          )}
        </div>

        {/* 7. Meetings Timeline */}
        <div className="card-glass c-meetings">
          <p className="card-label" style={{ fontSize: "11.5px", color: "var(--graphite)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            <Icon name="calendar-event" size={14} stroke={2} /> Meetings Timeline
          </p>
          {side.todays_meetings?.length > 0 || cs.calendar_conflicts?.length > 0 ? (
            <div className="card-list-scroll" style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "115px" }}>
              {cs.calendar_conflicts?.map((ev, i) => (
                <div key={`cal-${i}`} style={{ background: "rgba(255,255,255,0.01)", border: "none", borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--sand)", margin: "0 0 3px" }}>
                    {ev.title}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--graphite)", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    Time: {formatTime(ev.start) || ev.start} {side.todays_meetings?.some(m => m.title === ev.title) ? "· Prep notes attached" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>No calendar events today.</p>
          )}
        </div>

        {/* 8. Recent Decisions */}
        <div className="card-glass c-decisions">
          <p className="card-label" style={{ fontSize: "11.5px", color: "var(--graphite)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            <Icon name="notes" size={14} stroke={2} /> Recent Decisions
          </p>
          {side.recent_decisions?.length > 0 ? (
            <div className="card-list-scroll" style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "115px" }}>
              {side.recent_decisions.map((d) => (
                <div key={d.id}>
                  <p style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--sand)", margin: "0 0 2px" }}>
                    {d.decision.length > 80 ? d.decision.slice(0, 80) + "..." : d.decision}
                  </p>
                  <span style={{ fontSize: "10px", color: "var(--graphite)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {d.created_at ? (() => {
                      const diff = Math.floor((new Date() - new Date(d.created_at)) / (1000 * 60 * 60 * 24));
                      return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff} days ago`;
                    })() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>
              No active logs.{" "}
              <span onClick={() => navigate("/memory")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700" }}>
                Record a decision →
              </span>
            </p>
          )}
        </div>

        {/* 9. Inferred Decisions */}
        <div className="card-glass c-inferred">
          <p className="card-label" style={{ fontSize: "11.5px", color: "var(--graphite)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            <Icon name="help-circle" size={14} stroke={2} /> Inferred Decisions
          </p>
          {sb.inferred_decisions?.length > 0 ? (
            <div className="card-list-scroll" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "115px" }}>
              {sb.inferred_decisions.map((d, i) => (
                <div key={i} style={{ borderBottom: "none", paddingBottom: i < sb.inferred_decisions.length - 1 ? "10px" : 0 }}>
                  <p style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--sand)", margin: "0 0 4px", lineHeight: "1.4" }}>
                    {d.decision.length > 100 ? d.decision.slice(0, 100) + "..." : d.decision}
                  </p>
                  <p style={{ fontSize: "11.5px", color: "var(--graphite)", margin: "0 0 8px" }}>
                    {d.context?.length > 80 ? d.context.slice(0, 80) + "..." : d.context}
                  </p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span onClick={() => navigate(`/memory?decision=${encodeURIComponent(d.decision)}`)}
                      style={{ fontSize: "10.5px", color: "var(--void)", background: "var(--ember)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}>
                      Confirm log
                    </span>
                    <span onClick={() => navigate(`/memory?decision=${encodeURIComponent(d.decision)}`)}
                      style={{ fontSize: "10.5px", color: "var(--sand)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                      Edit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>All conversations synced. Nothing new to confirm.</p>
          )}
        </div>

        {/* 10. Integration Digest */}
        <div className="card-glass c-digest">
          <p className="card-label" style={{ fontSize: "11.5px", color: "var(--graphite)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            <Icon name="plug" size={14} stroke={2} /> Integration Digest · 24h
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "16px" }}>
            <HeroNumber
              as="div"
              value={digestEntries.length}
              variant="neutral"
            />
            <div className="card-hero-support">
              Connected {digestEntries.length === 1 ? 'source' : 'sources'} (24h digest)
            </div>
          </div>
          {digestEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ position: "relative" }}>
                <div className="card-list-scroll" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "100px" }}>
                  {digestEntries.map(([provider, count]) => (
                    <div key={provider} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--graphite)" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: "500" }}>{provider.replace(/_/g, " ")}</span>
                      <span style={{ color: "var(--sand)", fontWeight: "700", background: "rgba(255,255,255,0.03)", padding: "2px 8px", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  ))}
                </div>
                {digestEntries.length > 4 && (
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "20px",
                    background: "linear-gradient(to bottom, transparent, var(--ink))",
                    pointerEvents: "none"
                  }} />
                )}
              </div>
              {digestEntries.length > 4 && (
                <span style={{ fontSize: "10.5px", color: "var(--ember)", cursor: "pointer", marginTop: "4px", fontWeight: "700" }} onClick={() => navigate("/settings")}>
                  View more sources →
                </span>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--graphite)", margin: 0 }}>
              No activities logged.{" "}
              <span onClick={() => navigate("/settings")} style={{ color: "var(--ember)", cursor: "pointer", fontWeight: "700" }}>
                Connect sources →
              </span>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
