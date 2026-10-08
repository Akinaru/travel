import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, trips, type DocumentRow } from "@/db/schema";
import { deleteStoredFile, isAllowedType, MAX_UPLOAD_BYTES, saveFile } from "@/lib/storage";

export function filesFrom(formData: FormData, field: string) {
  return formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

// Returns a user-facing message for the first unacceptable file, if any.
export function invalidFile(files: File[]) {
  for (const file of files) {
    if (!isAllowedType(file.type)) return `« ${file.name} » : seuls les PDF et les photos sont acceptés`;
    if (file.size > MAX_UPLOAD_BYTES) return `« ${file.name} » dépasse 15 Mo`;
  }
  return null;
}

// Writes files to disk and records them; removes written files if the database write fails.
export async function storeDocuments(
  files: File[],
  meta: { tripId: string; userId: string; category: DocumentRow["category"]; bookingId?: string },
) {
  const saved: string[] = [];
  try {
    const ids: string[] = [];
    for (const file of files) {
      const storageKey = await saveFile(file);
      saved.push(storageKey);
      const [doc] = await db
        .insert(documents)
        .values({
          tripId: meta.tripId,
          bookingId: meta.bookingId ?? null,
          name: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) || "Document",
          category: meta.category,
          storageKey,
          mimeType: file.type,
          size: file.size,
          uploadedBy: meta.userId,
        })
        .returning({ id: documents.id });
      ids.push(doc.id);
    }
    return ids;
  } catch (error) {
    const recorded = saved.length
      ? await db.select({ key: documents.storageKey }).from(documents).where(inArray(documents.storageKey, saved))
      : [];
    const keep = new Set(recorded.map((r) => r.key));
    await Promise.all(saved.filter((k) => !keep.has(k)).map(deleteStoredFile));
    throw error;
  }
}

// Removes a trip's rows first, then its files, so a failed delete never leaves rows without files.
export async function deleteTripWithFiles(tripId: string) {
  const files = await db.select({ key: documents.storageKey }).from(documents).where(eq(documents.tripId, tripId));
  await db.delete(trips).where(eq(trips.id, tripId));
  await Promise.all(files.map((f) => deleteStoredFile(f.key)));
}
