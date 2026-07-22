import React from "react";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name = "User", src, size = "md", className = "" }: AvatarProps) {
  const sizes = {
    sm: "h-[28px] w-[28px] text-[12px]",
    md: "h-[36px] w-[36px] text-[14px]",
    lg: "h-[48px] w-[48px] text-[16px]",
  };
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--linen-100)] text-[var(--text-muted)] ${sizes[size]} ${className}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{initial}</span>}
    </div>
  );
}

export default Avatar;
