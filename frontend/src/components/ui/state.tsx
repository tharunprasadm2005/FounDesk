import React from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "./button";

interface StateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function LoadingState({ title = "Loading", message = "Preparing your workspace.", className = "" }: StateProps) {
  return (
    <div className={`flex min-h-[240px] items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-[24px] w-[24px] animate-spin rounded-full border border-[var(--stone-300)] border-t-[var(--indigo-ink)]" />
        <p className="fd-eyebrow">{title}</p>
        <p className="fd-body-muted">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", message = "New activity will appear here when it is available.", actionLabel, onAction, icon, className = "" }: StateProps) {
  return (
    <div className={`fd-panel-muted flex min-h-[180px] flex-col items-center justify-center gap-3 p-4 text-center ${className}`}>
      <div className="text-[var(--text-subtle)]">{icon || <Inbox size={22} strokeWidth={1.5} />}</div>
      <div>
        <h3 className="font-ui text-[15px] font-medium tracking-[0]">{title}</h3>
        <p className="fd-body-muted mt-1 max-w-[420px]">{message}</p>
      </div>
      {actionLabel && onAction && <Button onClick={onAction} variant="secondary" size="sm">{actionLabel}</Button>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message = "Refresh and try again.", actionLabel, onAction, className = "" }: StateProps) {
  return (
    <div className={`fd-panel flex min-h-[180px] flex-col items-center justify-center gap-3 p-4 text-center ${className}`}>
      <AlertCircle size={22} strokeWidth={1.5} className="text-[var(--clay-500)]" />
      <div>
        <h3 className="font-ui text-[15px] font-medium tracking-[0]">{title}</h3>
        <p className="fd-body-muted mt-1 max-w-[420px]">{message}</p>
      </div>
      {actionLabel && onAction && <Button onClick={onAction} variant="secondary" size="sm">{actionLabel}</Button>}
    </div>
  );
}
