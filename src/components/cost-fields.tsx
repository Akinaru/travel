"use client";

import { useEffect, useRef, useState } from "react";
import type { IdeaCost } from "@/db/schema";
import { COST_CATEGORIES, COST_UNITS, DEFAULT_UNIT } from "@/lib/estimate";
import { Field, inputClass } from "./ui";

const PLACEHOLDERS: Record<IdeaCost["category"], string> = {
  vol: "Ex. : Paris → Tromsø, aller-retour",
  logement: "Ex. : Airbnb près du centre",
  transport: "Ex. : Location de voiture",
  activites: "Ex. : Sortie aurores boréales",
  repas: "Ex. : Restaurants et courses",
  autre: "Ex. : Assurance voyage",
};

// Inputs shared by the "add" and "edit" estimate forms; picking a category suggests its usual unit.
// Selects stay uncontrolled: React resets the form after each action, and controlled values would drift from the DOM.
export function CostFields({ cost }: { cost?: IdeaCost }) {
  const [category, setCategory] = useState<IdeaCost["category"]>(cost?.category ?? "vol");
  const unitRef = useRef<HTMLSelectElement>(null);
  const initialCategory = cost?.category ?? "vol";

  // Keep the placeholder in sync when React resets the form.
  useEffect(() => {
    const form = unitRef.current?.form;
    const onReset = () => setCategory(initialCategory);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [initialCategory]);
  const amount = (n: number | undefined) => (n === undefined ? "" : String(n));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Poste">
          <select
            name="category"
            defaultValue={initialCategory}
            onChange={(e) => {
              const next = e.target.value as IdeaCost["category"];
              setCategory(next);
              if (unitRef.current) unitRef.current.value = DEFAULT_UNIT[next];
            }}
            className={inputClass}
          >
            {Object.entries(COST_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Détail">
          <input name="label" defaultValue={cost?.label ?? ""} placeholder={PLACEHOLDERS[category]} className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix mini (€)">
          <input name="minAmount" inputMode="decimal" required defaultValue={amount(cost?.minAmount)} placeholder="400" className={inputClass} />
        </Field>
        <Field label="Prix maxi (€)" hint="Vide si prix fixe">
          <input
            name="maxAmount"
            inputMode="decimal"
            defaultValue={cost && cost.maxAmount !== cost.minAmount ? amount(cost.maxAmount) : ""}
            placeholder="600"
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Ce prix est" hint="Ex. : Airbnb à 400 € la semaine → « au total, pour tout le séjour ». Vol à 500 € par tête → « par personne ».">
        <select ref={unitRef} name="unit" defaultValue={cost?.unit ?? DEFAULT_UNIT.vol} className={inputClass}>
          {Object.entries(COST_UNITS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Lien" hint="Recherche de vols, annonce… pour retrouver la source.">
        <input name="url" inputMode="url" autoCapitalize="none" defaultValue={cost?.url ?? ""} placeholder="https://" className={inputClass} />
      </Field>
    </>
  );
}
