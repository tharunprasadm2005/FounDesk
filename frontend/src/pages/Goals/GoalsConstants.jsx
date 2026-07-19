import { Target, Shield, Rocket, Phone, CheckSquare, Square, Link2, AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink, X as XIcon } from "lucide-react";

export const ICON_MAP = {
  target: Target, shield: Shield, rocket: Rocket, phone: Phone,
  "square-check": CheckSquare, square: Square, link: Link2,
  "alert-triangle": AlertTriangle, trendingUp: TrendingUp, trendingDown: TrendingDown,
  minus: Minus, externalLink: ExternalLink, x: XIcon,
};

export function Icon({ name, size = 18, stroke: strokeWidth = 1.5 }) {
  const LucideIcon = ICON_MAP[name] || Target;
  return <LucideIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

export const PRIORITY_COLORS = {
  P0: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P1: { bg: "rgba(232,80,2,0.12)", text: "var(--brand-orange)" },
  P2: { bg: "rgba(59,130,246,0.1)", text: "var(--light-gray)" },
  P3: { bg: "rgba(107,114,128,0.08)", text: "var(--gray)" },
};

export const SOURCE_BADGES = {
  manual: { icon: "\uD83D\uDD27", label: "Manual" },
  meeting: { icon: "\uD83D\uDCCB", label: "From Meeting" },
  decision: { icon: "\uD83D\uDCA1", label: "From Decision" },
  ai: { icon: "\uD83E\uDD16", label: "AI Generated" },
  extraction: { icon: "\uD83E\uDD16", label: "AI Generated" },
  integration: { icon: "\uD83D\uDD17", label: "Integrated" },
};

export function TrendIcon({ trend }) {
  if (trend === "accelerating") return <TrendingUp size={12} color="var(--positive)" />;
  if (trend === "stalling") return <TrendingDown size={12} color="var(--warning)" />;
  return <Minus size={12} color="var(--graphite)" />;
}

export function renderSourceBadge(goal) {
  const info = goal.source_info || {};
  const badge = SOURCE_BADGES[info.type] || SOURCE_BADGES.manual;
  return (
    <span style={{ fontSize: "9px", color: "var(--graphite)", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}>
      {badge.icon} {info.label || badge.label}
    </span>
  );
}

export function renderProgressBar(goal, options = {}) {
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
}

export function getGoalHealth(goal) {
  if (goal.at_risk && goal.risk_reason) {
    return { label: goal.risk_reason, color: goal.status === "at_risk" ? "#ef4444" : "#eab308" };
  }
  if (!goal.due_date || goal.status === "completed" || goal.status === "failed") return null;
  const diff = Math.ceil((new Date(goal.due_date) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#ef4444" };
  if (diff <= 3) return { label: `${diff}d to deadline`, color: "#eab308" };
  return { label: `${diff}d to deadline`, color: "#3acaa5" };
}

export const PHASE_LABELS = {
  think: "Think", build: "Build", launch: "Launch", scale: "Scale",
};

export const orangePill = {
  fontSize: "12.5px", color: "var(--void)", background: "var(--ember)",
  padding: "8px 16px", borderRadius: "10px", fontWeight: "700",
  cursor: "pointer", border: "none", fontFamily: "'Satoshi', sans-serif",
  transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
};
