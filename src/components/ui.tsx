import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon } from "./icons";

export const btn = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-[15px] font-semibold text-white transition hover:bg-black disabled:opacity-60",
  secondary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold text-ink transition hover:bg-surface disabled:opacity-60",
  dashed:
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#c9c4bb] bg-white px-4 text-[15px] font-semibold text-muted transition hover:border-muted hover:text-ink",
  danger:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#f3c7c3] bg-white px-5 text-[15px] font-semibold text-danger transition hover:bg-[#fdf1f0]",
  icon: "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-surface",
};

export const inputClass =
  "block min-h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-[#8f8b84] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

const tones = {
  accent: "bg-accent-soft text-accent-strong",
  warm: "bg-warm-soft text-warm-strong",
  neutral: "bg-sand text-muted",
  dark: "bg-white text-ink",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ back, title, action }: { back: string; title: string; action?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-4 pt-5 pb-2">
      <Link href={back} aria-label="Page précédente" className={btn.icon}>
        <BackIcon size={22} />
      </Link>
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-accent">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {action}
    </div>
  );
}

export function Container({ children, className = "", wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={`mx-auto w-full ${wide ? "max-w-6xl md:px-6" : "max-w-2xl"} ${className}`}>{children}</div>;
}
