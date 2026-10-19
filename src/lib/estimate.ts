import type { IdeaCost } from "@/db/schema";
import { daysBetween } from "@/lib/format";

export const COST_CATEGORIES = {
  vol: "Vols",
  logement: "Logement",
  transport: "Transport sur place",
  activites: "Activités",
  repas: "Repas",
  autre: "Autre",
} as const;

export const COST_UNITS = {
  groupe: "au total, pour tout le séjour",
  personne: "par personne",
  nuit: "par nuit",
  jour: "par jour",
  personne_jour: "par personne et par jour",
} as const;

// Unit pre-selected when picking a category in the form.
export const DEFAULT_UNIT: Record<IdeaCost["category"], IdeaCost["unit"]> = {
  vol: "personne",
  logement: "groupe",
  transport: "jour",
  activites: "personne",
  repas: "personne_jour",
  autre: "groupe",
};

export type EstimateBasis = { travelers: number; nights: number | null };

export function estimateBasis(
  trip: { travelers: number | null; nights: number | null; startDate: string | null; endDate: string | null },
  memberCount: number,
): EstimateBasis {
  const fromDates = trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) : null;
  // Most trips are planned for two, even before the second person joins the app.
  return { travelers: trip.travelers ?? Math.max(memberCount, 2), nights: trip.nights ?? fromDates };
}

// How many times the amount counts; null when the trip length is needed but unknown.
// A trip of N nights spans N + 1 days.
export function multiplier(unit: IdeaCost["unit"], { travelers, nights }: EstimateBasis) {
  if (unit === "groupe") return 1;
  if (unit === "personne") return travelers;
  if (nights === null) return null;
  if (unit === "nuit") return nights;
  if (unit === "jour") return nights + 1;
  return travelers * (nights + 1);
}

export function perPerson(range: { min: number; max: number }, { travelers }: EstimateBasis) {
  return { min: Math.round(range.min / travelers), max: Math.round(range.max / travelers) };
}

export function lineTotal(cost: Pick<IdeaCost, "minAmount" | "maxAmount" | "unit">, basis: EstimateBasis) {
  const n = multiplier(cost.unit, basis);
  if (n === null) return null;
  const total = { min: cost.minAmount * n, max: cost.maxAmount * n };
  return { ...total, perPerson: perPerson(total, basis) };
}

// Sum of the lines; `missing` counts lines left out because the trip length is unknown.
export function estimate(costs: Pick<IdeaCost, "minAmount" | "maxAmount" | "unit">[], basis: EstimateBasis) {
  let min = 0;
  let max = 0;
  let missing = 0;
  for (const cost of costs) {
    const total = lineTotal(cost, basis);
    if (!total) missing++;
    else {
      min += total.min;
      max += total.max;
    }
  }
  return { min, max, missing, perPerson: perPerson({ min, max }, basis) };
}
