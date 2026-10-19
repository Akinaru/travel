import { updateEstimateBasis } from "@/actions/trips";
import type { EstimateBasis } from "@/lib/estimate";
import { ActionForm, SubmitButton } from "./forms";
import { btn, inputClass } from "./ui";

// Number of travellers and nights every estimate is computed from (shared by all destinations of the trip).
export function EstimateBasisForm({ tripId, basis, className = "" }: { tripId: string; basis: EstimateBasis; className?: string }) {
  return (
    <ActionForm action={updateEstimateBasis.bind(null, tripId)} className={`flex flex-col gap-2 rounded-2xl bg-surface p-4 ${className}`}>
      <span className="text-sm font-semibold">Combien partez-vous, et combien de temps ?</span>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex w-28 flex-col gap-1 text-[13px] text-muted">
          Voyageurs
          <input name="travelers" type="number" min={1} max={50} inputMode="numeric" defaultValue={basis.travelers} className={inputClass} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[13px] text-muted">
          Nuits
          <input name="nights" type="number" min={0} max={365} inputMode="numeric" defaultValue={basis.nights ?? ""} placeholder="7" className={inputClass} />
        </label>
        <SubmitButton className={btn.secondary} pendingLabel="…">
          Recalculer
        </SubmitButton>
      </div>
      <span className="text-[13px] text-muted">Les budgets sont affichés au total et divisés par le nombre de voyageurs.</span>
    </ActionForm>
  );
}
