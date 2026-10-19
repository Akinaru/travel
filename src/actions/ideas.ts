"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { destinationIdeas, ideaCosts, ideaVotes, trips } from "@/db/schema";
import { firstError, formObject, optionalAmount, optionalText, optionalUrl, requiredText } from "@/lib/forms";
import { lookupPlace } from "@/lib/images";
import { requireTrip } from "@/lib/session";

export async function addIdea(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip, user } = await requireTrip(tripId);
  const parsed = z.object({ name: requiredText("Indiquez une destination") }).safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { imageUrl, summary } = await lookupPlace(parsed.data.name);
  await db.transaction(async (tx) => {
    const [idea] = await tx
      .insert(destinationIdeas)
      .values({ tripId: trip.id, name: parsed.data.name, imageUrl, summary, createdBy: user.id })
      .returning({ id: destinationIdeas.id });
    // Proposing an idea counts as liking it.
    await tx.insert(ideaVotes).values({ ideaId: idea.id, userId: user.id });
  });
  revalidatePath(`/voyages/${trip.id}/idees`);
  return undefined;
}

const ideaSchema = z.object({
  name: requiredText("Indiquez une destination"),
  summary: optionalText,
  notes: optionalText,
});

export async function updateIdea(tripId: string, ideaId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const idea = await ideaOf(trip.id, ideaId);
  const parsed = ideaSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  // A new name gets a new photo; the description is only filled in if left empty.
  let { imageUrl } = idea;
  let { summary } = data;
  if (data.name !== idea.name) {
    const place = await lookupPlace(data.name);
    imageUrl = place.imageUrl;
    summary ??= place.summary;
  }
  await db.update(destinationIdeas).set({ ...data, summary, imageUrl }).where(eq(destinationIdeas.id, idea.id));
  if (trip.chosenIdeaId === idea.id) {
    await db.update(trips).set({ destination: data.name, coverUrl: imageUrl }).where(eq(trips.id, trip.id));
  }
  revalidatePath(`/voyages/${trip.id}`, "layout");
  redirect(`/voyages/${trip.id}/idee/${idea.id}`);
}

const costSchema = z
  .object({
    category: z.enum(["vol", "logement", "transport", "activites", "repas", "autre"]),
    label: optionalText,
    minAmount: optionalAmount,
    maxAmount: optionalAmount,
    unit: z.enum(["groupe", "personne", "nuit", "jour", "personne_jour"]),
    url: optionalUrl,
  })
  .refine((c) => c.minAmount !== null, "Indiquez un prix")
  .transform((c) => ({ ...c, minAmount: c.minAmount!, maxAmount: c.maxAmount ?? c.minAmount! }))
  .refine((c) => c.maxAmount >= c.minAmount, "Le prix maximum doit être supérieur au minimum");

export async function addCost(tripId: string, ideaId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const idea = await ideaOf(trip.id, ideaId);
  const parsed = costSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(ideaCosts).values({ ...parsed.data, ideaId: idea.id });
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

async function costOf(tripId: string, costId: string) {
  const [row] = await db
    .select({ cost: ideaCosts })
    .from(ideaCosts)
    .innerJoin(destinationIdeas, eq(destinationIdeas.id, ideaCosts.ideaId))
    .where(and(eq(ideaCosts.id, costId), eq(destinationIdeas.tripId, tripId)));
  if (!row) throw new Error("Estimation introuvable");
  return row.cost;
}

export async function updateCost(tripId: string, costId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const cost = await costOf(trip.id, costId);
  const parsed = costSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.update(ideaCosts).set(parsed.data).where(eq(ideaCosts.id, cost.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

export async function deleteCost(tripId: string, costId: string) {
  const { trip } = await requireTrip(tripId);
  const cost = await costOf(trip.id, costId);
  await db.delete(ideaCosts).where(eq(ideaCosts.id, cost.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
}

async function ideaOf(tripId: string, ideaId: string) {
  const [idea] = await db
    .select()
    .from(destinationIdeas)
    .where(and(eq(destinationIdeas.id, ideaId), eq(destinationIdeas.tripId, tripId)));
  if (!idea) throw new Error("Idée introuvable");
  return idea;
}

export async function toggleVote(tripId: string, ideaId: string) {
  const { trip, user } = await requireTrip(tripId);
  const idea = await ideaOf(trip.id, ideaId);
  const removed = await db
    .delete(ideaVotes)
    .where(and(eq(ideaVotes.ideaId, idea.id), eq(ideaVotes.userId, user.id)))
    .returning();
  if (removed.length === 0) await db.insert(ideaVotes).values({ ideaId: idea.id, userId: user.id });
  revalidatePath(`/voyages/${trip.id}/idees`);
}

export async function chooseIdea(tripId: string, ideaId: string) {
  const { trip } = await requireTrip(tripId);
  const idea = await ideaOf(trip.id, ideaId);
  await db
    .update(trips)
    .set({ destination: idea.name, coverUrl: idea.imageUrl, chosenIdeaId: idea.id, status: "preparation" })
    .where(eq(trips.id, trip.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  revalidatePath("/");
  redirect(`/voyages/${trip.id}`);
}

export async function deleteIdea(tripId: string, ideaId: string) {
  const { trip } = await requireTrip(tripId);
  await db.delete(destinationIdeas).where(and(eq(destinationIdeas.id, ideaId), eq(destinationIdeas.tripId, trip.id)));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  redirect(`/voyages/${trip.id}/idees`);
}
