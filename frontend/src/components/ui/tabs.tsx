import React, { useRef, useEffect } from "react";

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
      style={{
        display: "flex",
        borderBottom: "1.5px solid var(--edge)",
        gap: "24px",
        fontFamily: "'Satoshi', sans-serif",
      }}
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
            style={{
              padding: "12px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--brand-orange)" : "var(--light-gray)",
              position: "relative",
              outline: "none",
              transition: "color 0.2s ease",
            }}
          >
            {tab.label}
            {/* Orange underline indicator */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-1.5px",
                  left: 0,
                  right: 0,
                  height: "2.5px",
                  backgroundColor: "var(--brand-orange)",
                  borderRadius: "9999px",
                  boxShadow: "0 0 8px rgba(232, 80, 2, 0.4)",
                  animation: "fadeIn 0.2s ease-out",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
export { Tabs };
