"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/forms";
import { db } from "@/db";
import { checklistItems, checklists } from "@/db/schema";
import { firstError, formObject, optionalDate, optionalText, requiredText } from "@/lib/forms";
import { requireTrip } from "@/lib/session";

// Generic starting point; the exact list depends on the consulate.
const TEMPLATES: Record<string, { title: string; items: [string, string][] }> = {
  visa: {
    title: "Visa",
    items: [
      ["Passeport", "Valide au moins 6 mois après le retour"],
      ["Formulaire de demande de visa", "Rempli et signé"],
      ["Photos d'identité", "Format exigé par le consulat"],
      ["Convention de stage ou lettre d'admission", "Signée par toutes les parties"],
      ["Preuve d'hébergement", "Confirmation de réservation ou attestation"],
      ["Billet d'avion", "Ou réservation aller-retour"],
      ["Justificatif de ressources", "Relevés bancaires ou attestation de bourse"],
      ["Extrait de casier judiciaire", "Demande en ligne, quelques jours de délai"],
      ["Certificat médical", "Si demandé par le consulat"],
      ["Assurance santé et rapatriement", "Couvrant toute la durée du séjour"],
    ],
  },
  depart: {
    title: "Avant le départ",
    items: [
      ["Prévenir la banque", "Paiements à l'étranger"],
      ["Assurance voyage", ""],
      ["Copies des papiers d'identité", "Ajoutées dans Documents"],
      ["Adaptateur de prise", ""],
      ["Forfait téléphone ou carte SIM locale", ""],
    ],
  },
};

const checklistSchema = z.object({
  title: optionalText,
  dueDate: optionalDate,
  template: z.enum(["visa", "depart", "vide"]),
});

export async function createChecklist(tripId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const parsed = checklistSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { template, dueDate } = parsed.data;
  const preset = TEMPLATES[template];
  const title = parsed.data.title ?? preset?.title;
  if (!title) return { error: "Donnez un nom à la démarche" };

  await db.transaction(async (tx) => {
    const [list] = await tx.insert(checklists).values({ tripId: trip.id, title, dueDate }).returning({ id: checklists.id });
    if (preset) {
      await tx.insert(checklistItems).values(
        preset.items.map(([label, hint], position) => ({ checklistId: list.id, label, hint: hint || null, position })),
      );
    }
  });
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

async function checklistOf(tripId: string, checklistId: string) {
  const [list] = await db
    .select()
    .from(checklists)
    .where(and(eq(checklists.id, checklistId), eq(checklists.tripId, tripId)));
  if (!list) throw new Error("Démarche introuvable");
  return list;
}

async function itemOf(tripId: string, itemId: string) {
  const [row] = await db
    .select({ item: checklistItems })
    .from(checklistItems)
    .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
    .where(and(eq(checklistItems.id, itemId), eq(checklists.tripId, tripId)));
  if (!row) throw new Error("Élément introuvable");
  return row.item;
}

export async function addItem(tripId: string, checklistId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { trip } = await requireTrip(tripId);
  const list = await checklistOf(trip.id, checklistId);
  const parsed = z
    .object({ label: requiredText("Indiquez le document ou l'étape"), hint: optionalText })
    .safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [{ last }] = await db
    .select({ last: max(checklistItems.position) })
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, list.id));
  await db.insert(checklistItems).values({ ...parsed.data, checklistId: list.id, position: (last ?? -1) + 1 });
  revalidatePath(`/voyages/${trip.id}`, "layout");
  return undefined;
}

const NEXT_STATUS = { todo: "progress", progress: "done", done: "todo" } as const;

export async function cycleItem(tripId: string, itemId: string) {
  const { trip } = await requireTrip(tripId);
  const item = await itemOf(trip.id, itemId);
  await db.update(checklistItems).set({ status: NEXT_STATUS[item.status] }).where(eq(checklistItems.id, item.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
}

export async function deleteItem(tripId: string, itemId: string) {
  const { trip } = await requireTrip(tripId);
  const item = await itemOf(trip.id, itemId);
  await db.delete(checklistItems).where(eq(checklistItems.id, item.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
}

export async function deleteChecklist(tripId: string, checklistId: string) {
  const { trip } = await requireTrip(tripId);
  const list = await checklistOf(trip.id, checklistId);
  await db.delete(checklists).where(eq(checklists.id, list.id));
  revalidatePath(`/voyages/${trip.id}`, "layout");
}
