import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { BookingStatus, KindIcon, KIND_LABEL } from "@/components/booking-visuals";
import { Cover } from "@/components/cover";
import { ExternalIcon, FileIcon, HomeIcon, PinIcon, PlaneIcon, PlusIcon } from "@/components/icons";
import { btn, EmptyState, SectionTitle } from "@/components/ui";
import { db } from "@/db";
import { bookingChanges, bookings, documents, type Booking } from "@/db/schema";
import { formatDay, formatShortDate, formatTime } from "@/lib/format";
import { requireTrip } from "@/lib/session";

type Change = { bookingId: string; summary: string; createdAt: Date };
type Ticket = { id: string; bookingId: string | null; name: string };

function mapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function BookingCard({ b, tripId, changes, tickets }: { b: Booking; tripId: string; changes: Change[]; tickets: Ticket[] }) {
  const isStay = b.kind === "logement";
  const place = b.address ?? b.toPlace;
  return (
    <article className="overflow-hidden rounded-3xl border border-line">
      <div className="relative">
        <Cover src={b.imageUrl} alt="" className="h-36 w-full" fallback={<KindIcon kind={b.kind} size={28} />} />
        <span className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-semibold">
            <KindIcon kind={b.kind} size={14} /> {KIND_LABEL[b.kind]}
          </span>
          <BookingStatus status={b.status} />
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {(isStay || !(b.fromPlace || b.toPlace)) && <h3 className="text-[17px] font-bold">{b.title}</h3>}
        {!isStay && (b.fromPlace || b.toPlace) && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xl font-bold">{b.fromPlace ?? "—"}</span>
              <span className="text-[13px] text-muted">
                {b.startAt ? `${formatDay(b.startAt)} · ${formatTime(b.startAt) ?? ""}` : "Date à définir"}
              </span>
            </div>
            <span className="flex flex-1 items-center gap-1.5 text-muted">
              <span className="h-px flex-1 bg-line" />
              <PlaneIcon size={16} />
              <span className="h-px flex-1 bg-line" />
            </span>
            <div className="flex min-w-0 flex-col items-end">
              <span className="truncate text-xl font-bold">{b.toPlace ?? "—"}</span>
              <span className="text-[13px] text-muted">{b.endAt ? `${formatDay(b.endAt)} · ${formatTime(b.endAt) ?? ""}` : ""}</span>
            </div>
          </div>
        )}
        {isStay && (
          <p className="text-sm text-muted">
            {b.startAt ? `Arrivée ${formatDay(b.startAt)}${formatTime(b.startAt) ? ` dès ${formatTime(b.startAt)}` : ""}` : "Dates à définir"}
            {b.endAt ? ` · Départ ${formatDay(b.endAt)}` : ""}
            {b.address ? <><br />{b.address}</> : null}
          </p>
        )}
        {(b.reference || b.provider || b.price) && (
          <p className="text-[13px] text-muted">
            {[b.provider, b.reference && `Réf. ${b.reference}`, b.price].filter(Boolean).join(" · ")}
          </p>
        )}
        {b.notes && <p className="text-sm whitespace-pre-line">{b.notes}</p>}
      </div>

      {(b.changeDeadline || changes.length > 0) && (
        <div className="flex flex-col gap-1 bg-warm-soft px-4 py-3 text-[13px] text-[#6e300c]">
          {b.changeDeadline && <span className="font-bold">Modifiable jusqu&apos;au {formatShortDate(b.changeDeadline)}</span>}
          {changes.map((c) => (
            <span key={c.createdAt.toISOString()}>
              Changement du {c.createdAt.toLocaleDateString("fr-FR")} : {c.summary}
            </span>
          ))}
        </div>
      )}

      <div className="grid auto-cols-fr grid-flow-col border-t border-line text-sm font-semibold">
        <Link href={`/voyages/${tripId}/reservation/${b.id}`} className="flex h-12 items-center justify-center hover:bg-surface">
          Modifier
        </Link>
        {tickets[0] && (
          <a href={`/api/documents/${tickets[0].id}`} target="_blank" rel="noopener" className="flex h-12 items-center justify-center gap-1.5 border-l border-line hover:bg-surface">
            <FileIcon size={14} /> {b.kind === "logement" ? "Confirmation" : "Billet"}
          </a>
        )}
        {b.url && (
          <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-1.5 border-l border-line hover:bg-surface">
            Ouvrir <ExternalIcon size={14} />
          </a>
        )}
        {isStay && place && (
          <a href={mapsLink(place)} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-1.5 border-l border-line hover:bg-surface">
            Itinéraire <PinIcon size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

export default async function ReservationsPage({ params }: PageProps<"/voyages/[id]/reservations">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const rows = await db.select().from(bookings).where(eq(bookings.tripId, trip.id)).orderBy(sql`${bookings.startAt} asc nulls last`);
  const changes = rows.length
    ? await db
        .select({ bookingId: bookingChanges.bookingId, summary: bookingChanges.summary, createdAt: bookingChanges.createdAt })
        .from(bookingChanges)
        .where(inArray(bookingChanges.bookingId, rows.map((r) => r.id)))
        .orderBy(desc(bookingChanges.createdAt))
    : [];
  const tickets = rows.length
    ? await db
        .select({ id: documents.id, bookingId: documents.bookingId, name: documents.name })
        .from(documents)
        .where(inArray(documents.bookingId, rows.map((r) => r.id)))
        .orderBy(desc(documents.createdAt))
    : [];

  const transports = rows.filter((r) => r.kind !== "logement");
  const stays = rows.filter((r) => r.kind === "logement");
  const base = `/voyages/${trip.id}/reservation/nouveau`;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <EmptyState
          icon={<PlaneIcon size={26} />}
          title="Aucune réservation"
          text="Ajoutez un billet en 3 champs, ou un logement en collant simplement le lien de l'annonce."
        />
        <div className="grid grid-cols-2 gap-3">
          <Link href={`${base}?type=vol`} className={btn.secondary}>
            <PlaneIcon size={18} /> Un billet
          </Link>
          <Link href={`${base}?type=logement`} className={btn.secondary}>
            <HomeIcon size={18} /> Un logement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <SectionTitle>Transports</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {transports.map((b) => (
          <BookingCard key={b.id} b={b} tripId={trip.id} changes={changes.filter((c) => c.bookingId === b.id)} tickets={tickets.filter((t) => t.bookingId === b.id)} />
        ))}
      </div>
      <Link href={`${base}?type=vol`} className={btn.dashed}>
        <PlusIcon size={18} /> Ajouter un billet
      </Link>

      <SectionTitle>Logements</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {stays.map((b) => (
          <BookingCard key={b.id} b={b} tripId={trip.id} changes={changes.filter((c) => c.bookingId === b.id)} tickets={tickets.filter((t) => t.bookingId === b.id)} />
        ))}
      </div>
      <Link href={`${base}?type=logement`} className={btn.dashed}>
        <PlusIcon size={18} /> Ajouter un logement
      </Link>
    </div>
  );
}
