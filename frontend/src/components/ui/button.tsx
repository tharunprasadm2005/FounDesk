import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
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
  const baseClasses = "inline-flex items-center justify-center rounded-sm font-sans font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2 text-base",
    lg: "h-12 px-6 py-3 text-lg"
  };

  const variantClasses = {
    primary: "bg-primary text-washi-white hover:bg-[#2D3A4D]",
    secondary: "bg-transparent border border-border text-foreground hover:bg-linen-100",
    ghost: "bg-transparent text-stone-400 hover:text-foreground hover:bg-linen-100",
    destructive: "bg-transparent border border-clay-500 text-clay-500 hover:bg-clay-500 hover:text-washi-white"
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
