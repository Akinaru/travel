"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Native <dialog>: focus trap, Escape and inert background come from the browser.
// Bottom sheet on phones, centered card on larger screens.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-white p-0 text-ink backdrop:bg-[#1c1b19]/45 sm:mb-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
        <span className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel = "Confirmer",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {text && <p className="-mt-2 text-[15px] text-muted">{text}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-2xl border border-line text-[15px] font-semibold hover:bg-surface"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-12 rounded-2xl text-[15px] font-semibold text-white ${danger ? "bg-danger hover:bg-[#9a1d14]" : "bg-ink hover:bg-black"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
