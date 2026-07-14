import React, { useEffect, useState } from "react";
import CommandPalette from "./CommandPalette";

const CommandBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Global keydown listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Command (Meta) or Control + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Window listener for custom event trigger (e.g. from Sidebar icon button)
  useEffect(() => {
    const handleOpenPalette = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-command-palette", handleOpenPalette);
    return () => window.removeEventListener("open-command-palette", handleOpenPalette);
  }, []);

  return (
    <>
      {isOpen && (
        <CommandPalette onClose={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default CommandBar;
