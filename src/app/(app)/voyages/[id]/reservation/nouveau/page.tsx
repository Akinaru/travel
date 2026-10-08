import Link from "next/link";
import { Container, PageHeader } from "@/components/ui";
import { requireTrip } from "@/lib/session";
import { BookingForm } from "../booking-form";

export default async function NewBookingPage({ params, searchParams }: PageProps<"/voyages/[id]/reservation/nouveau">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const isStay = (await searchParams).type === "logement";
  const base = `/voyages/${trip.id}/reservation/nouveau`;
  const tab = (active: boolean) =>
    `flex h-11 items-center justify-center rounded-xl text-sm font-semibold ${active ? "bg-white shadow-sm" : "text-muted"}`;

  return (
    <Container>
      <PageHeader back={`/voyages/${trip.id}/reservations`} title={isStay ? "Ajouter un logement" : "Ajouter un billet"} />
      <div className="flex flex-col gap-5 px-5 pt-2 pb-10">
        <div className="grid grid-cols-2 rounded-2xl bg-sand p-1">
          <Link href={`${base}?type=vol`} replace className={tab(!isStay)} aria-current={!isStay ? "page" : undefined}>
            Billet
          </Link>
          <Link href={`${base}?type=logement`} replace className={tab(isStay)} aria-current={isStay ? "page" : undefined}>
            Logement
          </Link>
        </div>
        <BookingForm key={isStay ? "stay" : "transport"} tripId={trip.id} kind={isStay ? "logement" : "vol"} />
      </div>
    </Container>
  );
}
