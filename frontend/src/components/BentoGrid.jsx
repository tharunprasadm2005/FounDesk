import { TrendingUp, CheckCircle, Video, Globe, GitBranch, Shield } from "lucide-react";

const A = "var(--brand-orange)";
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'DM Sans', system-ui, sans-serif";

const C = {
  bg: "#FAF9F6",
  card: "#FFFFFF",
  text: "#1A1916",
  sub: "#6B6860",
  border: "#E6E2DA",
  muted: "#EDEAE4",
  accentLight: "#FFF1E8",
};

const tagColors = {
  "Analytics": "#3b82f6",
  "Workflow": "#10b981",
  "Storage": "#8b5cf6",
  "Infra": "#06b6d4",
  "AI": A,
  "Sync": "#f59e0b",
};

export function BentoGrid({ items }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
      padding: 4,
    }}>
      <style>{`
        .bg-card { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); cursor:default; }
        .bg-card:hover { transform: translateY(-2px); }
        .bg-cta { transition: opacity 0.3s; }
        .bg-card:hover .bg-cta { opacity: 1; }
      `}</style>
      {items.map((item, i) => (
        <div key={i} className="bg-card" style={{
          gridColumn: item.colSpan === 2 ? "span 2" : "span 1",
          position: "relative",
          padding: 20,
          borderRadius: 14,
          background: C.card,
          border: `0.5px solid ${C.border}`,
          overflow: "hidden",
          boxShadow: item.hasPersistentHover ? `0 2px 12px rgba(0,0,0,0.03)` : "none",
          transform: item.hasPersistentHover ? "translateY(-2px)" : "none",
        }}>
          {/* Dot grid bg */}
          <div style={{
            position: "absolute", inset: 0,
            opacity: item.hasPersistentHover ? 1 : 0,
            transition: "opacity 0.3s",
            backgroundImage: `radial-gradient(circle at center, rgba(0,0,0,0.02) 1px, transparent 1px)`,
            backgroundSize: "4px 4px",
            pointerEvents: "none",
          }} className="bg-dots" />

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${C.accentLight}`,
                transition: "all 0.3s",
              }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 500,
                padding: "3px 8px", borderRadius: 6,
                background: C.muted,
                color: C.sub,
              }}>
                {item.status || "Active"}
              </span>
            </div>

            {/* Title + description */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 style={{
                margin: 0, fontSize: 15, fontWeight: 600,
                color: C.text, letterSpacing: "-0.01em",
                fontFamily: FONT_SANS,
              }}>
                {item.title}
                {item.meta && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: C.sub }}>
                    {item.meta}
                  </span>
                )}
              </h3>
              <p style={{
                margin: 0, fontSize: 13, lineHeight: 1.5,
                color: C.sub, fontFamily: FONT_SANS,
              }}>
                {item.description}
              </p>
            </div>

            {/* Tags + CTA */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginTop: 4,
            }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.tags?.map((tag, j) => (
                  <span key={j} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: C.muted, color: tagColors[tag] || C.sub,
                    transition: "all 0.2s",
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="bg-cta" style={{
                fontSize: 11, color: C.sub,
                opacity: item.hasPersistentHover ? 1 : 0,
                whiteSpace: "nowrap",
              }}>
                {item.cta || "Explore →"}
              </span>
            </div>
          </div>

          {/* Border glow */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 14,
            padding: "0.5px",
            background: `linear-gradient(135deg, transparent, ${C.border}, transparent)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: item.hasPersistentHover ? 1 : 0,
            transition: "opacity 0.3s",
            pointerEvents: "none",
          }} className="bg-border-glow" />
        </div>
      ))}
    </div>
  );
}

const itemsSample = [
  {
    title: "Unified Canvas Feed",
    meta: "Live",
    description: "Real-time activity compilation from 14+ tools into a single panoramic view",
    icon: <TrendingUp size={16} color={A} />,
    status: "Live",
    tags: ["Analytics", "Sync"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Goal Cascade Engine",
    meta: "98% hit rate",
    description: "Auto-breakdown of monthly milestones to daily tasks with progress tracking",
    icon: <CheckCircle size={16} color="#10b981" />,
    status: "Updated",
    tags: ["Workflow", "AI"],
  },
  {
    title: "Calendar Defense",
    meta: "Beta",
    description: "AI-powered conflict detection and deep work block protection",
    icon: <Shield size={16} color="#8b5cf6" />,
    tags: ["AI", "Workflow"],
    colSpan: 2,
  },
  {
    title: "Institutional Memory",
    meta: "Planned",
    description: "Permanent searchable log of decisions, meetings, and blockers",
    icon: <GitBranch size={16} color="#06b6d4" />,
    status: "Coming Soon",
    tags: ["Storage", "AI"],
  },
];
