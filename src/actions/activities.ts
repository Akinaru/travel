"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { firstError, formObject, optionalText, optionalTime, optionalUrl, requiredText } from "@/lib/forms";
import { lookupPlace, pagePreview } from "@/lib/images";
import { requireTrip } from "@/lib/session";

const activitySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisissez un jour"),
  time: optionalTime,
  title: requiredText("Donnez un nom à l'activité"),
  place: optionalText,
  url: optionalUrl,
  notes: optionalText,
});

export async function addActivity(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const parsed = activitySchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  let imageUrl = data.url ? (await pagePreview(data.url)).imageUrl : null;
  if (!imageUrl && data.place) imageUrl = (await lookupPlace(data.place)).imageUrl;

  await db.insert(activities).values({ ...data, imageUrl, tripId: trip.id });
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

export async function deleteActivity(tripId: string, activityId: string) {
  const { trip } = await requireTrip(tripId);
  await db.delete(activities).where(and(eq(activities.id, activityId), eq(activities.tripId, trip.id)));
  revalidatePath(`/voyages/${trip.id}`, "layout");
}
