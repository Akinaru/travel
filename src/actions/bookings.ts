"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { bookingChanges, bookings } from "@/db/schema";
import { filesFrom, invalidFile, storeDocuments } from "@/lib/documents";
import { formatDateTime } from "@/lib/format";
import { firstError, formObject, optionalDate, optionalDateTime, optionalText, optionalUrl } from "@/lib/forms";
import { lookupPlace, pagePreview } from "@/lib/images";
import { requireTrip } from "@/lib/session";

const bookingSchema = z
  .object({
    kind: z.enum(["vol", "train", "bus", "voiture", "logement", "autre"]),
    title: optionalText,
    fromPlace: optionalText,
    toPlace: optionalText,
    startAt: optionalDateTime,
    endAt: optionalDateTime,
    reference: optionalText,
    provider: optionalText,
    address: optionalText,
    url: optionalUrl,
    price: optionalText,
    status: z.enum(["option", "reserve", "annule"]).catch("reserve"),
    changeDeadline: optionalDate,
    notes: optionalText,
  })
  .refine((b) => !b.startAt || !b.endAt || b.endAt >= b.startAt, "La fin doit être après le début")
  .refine((b) => b.kind === "logement" || (b.fromPlace && b.toPlace), "Indiquez le départ et l'arrivée")
  .refine((b) => b.kind !== "logement" || b.url || b.title || b.toPlace, "Collez le lien de l'annonce ou indiquez un nom");

type BookingInput = z.infer<typeof bookingSchema>;

const KIND_LABELS = { vol: "Vol", train: "Train", bus: "Bus", voiture: "Voiture", logement: "Logement", autre: "Réservation" };

const PROVIDERS: [RegExp, string][] = [
  [/airbnb\./, "Airbnb"],
  [/booking\.com/, "Booking.com"],
  [/abritel\.|vrbo\./, "Abritel"],
  [/hotels\.com/, "Hotels.com"],
  [/expedia\./, "Expedia"],
];

function providerFromUrl(url: string | null) {
  if (!url) return null;
  const host = new URL(url).hostname;
  return PROVIDERS.find(([re]) => re.test(host))?.[1] ?? null;
}

// Fills what the user did not type: title, provider and photo come from the link or the places.
async function complete(b: BookingInput, tripDestination: string | null) {
  const preview = b.url ? await pagePreview(b.url) : { imageUrl: null, title: null };
  const provider = b.provider ?? providerFromUrl(b.url);
  let title = b.title;
  if (!title && b.kind === "logement") title = preview.title ?? (provider && b.toPlace ? `${provider} · ${b.toPlace}` : (b.toPlace ?? provider));
  if (!title && b.fromPlace && b.toPlace) title = `${b.fromPlace} → ${b.toPlace}`;
  title ??= KIND_LABELS[b.kind];

  let imageUrl = preview.imageUrl;
  const place = b.toPlace ?? tripDestination;
  if (!imageUrl && place) imageUrl = (await lookupPlace(place)).imageUrl;
  return { title, provider, imageUrl };
}

// Stays have a single "where" field: a listing link or just a name.
function withPlace(input: Record<string, string>) {
  if (!("where" in input)) return input;
  const where = input.where.trim();
  if (/^https?:\/\//i.test(where)) return { ...input, url: where };
  return { ...input, url: "", title: input.title?.trim() || where };
}

// Stays are edited with date-only fields: keep the stored time when the day is unchanged.
function keepTime(next: string | null, previous: string | null) {
  if (next?.endsWith(" 00:00:00") && previous?.startsWith(next.slice(0, 10))) return previous;
  return next;
}

export async function saveBooking(
  tripId: string,
  bookingId: string | null,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { trip, user } = await requireTrip(tripId);
  const parsed = bookingSchema.safeParse(withPlace(formObject(formData)));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;
  const tickets = filesFrom(formData, "ticket");
  const invalid = invalidFile(tickets);
  if (invalid) return { error: invalid };

  let savedId: string;
  if (!bookingId) {
    const extra = await complete(data, trip.destination);
    const [created] = await db
      .insert(bookings)
      .values({ ...data, ...extra, title: extra.title, tripId: trip.id })
      .returning({ id: bookings.id });
    savedId = created.id;
  } else {
    const [existing] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tripId, trip.id)));
    if (!existing) return { error: "Réservation introuvable" };
    data.startAt = keepTime(data.startAt, existing.startAt);
    data.endAt = keepTime(data.endAt, existing.endAt);

    const linkChanged = data.url !== existing.url || data.toPlace !== existing.toPlace;
    const extra = linkChanged || !existing.imageUrl ? await complete(data, trip.destination) : null;
    const title = data.title ?? extra?.title ?? existing.title;
    const imageUrl = extra ? extra.imageUrl : existing.imageUrl;
    const provider = data.provider ?? extra?.provider ?? null;

    const changes: string[] = [];
    const describe = (v: string | null) => (v ? formatDateTime(v) : "non défini");
    if (existing.startAt !== data.startAt) changes.push(`Départ : ${describe(existing.startAt)} → ${describe(data.startAt)}`);
    if (existing.endAt !== data.endAt) changes.push(`Fin : ${describe(existing.endAt)} → ${describe(data.endAt)}`);

    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ ...data, title, imageUrl, provider }).where(eq(bookings.id, existing.id));
      if (changes.length) {
        await tx.insert(bookingChanges).values({ bookingId: existing.id, summary: changes.join(" · "), userId: user.id });
      }
    });
    savedId = existing.id;
  }

  if (tickets.length) {
    await storeDocuments(tickets, {
      tripId: trip.id,
      userId: user.id,
      category: data.kind === "logement" ? "logement" : "billets",
      bookingId: savedId,
    });
  }

  revalidatePath(`/voyages/${trip.id}`, "layout");
  redirect(`/voyages/${trip.id}/reservations`);
}

export async function deleteBooking(tripId: string, bookingId: string) {
  const { trip } = await requireTrip(tripId);
  await db.delete(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.tripId, trip.id)));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  redirect(`/voyages/${trip.id}/reservations`);
}
