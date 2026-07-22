import React, { useRef } from "react";

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      const nextIndex = (index + 1) % tabs.length;
      onChange(tabs[nextIndex].id);
      focusTab(nextIndex);
    } else if (e.key === "ArrowLeft") {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prevIndex].id);
      focusTab(prevIndex);
    }
  };

  const focusTab = (index: number) => {
    const buttons = containerRef.current?.querySelectorAll("button");
    if (buttons && buttons[index]) {
      (buttons[index] as HTMLElement).focus();
    }
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      className="flex border-b border-[var(--stone-200)] gap-6 font-ui"
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative py-3 px-1 bg-transparent border-none cursor-pointer text-[14px] font-medium outline-none transition-colors duration-200 ${isActive ? 'text-[var(--sumi-900)]' : 'text-[var(--stone-400)] hover:text-[var(--sumi-900)]'}`}
          >
            {tab.label}
            {/* Active underline indicator */}
            {isActive && (
              <div
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--sumi-900)] rounded-t-[2px]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
