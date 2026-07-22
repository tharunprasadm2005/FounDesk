import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "error" | "warning" | "info" | "default" | "neutral";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center justify-center gap-1 rounded-[var(--radius)] border px-[8px] py-[3px] font-mono text-[11px] font-normal uppercase tracking-[0.08em]";
  
  const variants = {
    default: "border-[var(--border-subtle)] bg-[var(--linen-100)] text-[var(--text-muted)]",
    neutral: "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-muted)]",
    success: "border-[rgba(107,122,94,0.28)] bg-[rgba(107,122,94,0.08)] text-[var(--moss-600)]",
    error: "border-[rgba(181,101,74,0.28)] bg-[rgba(181,101,74,0.08)] text-[var(--clay-500)]",
    warning: "border-[rgba(201,168,118,0.32)] bg-[rgba(201,168,118,0.12)] text-[#8f6d36]",
    info: "border-[rgba(60,74,94,0.26)] bg-[rgba(60,74,94,0.08)] text-[var(--indigo-ink)]"
  };

  return (
    <span
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
