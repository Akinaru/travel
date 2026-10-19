import { z } from "zod";

// FormData helpers: empty inputs become null so optional columns stay NULL.

export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .nullish()
  .transform((v) => v ?? null);

export const requiredText = (message: string) => z.string().trim().min(1, message).max(200);

export const optionalDate = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Date invalide")
  .transform((v) => v || null)
  .nullish()
  .transform((v) => v ?? null);

// <input type="datetime-local"> or <input type="date"> value, stored as wall-clock time.
// A date without time is stored at midnight, which formatTime() treats as "no time".
export const optionalDateTime = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?)?$/, "Date invalide")
  .transform((v) => (!v ? null : v.length === 10 ? `${v} 00:00:00` : `${v.replace("T", " ")}:00`))
  .nullish()
  .transform((v) => v ?? null);

export const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullish()
  .transform((v) => v ?? null)
  .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "Le lien doit commencer par http:// ou https://");

export const optionalTime = z
  .string()
  .regex(/^(\d{2}:\d{2})?$/, "Heure invalide")
  .transform((v) => v || null)
  .nullish()
  .transform((v) => v ?? null);

export function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) if (typeof value === "string") out[key] = value;
  return out;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Formulaire invalide";
}

// Whole euros or counts typed by hand: "1 200", "450,50" (rounded). Empty becomes null.
export const optionalAmount = z
  .string()
  .transform((v) => v.replace(/[\s €]/g, "").replace(",", "."))
  .refine((v) => v === "" || (/^\d+(\.\d+)?$/.test(v) && Number(v) <= 10_000_000), "Montant invalide")
  .transform((v) => (v === "" ? null : Math.round(Number(v))))
  .nullish()
  .transform((v) => v ?? null);
