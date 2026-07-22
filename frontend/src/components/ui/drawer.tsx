import React, { useEffect, useRef } from "react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ isOpen, onClose, title, children, width = "max-w-[560px]" }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    const focusable = drawerRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--surface-overlay)] fd-enter" onClick={onClose} role="presentation">
      <aside
        ref={drawerRef}
        className={`absolute right-0 top-0 flex h-full w-full ${width} flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-float)]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-3">
          <h2 id="drawer-title" className="font-ui text-[16px] font-medium tracking-[0]">{title}</h2>
          <button className="fd-button h-[32px] min-h-0 w-[32px] p-0 text-[var(--text-muted)]" onClick={onClose} aria-label="Close drawer">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </aside>
    </div>
  );
}

export default Drawer;
