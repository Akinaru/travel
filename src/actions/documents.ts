"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { checklistItems, checklists, documents } from "@/db/schema";
import { filesFrom, invalidFile, storeDocuments } from "@/lib/documents";
import { requireTrip } from "@/lib/session";
import { deleteStoredFile } from "@/lib/storage";

const categorySchema = z.enum(["identite", "billets", "visa", "logement", "autre"]).catch("autre");

export async function uploadDocuments(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip, user } = await requireTrip(tripId);
  const files = filesFrom(formData, "files");
  if (files.length === 0) return { error: "Choisissez au moins un fichier" };
  const invalid = invalidFile(files);
  if (invalid) return { error: invalid };
  const category = categorySchema.parse(formData.get("category"));
  const itemId = String(formData.get("itemId") ?? "");

  // When uploaded from a checklist item, the file completes that item.
  let item: { id: string } | undefined;
  if (itemId) {
    [item] = await db
      .select({ id: checklistItems.id })
      .from(checklistItems)
      .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
      .where(and(eq(checklistItems.id, itemId), eq(checklists.tripId, trip.id)));
    if (!item) return { error: "Démarche introuvable" };
  }

  const [firstId] = await storeDocuments(files, { tripId: trip.id, userId: user.id, category });
  if (item) await db.update(checklistItems).set({ documentId: firstId, status: "done" }).where(eq(checklistItems.id, item.id));

  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

export async function deleteDocument(tripId: string, documentId: string) {
  const { trip } = await requireTrip(tripId);
  const [doc] = await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.tripId, trip.id)))
    .returning({ key: documents.storageKey });
  if (doc) await deleteStoredFile(doc.key);
  revalidatePath(`/voyages/${trip.id}`, "layout");
}
