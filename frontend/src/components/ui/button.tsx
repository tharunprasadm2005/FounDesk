import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  children?: React.ReactNode;
  ariaLabel?: string;
}

export default function Button({
  variant = "secondary",
  children,
  ariaLabel,
  style,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "'Satoshi', sans-serif",
    fontSize: "12.5px",
    fontWeight: 700,
    borderRadius: "8px",
    cursor: props.disabled ? "not-allowed" : "pointer",
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minHeight: "44px", // Mobile 44px touch targets
    padding: "8px 16px",
    opacity: props.disabled ? 0.4 : 1,
    boxSizing: "border-box",
  };

  let variantStyle: React.CSSProperties = {};

  if (variant === "primary") {
    // Neumorphic button rethemed for v4
    variantStyle = {
      background: "var(--dark-gray)",
      color: "var(--white)",
      border: "none",
      boxShadow: "6px 6px 14px rgba(0,0,0,0.8), -6px -6px 14px rgba(100,100,100,0.12)",
    };
  } else if (variant === "secondary") {
    variantStyle = {
      background: "var(--dark-gray)",
      border: "1.5px solid var(--edge)",
      color: "var(--white)",
      boxShadow: "var(--shadow-ambient)",
    };
  } else if (variant === "ghost") {
    variantStyle = {
      background: "transparent",
      border: "none",
      color: "var(--light-gray)",
    };
  } else if (variant === "destructive") {
    variantStyle = {
      background: "transparent",
      border: "1.5px solid var(--error)",
      color: "var(--error)",
    };
  }

  const btnClass = `custom-btn-${variant} ${className}`;

  return (
    <button
      style={{ ...baseStyle, ...variantStyle, ...style }}
      className={btnClass}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}
export { Button };
