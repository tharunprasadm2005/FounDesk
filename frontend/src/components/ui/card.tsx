import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  hoverEffect?: boolean;
}

export function Card({ children, hoverEffect = true, className = "", style, ...props }: CardProps) {
  return (
    <div
      style={{
        background: "var(--dark-gray)",
        border: "1.5px solid var(--edge)",
        borderRadius: "12px",
        boxShadow: "var(--shadow-ambient), var(--shadow-directional)",
        padding: "24px",
        boxSizing: "border-box",
        ...style,
      }}
      className={`panel ${hoverEffect ? "custom-card-hover" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
