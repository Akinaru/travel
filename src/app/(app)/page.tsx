import Link from "next/link";
import { AccountButton } from "@/components/account-button";
import { Avatars } from "@/components/avatars";
import { Cover } from "@/components/cover";
import { ChevronIcon, FileIcon, PinIcon, PlaneIcon, PlusIcon } from "@/components/icons";
import { Badge, btn, Container, EmptyState } from "@/components/ui";
import { daysBetween, formatRange, formatShortDate, todayISO } from "@/lib/format";
import { tripsForUser, upcomingTasks } from "@/lib/queries";
import { requireUser } from "@/lib/session";

const STATUS = { idee: "En réflexion", preparation: "En préparation", confirme: "Confirmé", termine: "Terminé" };

function countdown(start: string | null, end: string | null, today: string) {
  if (!start) return null;
  const days = daysBetween(today, start);
  if (days > 1) return `Départ dans ${days} jours`;
  if (days === 1) return "Départ demain";
  if (days === 0) return "Départ aujourd'hui";
  if (end && daysBetween(today, end) >= 0) return "En cours";
  return null;
}

export default async function HomePage() {
  const user = await requireUser();
  const today = todayISO();
  const trips = await tripsForUser(user.id);
  const { items, deadlines } = await upcomingTasks(
    trips.filter((t) => t.status !== "termine").map((t) => t.id),
    today,
  );
  const hasTasks = items.length > 0 || deadlines.length > 0;

  return (
    <Container wide className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pt-7 pb-3 md:px-0 md:pt-10 md:pb-6">
        <div>
          <p className="text-sm text-muted md:text-base">Bonjour {user.name}</p>
          <h1 className="text-[28px] font-bold tracking-tight md:text-4xl">Vos voyages</h1>
        </div>
        <div className="md:hidden">
          <AccountButton name={user.name} email={user.email} />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-5 pt-2 pb-28 md:px-0 md:pb-16">
        {hasTasks && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold md:text-lg">À faire bientôt</h2>
            <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/voyages/${item.tripId}/demarches`}
                  className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface p-3.5 transition hover:bg-sand"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warm-soft text-warm">
                    <FileIcon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{item.label}</span>
                    <span className="text-[13px] text-muted">
                      {item.listTitle}
                      {item.dueDate ? ` · avant le ${formatShortDate(item.dueDate)}` : ""}
                    </span>
                  </span>
                  <ChevronIcon size={18} className="text-muted" />
                </Link>
              ))}
              {deadlines.map((b) => (
                <Link
                  key={b.id}
                  href={`/voyages/${b.tripId}/reservations`}
                  className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface p-3.5 transition hover:bg-sand"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <PlaneIcon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{b.title}</span>
                    <span className="text-[13px] text-muted">Modifiable jusqu&apos;au {formatShortDate(b.changeDeadline!)}</span>
                  </span>
                  <ChevronIcon size={18} className="text-muted" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {trips.length === 0 ? (
          <EmptyState
            icon={<PlaneIcon size={26} />}
            title="Aucun voyage pour l'instant"
            text="Créez votre premier voyage : la photo de la destination s'ajoute toute seule."
            action={
              <div className="mt-2 hidden md:block">
                <Link href="/voyages/nouveau" className={btn.primary}>
                  <PlusIcon size={18} /> Nouveau voyage
                </Link>
              </div>
            }
          />
        ) : (
          <section className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const when = countdown(trip.startDate, trip.endDate, today);
              return (
                <Link
                  key={trip.id}
                  href={trip.status === "idee" ? `/voyages/${trip.id}/idees` : `/voyages/${trip.id}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative overflow-hidden rounded-3xl">
                    <Cover
                      src={trip.coverUrl}
                      alt={trip.destination ?? trip.title}
                      className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]"
                      fallback={
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <PinIcon size={20} /> {trip.destination ?? "Destination à choisir"}
                        </span>
                      }
                    />
                    <span className="absolute top-3 left-3">
                      <Badge tone="dark">{STATUS[trip.status]}</Badge>
                    </span>
                    <span className="absolute right-3 bottom-3">
                      <Avatars people={trip.members} />
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-1">
                    <span className="text-[17px] font-bold">{trip.title}</span>
                    <span className="text-sm text-muted">{trip.destination ?? "Destination à choisir"}</span>
                    <span className="text-sm text-muted">{when ?? formatRange(trip.startDate, trip.endDate)}</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Link href="/voyages/nouveau" className={`${btn.primary} w-full`}>
          <PlusIcon size={18} /> Nouveau voyage
        </Link>
      </div>
    </Container>
  );
}
