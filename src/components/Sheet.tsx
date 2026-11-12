import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet on phones, centered dialog on wider screens. */
export default function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet-in">
          <header>
            <h2>{title}</h2>
            <button type="button" className="x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
