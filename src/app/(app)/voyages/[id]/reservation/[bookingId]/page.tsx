import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { deleteBooking } from "@/actions/bookings";
import { SubmitButton } from "@/components/forms";
import { btn, Container, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireTrip } from "@/lib/session";
import { BookingForm } from "../booking-form";

export default async function EditBookingPage({ params }: PageProps<"/voyages/[id]/reservation/[bookingId]">) {
  const { id, bookingId } = await params;
  const { trip } = await requireTrip(id);
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) notFound();
  const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.tripId, trip.id)));
  if (!booking) notFound();

  return (
    <Container>
      <PageHeader back={`/voyages/${trip.id}/reservations`} title="Modifier la réservation" />
      <div className="flex flex-col gap-4 px-5 pt-2 pb-10">
        <BookingForm tripId={trip.id} kind={booking.kind} booking={booking} />
        <form action={deleteBooking.bind(null, trip.id, booking.id)}>
          <SubmitButton className={`${btn.danger} w-full`} confirm="Supprimer cette réservation ?">
            Supprimer
          </SubmitButton>
        </form>
      </div>
    </Container>
  );
}
