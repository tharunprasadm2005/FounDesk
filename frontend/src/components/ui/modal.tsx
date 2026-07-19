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

    // Body scroll lock + Lenis scroll prevent
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-lenis-prevent", "true");

    // Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // Focus trap
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex="0"]'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    return () => {
      document.body.style.overflow = "";
      document.body.removeAttribute("data-lenis-prevent");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="card-japandi w-full max-w-[480px] flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-lg font-heading m-0">{title}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-foreground text-xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}

export { Modal };
export default Modal;
