"use client";

import { useActionState, useRef, type ReactNode } from "react";
import type { ActionState } from "./forms";

// One tap: pick files, upload starts immediately.
export function UploadButton({
  action,
  category,
  itemId,
  className,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  category?: string;
  itemId?: string;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {category && <input type="hidden" name="category" value={category} />}
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      <label className={`${className} cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
        <input
          type="file"
          name="files"
          multiple={!itemId}
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(e) => {
            if (e.currentTarget.files?.length) formRef.current?.requestSubmit();
          }}
        />
        {pending ? "Envoi en cours…" : children}
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-[#fdf1f0] px-3.5 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
