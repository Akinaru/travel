"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TripTabs({ tripId, showIdeas }: { tripId: string; showIdeas: boolean }) {
  const pathname = usePathname();
  const base = `/voyages/${tripId}`;
  const tabs = [
    ...(showIdeas ? [{ href: `${base}/idees`, label: "Idées" }] : []),
    { href: base, label: "Aperçu" },
    { href: `${base}/programme`, label: "Programme" },
    { href: `${base}/reservations`, label: "Réservations" },
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/demarches`, label: "Démarches" },
  ];
  return (
    <nav aria-label="Sections du voyage" className="sticky top-0 z-10 -mx-5 flex gap-2 overflow-x-auto bg-white/95 px-5 py-3 backdrop-blur [scrollbar-width:none] md:top-[72px] md:mx-0 md:px-0 md:py-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
              active ? "bg-ink text-white" : "border border-line hover:bg-surface"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
