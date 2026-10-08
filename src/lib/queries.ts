import "server-only";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, checklistItems, checklists, tripMembers, trips, user } from "@/db/schema";

export async function tripsForUser(userId: string) {
  const rows = await db
    .select({ trip: trips })
    .from(trips)
    .innerJoin(tripMembers, and(eq(tripMembers.tripId, trips.id), eq(tripMembers.userId, userId)))
    .orderBy(sql`${trips.startDate} asc nulls last`, desc(trips.createdAt));
  const ids = rows.map((r) => r.trip.id);
  const members = ids.length ? await membersOf(ids) : [];
  return rows.map((r) => ({ ...r.trip, members: members.filter((m) => m.tripId === r.trip.id) }));
}

export async function membersOf(tripIds: string[]) {
  return db
    .select({ tripId: tripMembers.tripId, userId: user.id, name: user.name, email: user.email, image: user.image, role: tripMembers.role })
    .from(tripMembers)
    .innerJoin(user, eq(user.id, tripMembers.userId))
    .where(inArray(tripMembers.tripId, tripIds))
    .orderBy(asc(tripMembers.joinedAt));
}

// Open checklist items and booking change deadlines, across the given trips.
export async function upcomingTasks(tripIds: string[], today: string) {
  if (tripIds.length === 0) return { items: [], deadlines: [] };
  const items = await db
    .select({
      id: checklistItems.id,
      label: checklistItems.label,
      status: checklistItems.status,
      listTitle: checklists.title,
      dueDate: checklists.dueDate,
      tripId: checklists.tripId,
    })
    .from(checklistItems)
    .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
    .where(and(inArray(checklists.tripId, tripIds), ne(checklistItems.status, "done")))
    .orderBy(sql`${checklists.dueDate} asc nulls last`, asc(checklistItems.position))
    .limit(3);
  const deadlines = await db
    .select({ id: bookings.id, title: bookings.title, kind: bookings.kind, changeDeadline: bookings.changeDeadline, tripId: bookings.tripId })
    .from(bookings)
    .where(and(inArray(bookings.tripId, tripIds), gte(bookings.changeDeadline, today), ne(bookings.status, "annule")))
    .orderBy(asc(bookings.changeDeadline))
    .limit(2);
  return { items, deadlines };
}
