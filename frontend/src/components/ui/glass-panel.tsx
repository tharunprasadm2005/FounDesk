import React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function GlassPanel({ children, className = "", style, ...props }: GlassPanelProps) {
  return (
    <div
      style={{
        background: "rgba(10, 10, 12, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "16px",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6)",
        padding: "24px",
        boxSizing: "border-box",
        ...style,
      }}
      className={`glass-panel ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default GlassPanel;
