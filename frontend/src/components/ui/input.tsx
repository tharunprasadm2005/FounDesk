import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    const baseClasses = "flex h-10 w-full rounded-sm border border-border bg-washi-white px-3 py-2 text-sm text-foreground font-sans transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <input
        type={type}
        className={`${baseClasses} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;
