import React from "react";

export default function Logo({ size = 32, showText = true, className = "" }) {
  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${size * 0.25}px`,
        verticalAlign: "middle"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          lineHeight: 1,
          userSelect: "none",
          marginRight: `${size * 0.35}px`, // Increase spacing here
        }}
      >
        <span
          style={{
            fontFamily: "'Clash Display', system-ui, sans-serif",
            fontSize: `${size}px`,
            fontWeight: "950",
            color: "var(--brand-orange)",
            lineHeight: 1,
            letterSpacing: "-0.04em"
          }}
        >
          F
        </span>
        <span
          style={{
            fontFamily: "'Clash Display', system-ui, sans-serif",
            fontSize: `${size}px`,
            fontWeight: "950",
            color: "transparent",
            WebkitTextStroke: `${Math.max(1, size * 0.05)}px var(--brand-orange)`,
            lineHeight: 1,
            marginLeft: `${size * 0.02}px`
          }}
        >
          d
        </span>
      </div>
      {showText && (
        <span
          style={{
            fontSize: `${size * 0.58}px`,
            fontWeight: "800",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--text-h, var(--white))",
            fontFamily: "'Clash Display', system-ui, sans-serif",
            marginLeft: `${size * 0.05}px`
          }}
        >
          FounDesk
        </span>
      )}
    </div>
  );
}
