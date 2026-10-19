import { asc, count, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus, KindIcon } from "@/components/booking-visuals";
import { Cover } from "@/components/cover";
import { ChevronIcon, FileIcon, FolderIcon, HomeIcon, PinIcon, PlaneIcon } from "@/components/icons";
import { SectionTitle } from "@/components/ui";
import { db } from "@/db";
import { activities, bookings, checklistItems, checklists, documents, ideaCosts } from "@/db/schema";
import { estimate, estimateBasis } from "@/lib/estimate";
import { formatDateTime, formatEuroRange, formatShortDate } from "@/lib/format";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";

export default async function TripOverviewPage({ params }: PageProps<"/voyages/[id]">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  if (trip.status === "idee") redirect(`/voyages/${trip.id}/idees`);

  const [lists, tripBookings, [{ docCount }], [{ activityCount }], budget] = await Promise.all([
    db
      .select({
        id: checklists.id,
        title: checklists.title,
        dueDate: checklists.dueDate,
        total: count(checklistItems.id),
        done: sql<number>`count(*) filter (where ${checklistItems.status} = 'done')`.mapWith(Number),
        next: sql<string | null>`(array_agg(${checklistItems.label} order by ${checklistItems.position}) filter (where ${checklistItems.status} <> 'done'))[1]`,
      })
      .from(checklists)
      .leftJoin(checklistItems, eq(checklistItems.checklistId, checklists.id))
      .where(eq(checklists.tripId, trip.id))
      .groupBy(checklists.id)
      .orderBy(asc(checklists.createdAt)),
    db
      .select()
      .from(bookings)
      .where(eq(bookings.tripId, trip.id))
      .orderBy(sql`${bookings.startAt} asc nulls last`),
    db.select({ docCount: count() }).from(documents).where(eq(documents.tripId, trip.id)),
    db.select({ activityCount: count() }).from(activities).where(eq(activities.tripId, trip.id)),
    chosenBudget(trip),
  ]);

  const base = `/voyages/${trip.id}`;
  const quickAdd = [
    { href: `${base}/reservation/nouveau?type=vol`, label: "Un billet", icon: <PlaneIcon size={22} /> },
    { href: `${base}/reservation/nouveau?type=logement`, label: "Un logement", icon: <HomeIcon size={22} /> },
    { href: `${base}/programme#ajouter`, label: "Une activité", icon: <PinIcon size={22} /> },
    { href: `${base}/documents#ajouter`, label: "Un document", icon: <FileIcon size={22} /> },
  ];

  return (
    <div className="flex flex-col gap-3 pt-2">
      {budget && (
        <Link href={`${base}/idee/${trip.chosenIdeaId}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 transition hover:bg-surface">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] text-muted">Budget estimé</span>
            <span className="text-lg font-bold">{formatEuroRange(budget.min, budget.max)}</span>
          </span>
          <ChevronIcon size={18} className="text-muted" />
        </Link>
      )}
      {lists.map((list) => {
        const pct = list.total ? Math.round((list.done / list.total) * 100) : 0;
        return (
          <Link key={list.id} href={`${base}/demarches`} className="flex flex-col gap-2.5 rounded-2xl bg-warm-soft p-4 text-[#6e300c]">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold">{list.title}</span>
              <span className="text-sm font-semibold">
                {list.done} / {list.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-[#f2d3bd]">
              <div className="h-full bg-warm" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[13px]">
              {list.next ? `Prochaine étape : ${list.next}` : "Tout est prêt"}
              {list.dueDate ? ` · avant le ${formatShortDate(list.dueDate)}` : ""}
            </span>
          </Link>
        );
      })}

      {tripBookings.length > 0 && <SectionTitle>Réservations</SectionTitle>}
      {tripBookings.slice(0, 4).map((b) => (
        <Link key={b.id} href={`${base}/reservations`} className="flex items-center gap-3.5 rounded-2xl border border-line p-3">
          <Cover src={b.imageUrl} alt="" className="size-14 shrink-0 rounded-xl" fallback={<KindIcon kind={b.kind} />} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{b.title}</span>
            <span className="text-[13px] text-muted">{b.startAt ? formatDateTime(b.startAt) : "Date à définir"}</span>
          </span>
          <BookingStatus status={b.status} />
        </Link>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Link href={`${base}/documents`} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
          <FolderIcon size={22} className="text-muted" />
          <span className="text-[15px] font-semibold">Documents</span>
          <span className="text-[13px] text-muted">{docCount === 0 ? "Aucun fichier" : `${docCount} fichier${docCount > 1 ? "s" : ""}`}</span>
        </Link>
        <Link href={`${base}/programme`} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
          <PinIcon size={22} className="text-muted" />
          <span className="text-[15px] font-semibold">Programme</span>
          <span className="text-[13px] text-muted">
            {activityCount === 0 ? "Rien de prévu" : `${activityCount} activité${activityCount > 1 ? "s" : ""}`}
          </span>
        </Link>
      </div>

      <div className="lg:hidden">
        <SectionTitle>Ajouter</SectionTitle>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {quickAdd.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-semibold transition hover:bg-surface"
          >
            <span className="text-accent">{q.icon}</span>
            {q.label}
          </Link>
        ))}
      </div>
      {lists.length === 0 && (
        <Link href={`${base}/demarches`} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
          <FileIcon size={20} className="text-warm" />
          <span className="flex-1 text-sm">
            <span className="font-semibold">Visa ou papiers à préparer ?</span>{" "}
            <span className="text-muted">Créez une liste de démarches.</span>
          </span>
          <ChevronIcon size={18} className="text-muted" />
        </Link>
      )}
    </div>
  );
}

// Estimate of the destination picked after comparing ideas, if it had prices.
async function chosenBudget(trip: Awaited<ReturnType<typeof requireTrip>>["trip"]) {
  if (!trip.chosenIdeaId) return null;
  const [costs, members] = await Promise.all([
    db.select().from(ideaCosts).where(eq(ideaCosts.ideaId, trip.chosenIdeaId)),
    membersOf([trip.id]),
  ]);
  return costs.length ? estimate(costs, estimateBasis(trip, members.length)) : null;
}
