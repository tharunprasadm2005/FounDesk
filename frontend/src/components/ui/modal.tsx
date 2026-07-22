import React, { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex="0"]'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--surface-overlay)] p-3 fd-enter"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="fd-panel relative flex max-h-[min(760px,calc(100vh-48px))] w-full max-w-[520px] flex-col overflow-hidden bg-[var(--surface-raised)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-3">
          <h2 id="modal-title" className="font-ui text-[16px] font-medium tracking-[0]">{title}</h2>
          <button
            onClick={onClose}
            className="fd-button h-[32px] min-h-0 w-[32px] p-0 text-[var(--text-muted)]"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export { Modal };
export default Modal;
