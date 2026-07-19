import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, style, checked, ...props }, ref) => {
    return (
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none",
          fontFamily: "'Satoshi', sans-serif",
          fontSize: "14px",
          color: "var(--japandi-text)",
          ...style,
        }}
      >
        <div style={{ position: "relative", width: "20px", height: "20px" }}>
          <input
            type="checkbox"
            checked={checked}
            style={{
              position: "absolute",
              opacity: 0,
              cursor: "pointer",
              height: 0,
              width: 0,
            }}
            ref={ref}
            {...props}
          />
          {/* Neumorphic Tier-2 Box style re-themed for v4 */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              backgroundColor: "var(--dark-gray)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: checked
                ? "inset 2px 2px 5px rgba(0,0,0,0.8), inset -2px -2px 5px rgba(100,100,100,0.08)"
                : "3px 3px 8px rgba(0,0,0,0.8), -3px -3px 8px rgba(100,100,100,0.12)",
              border: checked ? "1px solid var(--japandi-accent)" : "1px solid transparent",
              background: checked ? "rgba(232, 80, 2, 0.2)" : "var(--dark-gray)",
            }}
          >
            {checked && (
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.5 5L4.5 8L10.5 1.5"
                  stroke="var(--japandi-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
        {label && <span>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
export { Checkbox };
