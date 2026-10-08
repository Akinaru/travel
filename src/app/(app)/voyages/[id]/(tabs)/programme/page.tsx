import { and, asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { addActivity, deleteActivity } from "@/actions/activities";
import { KindIcon } from "@/components/booking-visuals";
import { Cover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ExternalIcon, PinIcon, TrashIcon } from "@/components/icons";
import { btn, Field, inputClass, SectionTitle } from "@/components/ui";
import { db } from "@/db";
import { activities, bookings } from "@/db/schema";
import { eachDay, formatLongDay, formatTime, todayISO } from "@/lib/format";
import { requireTrip } from "@/lib/session";

type Entry = {
  key: string;
  time: string | null;
  title: string;
  sub: string | null;
  imageUrl: string | null;
  icon: React.ReactNode;
  url?: string | null;
  activityId?: string;
};

export default async function ProgrammePage({ params, searchParams }: PageProps<"/voyages/[id]/programme">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const [tripActivities, tripBookings] = await Promise.all([
    db.select().from(activities).where(eq(activities.tripId, trip.id)).orderBy(asc(activities.day), sql`${activities.time} asc nulls first`),
    db.select().from(bookings).where(and(eq(bookings.tripId, trip.id), sql`${bookings.status} <> 'annule'`)),
  ]);

  const days =
    trip.startDate && trip.endDate
      ? eachDay(trip.startDate, trip.endDate)
      : [...new Set(tripActivities.map((a) => a.day))].sort();
  const today = todayISO();
  const requested = (await searchParams).jour;
  const selected =
    typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : days.includes(today)
        ? today
        : (days[0] ?? trip.startDate ?? today);

  // Bookings appear on the day they start (departure, check-in) and on the day a stay ends.
  const entries: Entry[] = [];
  for (const b of tripBookings) {
    if (b.startAt?.startsWith(selected)) {
      entries.push({
        key: `b-${b.id}`,
        time: formatTime(b.startAt),
        title: b.kind === "logement" ? `Arrivée : ${b.title}` : b.title,
        sub: b.kind === "logement" ? b.address : b.reference ? `Réf. ${b.reference}` : null,
        imageUrl: b.imageUrl,
        icon: <KindIcon kind={b.kind} />,
      });
    }
    if (b.kind === "logement" && b.endAt?.startsWith(selected)) {
      entries.push({ key: `e-${b.id}`, time: formatTime(b.endAt), title: `Départ : ${b.title}`, sub: null, imageUrl: b.imageUrl, icon: <KindIcon kind="logement" /> });
    }
  }
  for (const a of tripActivities.filter((a) => a.day === selected)) {
    entries.push({ key: a.id, time: a.time, title: a.title, sub: a.place ?? a.notes, imageUrl: a.imageUrl, icon: <PinIcon />, url: a.url, activityId: a.id });
  }
  entries.sort((x, y) => (x.time ?? "").localeCompare(y.time ?? ""));
  const counts = new Map<string, number>();
  for (const a of tripActivities) counts.set(a.day, (counts.get(a.day) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-4 pt-1">
      {days.length > 0 ? (
        <div role="group" aria-label="Choisir un jour" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {days.map((d) => {
            const active = d === selected;
            const date = new Date(`${d}T00:00:00Z`);
            return (
              <Link
                key={d}
                href={`?jour=${d}`}
                replace
                scroll={false}
                aria-current={active ? "date" : undefined}
                className={`relative flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
                  active ? "bg-ink text-white" : "border border-line"
                }`}
              >
                <span className="text-xs">{date.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" })}</span>
                <span className="text-lg font-bold">{date.getUTCDate()}</span>
                {counts.get(d) ? <span className={`absolute bottom-1.5 size-1 rounded-full ${active ? "bg-white" : "bg-warm"}`} /> : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
          Ajoutez les dates du voyage dans{" "}
          <Link href={`/voyages/${trip.id}/reglages`} className="font-semibold text-accent-strong underline">
            les réglages
          </Link>{" "}
          pour afficher un calendrier jour par jour.
        </p>
      )}

      <SectionTitle>{formatLongDay(selected)}</SectionTitle>
      {entries.length === 0 && <p className="text-sm text-muted">Rien de prévu ce jour-là.</p>}
      <ol className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.key} className="flex gap-3">
            <span className="w-12 shrink-0 pt-4 text-sm font-semibold">{e.time ?? ""}</span>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line p-2.5">
              <Cover src={e.imageUrl} alt="" className="size-14 shrink-0 rounded-xl" fallback={e.icon} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{e.title}</span>
                {e.sub && <span className="truncate text-[13px] text-muted">{e.sub}</span>}
              </div>
              {e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien" className={btn.icon}>
                  <ExternalIcon size={18} />
                </a>
              )}
              {e.activityId && (
                <form action={deleteActivity.bind(null, trip.id, e.activityId)}>
                  <SubmitButton className={`${btn.icon} text-muted`} aria-label="Supprimer l'activité" confirm="Supprimer cette activité ?">
                    <TrashIcon size={18} />
                  </SubmitButton>
                </form>
              )}
            </div>
          </li>
        ))}
      </ol>

      <section id="ajouter" className="mt-2 flex scroll-mt-20 flex-col gap-4 rounded-3xl bg-surface p-4">
        <h2 className="text-base font-bold">Ajouter une activité</h2>
        <ActionForm key={selected} action={addActivity.bind(null, trip.id)} className="flex flex-col gap-4">
          <Field label="Quoi ?">
            <input name="title" required placeholder="Ex. : Visite de la Zona Colonial" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jour">
              <input name="day" type="date" required defaultValue={selected} className={inputClass} />
            </Field>
            <Field label="Heure">
              <input name="time" type="time" className={inputClass} />
            </Field>
          </div>
          <Field label="Lieu" hint="Une photo du lieu est ajoutée automatiquement si elle existe.">
            <input name="place" className={inputClass} />
          </Field>
          <Field label="Lien" hint="Facultatif : réservation, site, avis…">
            <input name="url" type="url" inputMode="url" placeholder="https://" className={inputClass} />
          </Field>
          <SubmitButton className={btn.primary} pendingLabel="Ajout…">
            Ajouter au programme
          </SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
