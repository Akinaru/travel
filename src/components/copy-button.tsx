"use client";

import { useState } from "react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        // Phones: open the native share sheet (WhatsApp, SMS…) when available.
        if (navigator.share) {
          await navigator.share({ title: "Rejoins notre voyage", url: text }).catch(() => {});
          return;
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Lien copié" : "Envoyer le lien"}
    </button>
  );
}
