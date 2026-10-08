"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmModal } from "./modal";

export type ActionState = { error?: string } | undefined;

// Form bound to a Server Action that may return a user-facing error message.
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-[#fdf1f0] px-3.5 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

// Submit button; with `confirm`, asks in a modal before submitting (used for deletions).
export function SubmitButton({
  children,
  className,
  pendingLabel,
  confirm,
  confirmText,
  confirmLabel = "Supprimer",
  danger = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  confirm?: string;
  confirmText?: string;
  confirmLabel?: string;
  danger?: boolean;
  "aria-label"?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const [asking, setAsking] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const label = pending && pendingLabel ? pendingLabel : children;

  if (!confirm) {
    return (
      <button type="submit" disabled={pending} className={className} {...rest}>
        {label}
      </button>
    );
  }
  return (
    <>
      <button ref={ref} type="button" disabled={pending} className={className} onClick={() => setAsking(true)} {...rest}>
        {label}
      </button>
      <ConfirmModal
        open={asking}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          ref.current?.form?.requestSubmit();
        }}
        title={confirm}
        text={confirmText}
        confirmLabel={confirmLabel}
        danger={danger}
      />
    </>
  );
}
