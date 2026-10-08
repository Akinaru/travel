"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { destinationIdeas, ideaVotes, trips } from "@/db/schema";
import { firstError, formObject, requiredText } from "@/lib/forms";
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
    .set({ destination: idea.name, coverUrl: idea.imageUrl, status: "preparation" })
    .where(eq(trips.id, trip.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
  revalidatePath("/");
  redirect(`/voyages/${trip.id}`);
}

export async function deleteIdea(tripId: string, ideaId: string) {
  const { trip } = await requireTrip(tripId);
  await db.delete(destinationIdeas).where(and(eq(destinationIdeas.id, ideaId), eq(destinationIdeas.tripId, trip.id)));
  revalidatePath(`/voyages/${trip.id}/idees`);
}
