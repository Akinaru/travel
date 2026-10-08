import Link from "next/link";
import { Avatars } from "@/components/avatars";
import { Cover } from "@/components/cover";
import { BackIcon, FileIcon, HomeIcon, PinIcon, PlaneIcon, SettingsIcon, ShareIcon } from "@/components/icons";
import { Container } from "@/components/ui";
import { formatRange } from "@/lib/format";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";
import { TripTabs } from "./tabs";

const roundBtn = "flex h-11 items-center justify-center gap-2 rounded-full bg-white/95 text-ink shadow-sm backdrop-blur";
const pillBtn = "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold underline-offset-4 hover:bg-surface";

export default async function TripLayout({ children, params }: LayoutProps<"/voyages/[id]">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const members = await membersOf([trip.id]);
  const base = `/voyages/${trip.id}`;
  const subtitle = [trip.destination ?? "Destination à choisir", formatRange(trip.startDate, trip.endDate)].join(" · ");
  const quickAdd = [
    { href: `${base}/reservation/nouveau?type=vol`, label: "Un billet", icon: <PlaneIcon size={20} /> },
    { href: `${base}/reservation/nouveau?type=logement`, label: "Un logement", icon: <HomeIcon size={20} /> },
    { href: `${base}/programme#ajouter`, label: "Une activité", icon: <PinIcon size={20} /> },
    { href: `${base}/documents#ajouter`, label: "Un document", icon: <FileIcon size={20} /> },
  ];

  return (
    <Container wide className="min-h-dvh pb-16">
      {/* Desktop: title above a rounded hero photo, like a listing page. */}
      <div className="hidden items-end justify-between gap-6 pt-8 pb-5 md:flex">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
          <p className="text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link href={`${base}/reglages#partage`} className={pillBtn}>
            <ShareIcon size={18} /> Partager
          </Link>
          <Link href={`${base}/reglages`} className={pillBtn}>
            <SettingsIcon size={18} /> Réglages
          </Link>
        </div>
      </div>

      <div className="relative">
        <Cover
          src={trip.coverUrl}
          alt={trip.destination ?? trip.title}
          className="h-56 w-full md:h-[360px] md:rounded-3xl lg:h-[420px]"
          fallback={<PinIcon size={28} />}
        />
        <div className="absolute inset-x-0 top-0 flex justify-between p-4 md:hidden">
          <Link href="/" aria-label="Retour à mes voyages" className={`${roundBtn} w-11`}>
            <BackIcon size={20} />
          </Link>
          <div className="flex gap-2">
            <Link href={`${base}/reglages#partage`} className={`${roundBtn} px-4 text-sm font-semibold`}>
              <ShareIcon size={18} /> Partager
            </Link>
            <Link href={`${base}/reglages`} aria-label="Réglages du voyage" className={`${roundBtn} w-11`}>
              <SettingsIcon size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-0">
        <div className="flex items-start justify-between gap-3 pt-4 md:hidden">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{trip.title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
          <Avatars people={members} />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div className="min-w-0">
            <TripTabs tripId={trip.id} showIdeas={!trip.destination || trip.status === "idee"} />
            <div className="md:pt-2">{children}</div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[96px] mt-6 flex flex-col gap-5 rounded-3xl border border-line p-5 shadow-[0_6px_24px_rgba(28,27,25,0.06)]">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted">Dates</span>
                <span className="font-semibold">{formatRange(trip.startDate, trip.endDate)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted">Voyageurs</span>
                  <span className="font-semibold">{members.map((m) => m.name).join(", ")}</span>
                </div>
                <Avatars people={members} size={34} />
              </div>
              <div className="flex flex-col gap-2 border-t border-line pt-5">
                <span className="text-sm font-semibold">Ajouter</span>
                <div className="grid grid-cols-2 gap-2">
                  {quickAdd.map((q) => (
                    <Link
                      key={q.label}
                      href={q.href}
                      className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line text-sm font-semibold transition hover:border-ink"
                    >
                      <span className="text-accent">{q.icon}</span>
                      {q.label}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href={`${base}/reglages#partage`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-white hover:bg-black">
                <ShareIcon size={18} /> Inviter quelqu&apos;un
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
