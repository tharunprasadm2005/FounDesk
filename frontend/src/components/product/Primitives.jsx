import { Search } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Stack, Inline } from "../layout";

export function SearchField({ value, onChange, placeholder = "Search", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
      <Input value={value} onChange={onChange} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function FilterBar({ children, className = "" }) {
  return <div className={`flex flex-col gap-2 md:flex-row md:items-center ${className}`}>{children}</div>;
}

export function MetricCard({ label, value, detail, tone = "neutral", icon }) {
  const tones = {
    neutral: "text-[var(--text-primary)]",
    primary: "text-[var(--indigo-ink)]",
    success: "text-[var(--moss-600)]",
    warning: "text-[#8f6d36]",
    danger: "text-[var(--clay-500)]",
  };
  return (
    <Card padding="p-3">
      <Stack gap="gap-1">
        <Inline justify="justify-between" items="items-start">
          <span className="fd-eyebrow">{label}</span>
          {icon && <span className="text-[var(--text-subtle)]">{icon}</span>}
        </Inline>
        <strong className={`font-mono text-[32px] font-normal leading-none ${tones[tone]}`}>{value}</strong>
        {detail && <span className="fd-body-muted">{detail}</span>}
      </Stack>
    </Card>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  const variant = normalized.includes("done") || normalized.includes("active") || normalized.includes("confirmed") || normalized.includes("paid")
    ? "success"
    : normalized.includes("block") || normalized.includes("cancel") || normalized.includes("failed") || normalized.includes("past")
      ? "error"
      : normalized.includes("progress") || normalized.includes("trial")
        ? "info"
        : "default";
  return <Badge variant={variant}>{String(status || "Unknown").replace(/_/g, " ")}</Badge>;
}

export function PriorityBadge({ priority }) {
  const p = priority || "P2";
  const variant = p === "P0" || p === "P1" ? "error" : p === "P2" ? "info" : "default";
  return <Badge variant={variant}>{p}</Badge>;
}

export function TaskCard({ task, onOpen, onStatusChange }) {
  return (
    <Card padding="p-2" className="transition-colors hover:border-[var(--border-strong)]">
      <Stack gap="gap-2">
        <Inline justify="justify-between" items="items-start" gap="gap-2">
          <button className="bg-transparent p-0 text-left font-ui text-[14px] font-medium leading-snug text-[var(--text-primary)]" onClick={onOpen}>
            {task.title || "Untitled task"}
          </button>
          <PriorityBadge priority={task.priority} />
        </Inline>
        {task.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{task.description}</p>}
        <Inline justify="justify-between" className="text-[12px] text-[var(--text-subtle)]">
          <StatusBadge status={task.status} />
          {onStatusChange && <Button size="sm" variant="ghost" onClick={onStatusChange}>Move</Button>}
        </Inline>
      </Stack>
    </Card>
  );
}

export function GoalCard({ goal, onOpen }) {
  const progress = Number(goal.progress || 0);
  return (
    <Card padding="p-3" className="transition-colors hover:border-[var(--border-strong)]">
      <Stack gap="gap-2">
        <Inline justify="justify-between" items="items-start" gap="gap-2">
          <button className="bg-transparent p-0 text-left font-ui text-[15px] font-medium leading-snug text-[var(--text-primary)]" onClick={onOpen}>
            {goal.title || "Untitled goal"}
          </button>
          <StatusBadge status={goal.status} />
        </Inline>
        {goal.description && <p className="line-clamp-2 text-[13px] text-[var(--text-muted)]">{goal.description}</p>}
        <Progress value={progress} tone={progress >= 80 ? "success" : "primary"} />
        <Inline justify="justify-between" className="font-mono text-[12px] text-[var(--text-subtle)]">
          <span>{goal.goal_type || "goal"}</span>
          <span>{progress}%</span>
        </Inline>
      </Stack>
    </Card>
  );
}

export function DecisionCard({ item, actions }) {
  return (
    <Card padding="p-3">
      <Stack gap="gap-2">
        <Inline justify="justify-between" items="items-start" gap="gap-2">
          <h3 className="font-ui text-[15px] font-medium tracking-[0]">{item.decision || item.title || "Decision"}</h3>
          <StatusBadge status={item.status} />
        </Inline>
        {(item.context || item.summary) && <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{item.context || item.summary}</p>}
        {actions && <Inline gap="gap-1" className="pt-1">{actions}</Inline>}
      </Stack>
    </Card>
  );
}

export function TimelineRow({ label, title, detail, meta }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 border-b border-[var(--border-subtle)] py-2 last:border-0">
      <span className="font-mono text-[12px] text-[var(--text-subtle)]">{label}</span>
      <div>
        <p className="text-[14px] font-medium leading-snug">{title}</p>
        {detail && <p className="mt-1 text-[13px] text-[var(--text-muted)]">{detail}</p>}
        {meta && <p className="mt-1 font-mono text-[11px] text-[var(--text-subtle)]">{meta}</p>}
      </div>
    </div>
  );
}

export function SettingsPanel({ title, description, children, actions }) {
  return (
    <Card padding="p-0">
      <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] p-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-ui text-[16px] font-medium tracking-[0]">{title}</h3>
          {description && <p className="fd-body-muted mt-1">{description}</p>}
        </div>
        {actions && <Inline gap="gap-1">{actions}</Inline>}
      </div>
      <div className="p-3">{children}</div>
    </Card>
  );
}

export function PricingCard({ plan, isCurrent, actions }) {
  return (
    <Card padding="p-3" className={isCurrent ? "border-[var(--moss-600)]" : ""}>
      <Stack gap="gap-3" className="h-full">
        <Inline justify="justify-between" items="items-start">
          <h3 className="text-[22px]">{plan.name}</h3>
          {isCurrent && <Badge variant="success">Current</Badge>}
        </Inline>
        <div className="font-mono text-[32px] leading-none">
          {plan.amount ? `₹${plan.amount / 100}` : "Custom"}{plan.amount ? <span className="font-ui text-[14px] text-[var(--text-subtle)]">/mo</span> : null}
        </div>
        <Stack gap="gap-1" className="flex-1">
          {(plan.features || []).map((feature) => <p key={feature} className="text-[14px] text-[var(--text-muted)]">{feature}</p>)}
        </Stack>
        {actions && <div className="border-t border-[var(--border-subtle)] pt-2">{actions}</div>}
      </Stack>
    </Card>
  );
}
