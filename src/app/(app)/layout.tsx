import Link from "next/link";
import { AccountButton } from "@/components/account-button";
import { PlusIcon } from "@/components/icons";
import { requireUser } from "@/lib/session";

// Desktop top bar (Airbnb-like). Phones keep each page's own compact header.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <>
      <header className="sticky top-0 z-30 hidden h-[72px] border-b border-line bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">V</span>
            <span className="text-lg font-bold tracking-tight">Voyages</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/voyages/nouveau"
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-surface"
            >
              <PlusIcon size={18} /> Nouveau voyage
            </Link>
            <AccountButton name={user.name} email={user.email} />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
