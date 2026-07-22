import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, checked, ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-[10px] cursor-pointer select-none font-ui text-[14px] text-[var(--sumi-900)] ${className}`}>
        <div className="relative w-[20px] h-[20px]">
          <input
            type="checkbox"
            checked={checked}
            className="absolute opacity-0 cursor-pointer h-0 w-0 peer"
            ref={ref}
            {...props}
          />
          <div className={`w-[20px] h-[20px] rounded-[var(--radius)] transition-all duration-200 flex items-center justify-center border peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--indigo-ink)] peer-focus-visible:ring-offset-1 ${checked ? 'bg-[var(--indigo-ink)] border-[var(--indigo-ink)]' : 'bg-[var(--washi-white)] border-[var(--stone-200)]'}`}>
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
                  stroke="var(--washi-white)"
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
