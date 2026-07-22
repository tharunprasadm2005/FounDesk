import { Inline, Stack } from "../layout";

export function Page({ children, className = "" }) {
  return <div className={`fd-enter flex flex-col gap-5 ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <header className={`flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 md:flex-row md:items-end md:justify-between ${className}`}>
      <Stack gap="gap-1">
        {eyebrow && <p className="fd-eyebrow">{eyebrow}</p>}
        <h1 className="text-[32px] md:text-[40px]">{title}</h1>
        {description && <p className="max-w-[720px] text-[15px] text-[var(--text-muted)]">{description}</p>}
      </Stack>
      {actions && <Inline gap="gap-1" className="flex-wrap">{actions}</Inline>}
    </header>
  );
}

export function PageBody({ children, className = "" }) {
  return <div className={`flex flex-col gap-5 ${className}`}>{children}</div>;
}

export function Toolbar({ children, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 border-y border-[var(--border-subtle)] py-2 md:flex-row md:items-center md:justify-between ${className}`}>
      {children}
    </div>
  );
}

export function ContentGrid({ children, className = "" }) {
  return <div className={`grid grid-cols-1 gap-3 md:grid-cols-12 ${className}`}>{children}</div>;
}

export function SplitPane({ children, className = "" }) {
  return <div className={`grid grid-cols-1 gap-5 lg:grid-cols-[7fr_5fr] ${className}`}>{children}</div>;
}
