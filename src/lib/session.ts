import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { tripMembers, trips } from "@/db/schema";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session.user;
}

// Every read or write on trip data goes through this check: only members see a trip.
export const requireTrip = cache(async (tripId: string) => {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(tripId)) notFound();
  const [row] = await db
    .select({ trip: trips, role: tripMembers.role })
    .from(trips)
    .innerJoin(tripMembers, and(eq(tripMembers.tripId, trips.id), eq(tripMembers.userId, user.id)))
    .where(eq(trips.id, tripId));
  if (!row) notFound();
  return { user, trip: row.trip, role: row.role };
});
