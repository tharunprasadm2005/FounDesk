import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: "flex",
      height: "44px", // 44px mobile touch targets
      width: "100%",
      borderRadius: "10px",
      border: "1.5px solid var(--edge)",
      backgroundColor: "var(--dark-gray)",
      paddingLeft: "12px",
      paddingRight: "12px",
      fontSize: "13px",
      color: "var(--white)",
      fontFamily: "'Satoshi', sans-serif",
      outline: "none",
      transition: "all 0.2s ease-in-out",
      cursor: "pointer",
      boxSizing: "border-box",
    };

    return (
      <select
        style={{ ...baseStyle, ...style }}
        className={`custom-input-focus ${className}`}
        ref={ref}
        data-lenis-prevent
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export default Select;
export { Select };
