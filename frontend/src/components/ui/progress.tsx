export interface ProgressProps {
  value?: number;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

export function Progress({ value = 0, tone = "primary", className = "" }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const tones = {
    primary: "bg-[var(--indigo-ink)]",
    success: "bg-[var(--moss-600)]",
    warning: "bg-[var(--sand-400)]",
    danger: "bg-[var(--clay-500)]",
    neutral: "bg-[var(--stone-400)]",
  };

  return (
    <div className={`h-[6px] w-full overflow-hidden rounded-[2px] bg-[var(--stone-200)] ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <div className={`h-full rounded-[2px] transition-[width] duration-280 ease-out-soft ${tones[tone]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default Progress;
