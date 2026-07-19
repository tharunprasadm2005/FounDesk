import React from "react";

export default function Logo({ size = 32, showText = true, className = "" }) {
  return (
    <div className={`flex items-center select-none gap-2 ${className}`}>
      <div className="flex items-center text-[24px] font-heading font-semibold tracking-tight text-sumi-900 bg-stone-200/50 w-10 h-10 rounded-sm justify-center border border-stone-200">
        Fd
      </div>
      {showText && (
        <span className="text-xl font-heading font-medium tracking-tight text-sumi-900">
          FounDesk
        </span>
      )}
    </div>
  );
}
