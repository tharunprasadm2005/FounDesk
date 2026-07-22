import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "quiet";
  size?: "sm" | "md" | "lg" | "icon";
  children?: React.ReactNode;
  ariaLabel?: string;
}

export function Button({
  variant = "secondary",
  size = "md",
  children,
  ariaLabel,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "fd-button";
  
  const sizeClasses = {
    sm: "min-h-[32px] px-[12px] text-[13px]",
    md: "min-h-[40px] px-[16px] text-[14px]",
    lg: "min-h-[48px] px-[24px] text-[16px]",
    icon: "h-[40px] w-[40px] min-h-0 p-0"
  };

  const variantClasses = {
    primary: "bg-[var(--indigo-ink)] text-[var(--washi-white)] border-[var(--indigo-ink)] hover:opacity-90",
    secondary: "bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
    ghost: "bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--linen-100)] hover:text-[var(--text-primary)]",
    quiet: "bg-[var(--linen-100)] text-[var(--text-primary)] border-transparent hover:bg-[var(--stone-200)]",
    destructive: "bg-transparent text-[var(--danger)] border-[var(--clay-500)] hover:bg-[rgba(181,101,74,0.08)]"
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button
      className={classes}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
