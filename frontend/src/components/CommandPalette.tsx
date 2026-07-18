import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, Plus, Play, Brain, CheckSquare, 
  Target, Calendar, HelpCircle, FileText, Search 
} from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";

interface CommandPaletteProps {
  onClose: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  handler: () => void;
}

interface SearchResult {
  type: string;
  score: number;
  data: any;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Focus input on mount & lock document scroll
  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    
    // Save prior focused element to restore it on close
    const priorFocused = document.activeElement as HTMLElement;

    return () => {
      document.body.style.overflow = "";
      priorFocused?.focus();
    };
  }, []);

  // Quick Actions Configuration
  const quickActions: QuickAction[] = [
    {
      id: "new-decision",
      label: "New Decision",
      hint: "Create Decision",
      icon: Plus,
      handler: () => {
        track("cmdbar_action_trigger", { action: "new_decision" });
        navigate("/memory?action=new-decision");
        onClose();
      }
    },
    {
      id: "new-goal",
      label: "New Goal",
      hint: "Create Goal",
      icon: Target,
      handler: () => {
        track("cmdbar_action_trigger", { action: "new_goal" });
        navigate("/plan?action=new-goal");
        onClose();
      }
    },
    {
      id: "open-execute",
      label: "Open Execute Workspace",
      hint: "Go to Execute",
      icon: Play,
      handler: () => {
        track("cmdbar_action_trigger", { action: "go_execute" });
        navigate("/execute");
        onClose();
      }
    },
    {
      id: "open-memory",
      label: "Open Memory / search",
      hint: "Go to Memory",
      icon: Brain,
      handler: () => {
        track("cmdbar_action_trigger", { action: "go_memory" });
        navigate("/memory");
        onClose();
      }
    }
  ];

  // Track which query the latest response belongs to
  const latestQueryRef = useRef("");

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    latestQueryRef.current = query;
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get(`/api/memory/search?q=${encodeURIComponent(query)}`);
        if (latestQueryRef.current === query) {
          setResults(response.data || []);
          setActiveIndex(0);
        }
      } catch (err) {
        console.error("Search query failed:", err);
      } finally {
        if (latestQueryRef.current === query) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Total selectable items count
  const itemsCount = query.trim() ? results.length : quickActions.length;

  // Execute selected item handler
  const handleExecute = useCallback((index: number) => {
    if (query.trim()) {
      const selected = results[index];
      if (!selected) return;

      track("cmdbar_search_result_click", { type: selected.type });
      
      // Navigate to matching workspace sections
      if (selected.type === "task") {
        navigate(`/execute?search=${encodeURIComponent(selected.data?.title || "")}`);
      } else if (selected.type === "goal") {
        navigate("/plan");
      } else if (selected.type === "decision") {
        navigate("/memory");
      } else if (selected.type === "meeting") {
        navigate("/memory");
      } else if (selected.type === "knowledge") {
        navigate("/memory");
      }
      onClose();
    } else {
      const selectedAction = quickActions[index];
      selectedAction?.handler();
    }
  }, [query, results, navigate, onClose, quickActions]);

  // Keyboard navigation & accessibility keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, itemsCount));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + itemsCount) % Math.max(1, itemsCount));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (itemsCount > 0) {
          handleExecute(activeIndex);
        }
      } else if (e.key === "Tab") {
        // Trap Focus
        const focusableElements = containerRef.current?.querySelectorAll(
          'input, button, [tabindex="0"]'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        
        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemsCount, activeIndex, handleExecute, onClose]);

  // Type specific icons helper
  const getIconForType = (type: string) => {
    switch (type) {
      case "task":
        return CheckSquare;
      case "goal":
        return Target;
      case "decision":
        return HelpCircle;
      case "meeting":
        return Calendar;
      case "knowledge":
        return FileText;
      default:
        return Sparkles;
    }
  };

  // Type specific prefix label helper
  const getLabelForType = (type: string, data: any) => {
    switch (type) {
      case "task":
        return `[TASK] [${data?.priority || "P2"}]`;
      case "goal":
        return `[GOAL] [${data?.goal_type || "weekly"}]`;
      case "decision":
        return `[DECISION] [${data?.status || "Confirmed"}]`;
      case "meeting":
        return `[MEETING]`;
      case "knowledge":
        return `[KNOWLEDGE]`;
      default:
        return "[RESULT]";
    }
  };

  // Search matches rendering content helper
  const getTitleForType = (type: string, data: any) => {
    if (type === "decision") return data?.decision || "";
    return data?.title || data?.decision || data?.summary || "";
  };

  return (
    <div className="cmdpalette-backdrop" onClick={onClose}>
      <div 
        ref={containerRef}
        className="cmdpalette" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmdpalette-input-row">
          <Search size={18} style={{ color: "var(--graphite)" }} />
          <input
            ref={inputRef}
            type="text"
            className="cmdpalette-input"
            placeholder="Ask FounDesk anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="cmdpalette-list card-list-scroll">
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--graphite)", fontSize: "13.5px" }}>
              Searching Ledger Memory...
            </div>
          ) : query.trim() ? (
            results.length > 0 ? (
              results.map((result, idx) => {
                const IconComponent = getIconForType(result.type);
                const isActive = idx === activeIndex;
                const title = getTitleForType(result.type, result.data);
                const label = getLabelForType(result.type, result.data);
                
                return (
                  <button
                    key={`${result.type}-${result.data?.id || idx}`}
                    className={`cmdpalette-item ${isActive ? "active" : ""}`}
                    onClick={() => handleExecute(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    tabIndex={0}
                  >
                    <IconComponent />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ 
                        fontFamily: "'JetBrains Mono', monospace", 
                        fontSize: "10.5px", 
                        color: isActive ? "var(--ember-light)" : "var(--graphite-dim)"
                      }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: "13.5px" }}>
                        {title}
                      </span>
                    </div>
                    <span className="cmdpalette-item-hint">⏎ Open</span>
                  </button>
                );
              })
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--graphite)", fontSize: "13.5px" }}>
                No records found. Try another query.
              </div>
            )
          ) : (
            quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              const isActive = idx === activeIndex;
              
              return (
                <button
                  key={action.id}
                  className={`cmdpalette-item ${isActive ? "active" : ""}`}
                  onClick={() => handleExecute(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  tabIndex={0}
                >
                  <ActionIcon />
                  <span style={{ fontFamily: "'Satoshi', sans-serif" }}>
                    {action.label}
                  </span>
                  <span className="cmdpalette-item-hint">{action.hint}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
