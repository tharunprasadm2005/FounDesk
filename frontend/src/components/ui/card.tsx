import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  padding?: string;
  tone?: "raised" | "muted";
}

export function Card({ children, padding = "p-3", tone = "raised", className = "", ...props }: CardProps) {
  const toneClass = tone === "muted" ? "fd-panel-muted" : "fd-panel";
  return (
    <div className={`${toneClass} ${padding} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
