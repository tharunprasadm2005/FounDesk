import React, { useEffect, useState } from "react";

interface GaugeProps {
  value: number; // 0 to 100
  title?: string;
  size?: "L" | "S";
  subtitle?: string;
}

export function Gauge({ value, title = "", size = "S", subtitle = "" }: GaugeProps) {
  const isLarge = size === "L";
  const diameter = isLarge ? 140 : 64;
  const strokeWidth = isLarge ? 10 : 5;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Mount animation state
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Small delay to trigger transition after render
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  const offset = circumference - (Math.min(Math.max(animatedValue, 0), 100) / 100) * circumference;

  // Generate stable gradient ID
  const [uniqueId] = useState(() => `ember-grad-${Math.random().toString(36).substring(2, 11)}`);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
      role="img"
      aria-label={`${title} Progress: ${value}%`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${diameter}px`,
          height: `${diameter}px`,
          position: "relative",
          borderRadius: "50%",
          boxShadow: isLarge
            ? "inset -4px -4px 10px rgba(255, 255, 255, 0.08), inset 4px 4px 10px rgba(0, 0, 0, 0.4)"
            : "inset -2px -2px 5px rgba(255, 255, 255, 0.08), inset 2px 2px 5px rgba(0, 0, 0, 0.4)",
          backgroundColor: "var(--japandi-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={diameter}
          height={diameter}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <defs>
            {/* Ember gradient stops: #FF7A33 to #E85002 */}
            <linearGradient id={uniqueId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--japandi-accent)" />
              <stop offset="100%" stopColor="var(--japandi-accent)" />
            </linearGradient>
          </defs>
          {/* Background track (adapts to theme border variables) */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="var(--japandi-border)"
            strokeWidth={strokeWidth}
            opacity="1"
          />
          {/* Active progress sweep using Ember Gradient */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={`url(#${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </svg>
        <div
          style={{
            zIndex: 1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: isLarge ? "28px" : "12px",
              fontWeight: 700,
              color: "var(--japandi-text)",
            }}
          >
            {value}%
          </span>
          {isLarge && subtitle && (
            <span
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "10px",
                color: "var(--japandi-muted)",
                marginTop: "2px",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {title && !isLarge && (
        <span
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "11px",
            color: "var(--japandi-muted)",
            marginTop: "8px",
            fontWeight: 500,
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
}

export default Gauge;
