import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "error" | "warning" | "info" | "default";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, style, className = "", ...props }: BadgeProps) {
  let colorValue = "var(--light-gray)";
  let bgValue = "rgba(167, 167, 167, 0.12)";

  if (variant === "success") {
    colorValue = "var(--success)";
    bgValue = "rgba(62, 142, 90, 0.14)";
  } else if (variant === "error") {
    colorValue = "var(--error)";
    bgValue = "rgba(193, 8, 1, 0.14)";
  } else if (variant === "warning") {
    colorValue = "var(--warning)";
    bgValue = "rgba(241, 96, 1, 0.14)";
  } else if (variant === "info") {
    colorValue = "var(--info)";
    bgValue = "rgba(167, 167, 167, 0.14)";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontFamily: "'Satoshi', sans-serif",
        color: colorValue,
        backgroundColor: bgValue,
        border: `1px solid ${colorValue}22`,
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
export { Badge };
