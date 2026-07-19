import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  hoverEffect?: boolean;
}

export function Card({ children, hoverEffect = true, className = "", ...props }: CardProps) {
  return (
    <div
      className={`card-japandi p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
