import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";

const A = "var(--japandi-accent)";
const C = {
  bg: "transparent",
  card: "#161614",
  text: "#f5f5f0",
  sub: "#8a8a85",
  border: "rgba(255, 255, 255, 0.05)",
  muted: "#181817",
  accent: "rgba(255, 107, 43, 0.22)",
};

function Badge({ children, style, ...props }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "9999px",
      padding: "2px 10px",
      fontSize: "11px",
      fontWeight: 600,
      ...style,
    }} {...props}>{children}</div>
  );
}

export default function RadialOrbitalTimeline({ timelineData }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState({});
  const [centerOffset] = useState({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState(null);
  const containerRef = useRef(null);
  const orbitRef = useRef(null);
  const nodeRefs = useRef({});

  const handleContainerClick = useCallback((e) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  }, []);

  const getRelatedItems = useCallback((itemId) => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  }, [timelineData]);

  const toggleItem = useCallback((id) => {
    setExpandedItems((prev) => {
      const newState = {};
      Object.keys(prev).forEach((key) => {
        if (parseInt(key) !== id) newState[parseInt(key)] = false;
      });
      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const np = {};
        relatedItems.forEach((relId) => { np[relId] = true; });
        setPulseEffect(np);
        requestAnimationFrame(() => {
          const nodeIndex = timelineData.findIndex((item) => item.id === id);
          const total = timelineData.length;
          setRotationAngle(270 - (nodeIndex / total) * 360);
        });
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return newState;
    });
  }, [timelineData, getRelatedItems]);

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const calculateNodePosition = useCallback((index, total) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 200;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(rad) + centerOffset.x;
    const y = radius * Math.sin(rad) + centerOffset.y;
    const zIndex = Math.round(100 + 50 * Math.cos(rad));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(rad)) / 2)));
    return { x, y, angle, zIndex, opacity };
  }, [rotationAngle, centerOffset]);

  const isRelatedToActive = useCallback((itemId) => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  }, [activeNodeId, getRelatedItems]);

  return (
    <div ref={containerRef} onClick={handleContainerClick}
      style={{ width: "100%", height: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, overflow: "hidden", position: "relative", borderRadius: 16 }}>
      <style>{`
        .rot-pulse { animation: rotPulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        .rot-ping { animation: rotPing 1s cubic-bezier(0,0,0.2,1) infinite; }
        .rot-ping-d { animation: rotPing 1s cubic-bezier(0,0,0.2,1) infinite 0.5s; }
        @keyframes rotPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes rotPing { 75%,100% { transform:scale(2); opacity:0; } }
        .rot-node { transition: all 0.7s cubic-bezier(0.4,0,0.2,1); cursor:pointer; }
        .rot-icon-wrap { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .rot-label { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .rot-card { animation: rotCardIn 0.35s cubic-bezier(0.16,1,0.3,1); }
        @keyframes rotCardIn { from { opacity:0; transform:translateY(8px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        .rot-pulse-node { animation: rotPulseNode 1s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes rotPulseNode { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      <div ref={orbitRef} style={{
        position: "relative", width: "100%", maxWidth: 896, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        perspective: "1000px",
        transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
      }}>
        {/* Center node — FounDesk orange */}
        <div style={{
          position: "absolute", width: 64, height: 64, borderRadius: "50%",
          background: `linear-gradient(135deg, ${A}, #e65c00)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10, boxShadow: `0 0 24px ${A}44`,
        }}>
          <div className="rot-ping" style={{
            position: "absolute", width: 80, height: 80, borderRadius: "50%",
            border: `1px solid ${A}44`,
          }} />
          <div className="rot-ping-d" style={{
            position: "absolute", width: 96, height: 96, borderRadius: "50%",
            border: `1px solid ${A}22`,
          }} />
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#080807", backdropFilter: "blur(24px)",
          }} />
        </div>

        {/* Orbit ring */}
        <div style={{
          position: "absolute", width: 384, height: 384, borderRadius: "50%",
          border: `1px solid ${C.border}`,
        }} />

        {/* Nodes */}
        {timelineData.map((item, index) => {
          const pos = calculateNodePosition(index, timelineData.length);
          const isExpanded = expandedItems[item.id];
          const isRelated = isRelatedToActive(item.id);
          const isPulsing = pulseEffect[item.id];
          const Icon = item.icon;

          return (
            <div key={item.id}
              ref={(el) => { nodeRefs.current[item.id] = el; }}
              className="rot-node"
              onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
              style={{
                position: "absolute",
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                zIndex: isExpanded ? 200 : pos.zIndex,
                opacity: isExpanded ? 1 : pos.opacity,
              }}
            >
              {/* Pulse glow */}
              <div className={isPulsing ? "rot-pulse-node" : ""} style={{
                position: "absolute", borderRadius: "50%",
                background: `radial-gradient(circle, ${A}44 0%, ${A}00 70%)`,
                width: item.energy * 0.5 + 40,
                height: item.energy * 0.5 + 40,
                left: -((item.energy * 0.5 + 40 - 40) / 2),
                top: -((item.energy * 0.5 + 40 - 40) / 2),
              }} />

              {/* Icon circle */}
              <div className="rot-icon-wrap" style={{
                width: 40, height: 40, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isExpanded ? A : isRelated ? `${A}88` : C.card,
                border: `2px solid ${isExpanded ? A : isRelated ? A : C.border}`,
                boxShadow: isExpanded ? `0 0 20px ${A}55` : "none",
                transform: isExpanded ? "scale(1.5)" : "scale(1)",
                color: isExpanded ? "#fff" : isRelated ? "#fff" : C.text,
              }}>
                <Icon size={16} />
              </div>

              {/* Label */}
              <div className="rot-label" style={{
                position: "absolute", top: 48, left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
                color: isExpanded ? A : C.sub,
              }}>
                {item.title}
              </div>

              {/* Expanded card */}
              {isExpanded && (
                <div className="rot-card" style={{
                  position: "absolute", top: 80, left: "50%",
                  transform: "translateX(-50%)",
                  width: 256,
                  background: C.card,
                  backdropFilter: "blur(24px)",
                  border: `0.5px solid ${C.border}`,
                  borderRadius: 12,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  overflow: "visible",
                  zIndex: 300,
                }}>
                  <div style={{
                    position: "absolute", top: -12, left: "50%",
                    transform: "translateX(-50%)",
                    width: 1, height: 12, background: C.border,
                  }} />

                  <div style={{ padding: "16px 16px 8px" }}>
                    <div style={{ display: "flex", justifycontent: "space-between", alignItems: "center" }}>
                      <Badge style={{
                        background: item.status === "completed" ? "rgba(16, 185, 129, 0.15)" : item.status === "in-progress" ? `${A}22` : "rgba(255,255,255,0.03)",
                        color: item.status === "completed" ? "#10b981" : item.status === "in-progress" ? A : C.sub,
                        border: `0.5px solid ${item.status === "completed" ? "#10b98133" : item.status === "in-progress" ? `${A}33` : C.border}`,
                      }}>
                        {item.status === "completed" ? "LIVE" : item.status === "in-progress" ? "ACTIVE" : "UPCOMING"}
                      </Badge>
                      <span style={{ fontSize: "11px", fontFamily: "'Clash Display', sans-serif", color: C.sub }}>{item.date}</span>
                    </div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "8px 0 0", fontFamily: "'Clash Display', sans-serif" }}>
                      {item.title}
                    </h3>
                  </div>

                  <div style={{ padding: "0 16px 16px" }}>
                    <p style={{ fontSize: "12px", color: C.sub, lineHeight: 1.5, margin: 0 }}>{item.content}</p>

                    {/* Energy bar */}
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `0.5px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.sub }}>
                          <Zap size={10} /> Impact
                        </span>
                        <span style={{ fontFamily: "'Clash Display', sans-serif", color: C.text }}>{item.energy}%</span>
                      </div>
                      <div style={{ width: "100%", height: 4, background: C.muted, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          background: `linear-gradient(to right, ${A}, #ffaa80)`,
                          width: `${item.energy}%`,
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>

                    {/* Connected nodes */}
                    {item.relatedIds.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `0.5px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                          <Link size={10} color={C.sub} />
                          <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, color: C.sub }}>Connected</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {item.relatedIds.map((relId) => {
                            const relItem = timelineData.find((i) => i.id === relId);
                            return (
                              <button key={relId} onClick={(e) => { e.stopPropagation(); toggleItem(relId); }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  height: 24, padding: "0 8px", fontSize: "11px",
                                  border: `0.5px solid ${C.border}`, borderRadius: 4,
                                  background: "transparent", color: C.sub,
                                  cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = C.text; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}
                              >
                                {relItem?.title}
                                <ArrowRight size={8} color={C.sub} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
