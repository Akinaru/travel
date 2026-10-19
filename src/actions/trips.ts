"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { tripMembers, trips } from "@/db/schema";
import { deleteTripWithFiles } from "@/lib/documents";
import { firstError, formObject, optionalAmount, optionalDate, optionalText, requiredText } from "@/lib/forms";
import { lookupPlace } from "@/lib/images";
import { requireTrip, requireUser } from "@/lib/session";

const tripSchema = z
  .object({
    title: requiredText("Donnez un nom au voyage"),
    // "idee": still comparing destinations; "decide": the destination is known.
    phase: z.enum(["idee", "decide"]).default("idee"),
    destination: optionalText,
    startDate: optionalDate,
    endDate: optionalDate,
    travelers: optionalAmount,
  })
  .refine((t) => t.phase === "idee" || t.destination, "Indiquez la destination")
  .refine((t) => t.travelers === null || (t.travelers >= 1 && t.travelers <= 50), "Nombre de voyageurs invalide")
  .refine((t) => !t.startDate || !t.endDate || t.endDate >= t.startDate, "Le retour doit être après le départ");

export async function createTrip(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = tripSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { phase, ...data } = parsed.data;
  const destination = phase === "decide" ? data.destination : null;

  const coverUrl = destination ? (await lookupPlace(destination)).imageUrl : null;
  const tripId = await db.transaction(async (tx) => {
    const [trip] = await tx
      .insert(trips)
      .values({ ...data, destination, coverUrl, status: destination ? "preparation" : "idee", createdBy: user.id })
      .returning({ id: trips.id });
    await tx.insert(tripMembers).values({ tripId: trip.id, userId: user.id, role: "owner" });
    return trip.id;
  });

  redirect(destination ? `/voyages/${tripId}` : `/voyages/${tripId}/idees`);
}

const basisSchema = z
  .object({ travelers: optionalAmount, nights: optionalAmount })
  .refine((b) => b.travelers === null || (b.travelers >= 1 && b.travelers <= 50), "Nombre de voyageurs invalide")
  .refine((b) => b.nights === null || b.nights <= 365, "Nombre de nuits invalide");

// Number of travellers and nights used to turn per-person / per-night prices into a trip total.
export async function updateEstimateBasis(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const parsed = basisSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.update(trips).set(parsed.data).where(eq(trips.id, trip.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

const updateSchema = z
  .object({
    title: requiredText("Donnez un nom au voyage"),
    destination: optionalText,
    startDate: optionalDate,
    endDate: optionalDate,
    status: z.enum(["idee", "preparation", "confirme", "termine"]),
  })
  .refine((t) => !t.startDate || !t.endDate || t.endDate >= t.startDate, "Le retour doit être après le départ");

export async function updateTrip(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const parsed = updateSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  let coverUrl = trip.coverUrl;
  if (data.destination !== trip.destination) {
    coverUrl = data.destination ? (await lookupPlace(data.destination)).imageUrl : null;
  }
  await db.update(trips).set({ ...data, coverUrl }).where(eq(trips.id, trip.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  redirect(`/voyages/${trip.id}`);
}

export async function deleteTrip(tripId: string) {
  const { trip, role } = await requireTrip(tripId);
  if (role !== "owner") throw new Error("Seul le créateur du voyage peut le supprimer");
  await deleteTripWithFiles(trip.id);
  redirect("/");
}

export async function removeMember(tripId: string, formData: FormData) {
  const { trip, role, user } = await requireTrip(tripId);
  const userId = String(formData.get("userId") ?? "");
  // Owners can remove others; anyone can leave.
  if (role !== "owner" && userId !== user.id) throw new Error("Action non autorisée");
  if (userId === trip.createdBy) throw new Error("Le créateur du voyage ne peut pas être retiré");
  await db.delete(tripMembers).where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, userId)));
  if (userId === user.id) redirect("/");
  revalidatePath(`/voyages/${trip.id}/reglages`);
}
