"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tripInvites, tripMembers } from "@/db/schema";
import { requireTrip, requireUser } from "@/lib/session";

const INVITE_DAYS = 7;

export async function createInviteLink(tripId: string) {
  const { trip, user } = await requireTrip(tripId);
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400000);
  await db
    .insert(tripInvites)
    .values({ tripId: trip.id, token, expiresAt, createdBy: user.id })
    .onConflictDoUpdate({ target: tripInvites.tripId, set: { token, expiresAt, createdBy: user.id } });
  revalidatePath(`/voyages/${trip.id}/reglages`);
}

export async function acceptInvite(token: string) {
  const user = await requireUser();
  const [invite] = await db
    .select()
    .from(tripInvites)
    .where(and(eq(tripInvites.token, token), gt(tripInvites.expiresAt, new Date())));
  if (!invite) redirect(`/invitation/${encodeURIComponent(token)}`);
  await db
    .insert(tripMembers)
    .values({ tripId: invite.tripId, userId: user.id, role: "editor" })
    .onConflictDoNothing();
  redirect(`/voyages/${invite.tripId}`);
}
