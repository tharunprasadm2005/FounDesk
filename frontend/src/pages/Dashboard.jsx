import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import api from "../utils/api";

const toneFor = (kind) => {
  switch (kind) {
    case "blocked":
    case "risk":
    case "follow":
      return "ember";
    case "decision":
      return "moss";
    default:
      return "ember";
  }
};

const iconFor = (kind, size = 14) => {
  switch (kind) {
    case "blocked":
      return <ShieldAlert size={size} strokeWidth={2} />;
    case "risk":
      return <AlertTriangle size={size} strokeWidth={2} />;
    case "follow":
      return <ArrowUpRight size={size} strokeWidth={2} />;
    case "decision":
      return <CheckCircle2 size={size} strokeWidth={2} />;
    default:
      return <Flag size={size} strokeWidth={2} />;
  }
};

const emptyCheck = /^\s*(No blockers|Nothing demanding|No (open )?risks)/i;

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(() => new Set());

  const fetchAll = async () => {
    const [meRes, dashRes, briefRes] = await Promise.all([
      api.get("/api/me").catch(() => null),
      api.get("/api/dashboard").catch(() => null),
      api.get("/api/briefing").catch(() => null),
    ]);
    if (meRes && meRes.data) setUser(meRes.data.user);
    if (dashRes && dashRes.data) setData(dashRes.data);
    if (briefRes && briefRes.data) setBriefing(briefRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAll();
  }, [navigate]);

  if (loading) {
    return (
      <div className="fd-dash" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg,#D6824F,#b8602c)",
              color: "#F8F5F2",
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 14px 34px rgba(214,130,79,.28)",
              animation: "fd-float 2.6s ease-in-out infinite",
            }}
          >
            f
          </div>
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 11,
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#4b4741",
            }}
          >
            Compiling your briefing
          </div>
          <div
            style={{
              width: 180,
              height: 2,
              borderRadius: 99,
              background: "rgba(214,130,79,.16)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "55%",
                borderRadius: 99,
                background: "linear-gradient(90deg,transparent,#D6824F,transparent)",
                animation: "fd-inkdraw 1.5s cubic-bezier(.4,0,.2,1) infinite",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const synthesis = briefing?.ai_synthesis || {};
  const schedule = briefing?.schedule || [];
  const providers = (briefing?.connected_providers || []).filter((p) => p && p !== "google");
  const summary = briefing?.summary || "";
  const focusPriorities = briefing?.focus_priorities || [];
  const aiWroteBrief = !!briefing?.ai_wrote_brief;
  const firstName = user?.name?.split(" ")[0] || "Founder";

  const fullDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const sb = data?.signal_board || {};
  const attention = data?.attention_digest || {};
  const sidebar = data?.sidebar || {};
  const activeGoal = data?.command_strip?.active_goal || null;
  const topTasks = data?.command_strip?.top_tasks || [];
  const blockers = sb.blockers || [];
  const overdueFollowups = sb.overdue_followups || [];
  const velocity = sb.completion_data_points || [];
  const integrationDigest = sidebar.integration_digest || {};

  const signals = [
    ...(synthesis.blocked_items || []).map((t) => ({ kind: "blocked", text: t })),
    ...blockers.map((b) => ({
      kind: "blocked",
      text: b.task_title || b.title || b.blocker_description || "Blocked item",
      meta: b.hours_blocked != null ? `Blocked ${b.hours_blocked}h` : b.source_label || "",
    })),
    ...(synthesis.upcoming_risks || []).map((t) => ({ kind: "risk", text: t })),
    ...(attention.goals_at_risk > 0 ? [{ kind: "risk", text: `${attention.goals_at_risk} milestone${attention.goals_at_risk > 1 ? "s" : ""} at risk` }] : []),
    ...(attention.tasks_overdue > 0 ? [{ kind: "risk", text: `${attention.tasks_overdue} overdue task${attention.tasks_overdue > 1 ? "s" : ""}` }] : []),
    ...(synthesis.follow_ups || []).map((t) => ({ kind: "follow", text: t })),
    ...overdueFollowups.map((f) => ({ kind: "follow", text: `Overdue: follow up with ${f.person_name}` })),
  ]
    .filter((s) => s && s.text && !emptyCheck.test(s.text))
    .slice(0, 8);

  const decisions = synthesis.recent_decisions || [];

  const stats = [
    {
      label: "Meetings today",
      num: schedule.length || "—",
      accent: "ember",
      icon: Calendar,
    },
    {
      label: "Active tasks",
      num: sb.active_task_count ?? "—",
      accent: "ember",
      icon: ListChecks,
    },
    {
      label: "Done this week",
      num: sb.completed_this_week ?? "—",
      accent: "moss",
      icon: TrendingUp,
    },
    {
      label: "Needs attention",
      num: attention.total ?? signals.length ?? 0,
      accent: "ember",
      icon: Flag,
    },
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const nowDate = new Date();
  const velocityLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowDate);
    d.setDate(nowDate.getDate() - (6 - i));
    return dayNames[d.getDay()];
  });
  const maxVel = Math.max(1, ...velocity);

  const digestEntries = Object.entries(integrationDigest)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxDigest = Math.max(1, ...digestEntries.map((d) => d.count));

  const attentionCells = [
    { label: "Goals at risk", num: attention.goals_at_risk, tone: "ember" },
    { label: "Overdue tasks", num: attention.tasks_overdue, tone: "ember" },
    { label: "Critical follow-ups", num: attention.follow_ups_critical, tone: "ember" },
    { label: "Old blockers", num: attention.blockers_old, tone: "ember" },
    { label: "Knowledge review", num: attention.knowledge_needs_review, tone: "moss" },
    { label: "Total flags", num: attention.total, tone: "moss" },
  ];

  const toggle = (i) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const refresh = async () => {
    setLoading(true);
    await fetchAll();
    setDone(new Set());
  };

  return (
    <div className="fd-dash">
      <div className="fd-ledger-grid">
        <div className="fd-ledger">
          {/* ── Ledger header ── */}
          <div className="fd-ledger-kicker">
            <span className="k-date">{fullDate}</span>
            <span aria-hidden="true">·</span>
            <span>Morning ledger</span>
          </div>
          <h1 className="fd-ledger-title">
            Good morning, <em>{firstName}.</em>
          </h1>

          {/* ── Slim stat strip ── */}
          <div className="fd-ledger-stats">
            {stats.map((s) => (
              <div className="fd-ledger-stat" data-accent={s.accent} key={s.label}>
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="fd-ledger-rule" />

          {/* ── 01 · Today's brief (AI-drafted) ── */}
          {summary && (
            <section className="fd-ledger-sec fd-ledger-brief">
              <div className="fd-ledger-sec-head">
                <span className="fd-ledger-sec-name">
                  <span className="sec-no">01</span> Today's brief
                </span>
                <span className="fd-ledger-sec-meta">{aiWroteBrief ? "AI drafted" : "compiled"}</span>
              </div>
              <p className="fd-ledger-body">{summary}</p>
              {focusPriorities.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  {focusPriorities.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        color: "#8F897F",
                        background: "rgba(214,130,79,0.08)",
                        border: "1px solid rgba(214,130,79,0.18)",
                        borderRadius: 99,
                        padding: "5px 12px",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
              {providers.length === 0 && (
                <div className="fd-ledger-empty">
                  <p className="fd-ledger-empty-text">
                    No tools are connected yet. Link Gmail, Calendar or GitHub to start compiling
                    your morning.
                  </p>
                  <Link to="/settings" className="fd-ledger-cta">
                    Connect your tools <ArrowRight size={13} strokeWidth={2.4} />
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* ── 02 · Priority signals (ink board) ── */}
          <section className={`fd-ledger-sec${signals.length > 0 ? " fd-ledger-ink" : ""}`}>
            <div className="fd-ledger-sec-head">
              <span className="fd-ledger-sec-name">
                <span className="sec-no">02</span> Priority signals
              </span>
              <span className="fd-ledger-sec-meta">{signals.length > 0 ? `${signals.length} flagged` : "all clear"}</span>
            </div>
            {signals.length === 0 ? (
              <div className="fd-ledger-empty">
                <p className="fd-ledger-empty-text" style={{ color: "#8F897F" }}>
                  The ledger is clear — nothing needs your attention.
                </p>
              </div>
            ) : (
              signals.map((s, i) => (
                <div className="fd-ledger-row" key={`sig-${i}`}>
                  <div className="fd-ledger-row-mark" data-tone={toneFor(s.kind)}>
                    {iconFor(s.kind)}
                  </div>
                  <div className="fd-ledger-row-main">
                    <div className="fd-ledger-row-title">{s.text}</div>
                    {s.meta && <div className="fd-ledger-row-meta">{s.meta}</div>}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* ── 03 · Active goal ── */}
          {activeGoal ? (
            <section className="fd-ledger-sec">
              <div className="fd-ledger-sec-head">
                <span className="fd-ledger-sec-name">
                  <span className="sec-no">03</span> Active goal
                </span>
                <span className="fd-ledger-goalpct">{activeGoal.goal_type}</span>
              </div>
              <div style={{ padding: "18px 0" }}>
                <div className="fd-ledger-row-title" style={{ fontSize: 17 }}>
                  {activeGoal.title}
                </div>
                {topTasks.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {topTasks.map((t, i) => (
                      <div className="fd-ledger-row" key={`task-${i}`}>
                        <div className="fd-ledger-row-mark" data-tone={t.priority === "P0" ? "ember" : "moss"}>
                          <Circle size={9} fill="currentColor" stroke="none" />
                        </div>
                        <div className="fd-ledger-row-main">
                          <div className="fd-ledger-row-title">{t.title}</div>
                          <div className="fd-ledger-row-meta">{t.priority} · {t.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="fd-ledger-sec">
              <div className="fd-ledger-sec-head">
                <span className="fd-ledger-sec-name">
                  <span className="sec-no">03</span> Active goal
                </span>
              </div>
              <div className="fd-ledger-empty">
                <p className="fd-ledger-empty-text">
                  No active goal yet. Set a weekly goal in Plan to give your mornings a target.
                </p>
                <Link to="/plan" className="fd-ledger-cta">
                  Set a goal <ArrowRight size={13} strokeWidth={2.4} />
                </Link>
              </div>
            </section>
          )}

          {/* ── 04 · Decision ledger ── */}
          <section className="fd-ledger-sec">
            <div className="fd-ledger-sec-head">
              <span className="fd-ledger-sec-name">
                <span className="sec-no">04</span> Decision ledger
              </span>
            </div>
            {decisions.length === 0 ? (
              <div className="fd-ledger-empty">
                <p className="fd-ledger-empty-text">
                  No decisions logged yet. Every decision you record becomes an asset.
                </p>
              </div>
            ) : (
              decisions.map((d, i) => (
                <div className="fd-ledger-row" key={`dec-${i}`}>
                  <div className="fd-ledger-row-mark" data-tone="moss">
                    {iconFor("decision")}
                  </div>
                  <div className="fd-ledger-row-main">
                    <div className="fd-ledger-row-title">{d}</div>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* ── 05 · Recommendations (real only) ── */}
          {(synthesis.today_recommendations || []).filter(Boolean).length > 0 && (
            <section className="fd-ledger-sec">
              <div className="fd-ledger-sec-head">
                <span className="fd-ledger-sec-name">
                  <span className="sec-no">05</span> Recommendations
                </span>
              </div>
              {(synthesis.today_recommendations || [])
                .filter(Boolean)
                .map((task, i) => (
                  <div
                    className={`fd-ledger-check${done.has(i) ? " is-done" : ""}`}
                    key={`rec-${i}`}
                    onClick={() => toggle(i)}
                    role="checkbox"
                    aria-checked={done.has(i)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
                  >
                    <div className="fd-ledger-check-box">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <span className="fd-ledger-check-text">{task}</span>
                  </div>
                ))}
            </section>
          )}

          <div className="fd-ledger-rule" />

          {/* ── Lean foot ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8F897F" }}>
              {providers.length > 0 ? `Connected · ${providers.join(" · ")}` : "No integrations connected"}
            </span>
            <button className="fd-ledger-refresh" onClick={refresh}>
              <RefreshCw size={13} strokeWidth={2} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Right rail ── */}
        <aside className="fd-ledger-rail">
          {/* Today's schedule */}
          <div className="fd-rail-card">
            <div className="fd-rail-title">
              Today
              <span className="fd-rail-meta">{schedule.length > 0 ? `${schedule.length} meetings` : "clear"}</span>
            </div>
            {schedule.length === 0 ? (
              <p className="fd-rail-empty">Nothing scheduled. The ledger is yours today.</p>
            ) : (
              <>
                {schedule.map((event, i) => {
                  const title = event.title || event.event || "Untitled";
                  const time = event.time || event.start || "";
                  const meta = event.type || (event.attendees ? event.attendees : "");
                  return (
                    <div className="fd-ledger-row" key={`evt-${i}`} style={{ padding: "11px 0" }}>
                      <div className="fd-ledger-row-time">{time}</div>
                      <div className="fd-ledger-row-main">
                        <div className="fd-ledger-row-title" style={{ fontSize: 13 }}>{title}</div>
                        {meta && <div className="fd-ledger-row-meta">{meta}</div>}
                        {event.meet_link && (
                          <a className="fd-ledger-row-link" href={event.meet_link} target="_blank" rel="noreferrer">
                            Join <ArrowUpRight size={12} strokeWidth={2.5} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Attention digest */}
          <div className="fd-rail-card">
            <div className="fd-rail-title">
              Needs attention
              <span className="fd-rail-meta">{attention.total ?? 0} flags</span>
            </div>
            <div className="fd-rail-rule" />
            <div className="fd-attention-grid">
              {attentionCells.map((c) => (
                <div className="fd-attention-cell" data-tone={c.tone} key={c.label}>
                  <div className="fd-attention-num">{c.num ?? 0}</div>
                  <div className="fd-attention-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockers */}
          {blockers.length > 0 && (
            <div className="fd-rail-card">
              <div className="fd-rail-title">
                Blockers
                <span className="fd-rail-meta">{blockers.length} open</span>
              </div>
              <div className="fd-rail-rule" />
              {blockers.slice(0, 4).map((b, i) => (
                <div className="fd-ledger-row" key={`blk-${i}`} style={{ padding: "10px 0" }}>
                  <div className="fd-ledger-row-mark" data-tone="ember">
                    <ShieldAlert size={13} strokeWidth={2} />
                  </div>
                  <div className="fd-ledger-row-main">
                    <div className="fd-ledger-row-title" style={{ fontSize: 13 }}>
                      {b.task_title || b.title || b.blocker_description || "Blocked item"}
                    </div>
                    {(b.hours_blocked != null || b.source_label) && (
                      <div className="fd-ledger-row-meta">
                        {b.hours_blocked != null ? `Blocked ${b.hours_blocked}h` : ""}
                        {b.hours_blocked != null && b.source_label ? " · " : ""}
                        {b.source_label || ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integration digest */}
          {digestEntries.length > 0 && (
            <div className="fd-rail-card">
              <div className="fd-rail-title">
                Activity digest
                <span className="fd-rail-meta">last 24h</span>
              </div>
              <div className="fd-rail-rule" />
              {digestEntries.map((d) => (
                <div className="fd-digest-row" key={d.name}>
                  <span className="fd-digest-name">{d.name}</span>
                  <div className="fd-digest-bar">
                    <div className="fd-digest-bar-fill" style={{ width: `${Math.max(4, (d.count / maxDigest) * 100)}%` }} />
                  </div>
                  <span className="fd-digest-count">{d.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Velocity */}
          <div className="fd-rail-card">
            <div className="fd-rail-title">
              Velocity
              <span className="fd-rail-meta">7 days</span>
            </div>
            <div className="fd-velocity">
              {velocity.map((v, i) => (
                <div
                  key={`vel-${i}`}
                  className={`fd-velocity-bar${v === 0 ? " is-zero" : ""}`}
                  style={{ height: `${v === 0 ? 4 : Math.max(12, (v / maxVel) * 56)}px` }}
                />
              ))}
            </div>
            <div className="fd-velocity-labels">
              <span>{velocityLabels[0]}</span>
              <span>{velocityLabels[3]}</span>
              <span>{velocityLabels[6]}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
