import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: "flex",
      height: "44px", // 44px mobile target
      width: "100%",
      borderRadius: "10px",
      border: "1.5px solid var(--edge)",
      backgroundColor: "var(--dark-gray)",
      paddingLeft: "12px",
      paddingRight: "12px",
      fontSize: "14px",
      color: "var(--white)",
      fontFamily: "'Satoshi', sans-serif",
      outline: "none",
      transition: "all 0.2s ease-in-out",
      boxSizing: "border-box",
    };

    return (
      <input
        type={type}
        style={{ ...baseStyle, ...style }}
        className={`custom-input-focus ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
export { Input };
