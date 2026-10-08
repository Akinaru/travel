"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Modal } from "./modal";

export function AccountButton({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Mon compte"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-full bg-accent text-base font-semibold text-white"
      >
        {name.trim().charAt(0).toUpperCase()}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Mon compte">
        <div className="-mt-2 flex flex-col">
          <span className="text-[15px] font-semibold">{name}</span>
          <span className="text-sm text-muted">{email}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-2xl border border-line text-[15px] font-semibold hover:bg-surface">
            Fermer
          </button>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/connexion");
            }}
            className="min-h-12 rounded-2xl bg-ink text-[15px] font-semibold text-white hover:bg-black"
          >
            Se déconnecter
          </button>
        </div>
      </Modal>
    </>
  );
}
