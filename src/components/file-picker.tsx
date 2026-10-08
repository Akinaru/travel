"use client";

import { useState } from "react";
import { CheckIcon, UploadIcon } from "./icons";

// File field for forms that submit normally: shows what was picked.
export function FilePicker({ name, label, hint }: { name: string; label: string; hint: string }) {
  const [files, setFiles] = useState<string[]>([]);
  const picked = files.length > 0;
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-dashed px-4 py-3 transition ${
        picked ? "border-accent bg-accent-soft/50" : "border-[#c9c4bb] hover:border-muted"
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${picked ? "bg-accent text-white" : "bg-surface text-muted"}`}>
        {picked ? <CheckIcon size={18} strokeWidth={3} /> : <UploadIcon size={18} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold">{picked ? files.join(", ") : label}</span>
        <span className="text-[13px] text-muted">{picked ? "Touchez pour changer" : hint}</span>
      </span>
      <input
        type="file"
        name={name}
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(e) => setFiles(Array.from(e.currentTarget.files ?? []).map((f) => f.name))}
      />
    </label>
  );
}
