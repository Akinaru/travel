import { saveBooking } from "@/actions/bookings";
import { KindIcon } from "@/components/booking-visuals";
import { FilePicker } from "@/components/file-picker";
import { ActionForm, SubmitButton } from "@/components/forms";
import { btn, Field, inputClass } from "@/components/ui";
import type { Booking } from "@/db/schema";

// "2026-11-24 10:35:00" -> "2026-11-24T10:35" for <input type="datetime-local">
const toDateTime = (v: string | null | undefined) => (v ? v.replace(" ", "T").slice(0, 16) : undefined);
const toDate = (v: string | null | undefined) => (v ? v.slice(0, 10) : undefined);

const TRANSPORTS: { kind: Booking["kind"]; label: string }[] = [
  { kind: "vol", label: "Avion" },
  { kind: "train", label: "Train" },
  { kind: "bus", label: "Bus" },
  { kind: "voiture", label: "Voiture" },
];

function MoreDetails({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-2xl border border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold">
        Plus d&apos;infos <span className="text-sm font-normal text-muted group-open:hidden">facultatif</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4">{children}</div>
    </details>
  );
}

function CommonDetails({ b }: { b?: Booking }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Référence">
          <input name="reference" defaultValue={b?.reference ?? ""} autoCapitalize="characters" className={inputClass} />
        </Field>
        <Field label="Prix">
          <input name="price" defaultValue={b?.price ?? ""} placeholder="640 €" className={inputClass} />
        </Field>
      </div>
      <Field label="Statut">
        <select name="status" defaultValue={b?.status ?? "reserve"} className={inputClass}>
          <option value="reserve">Réservé</option>
          <option value="option">Pas encore réservé</option>
          <option value="annule">Annulé</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={b?.notes ?? ""} className={`${inputClass} py-3`} />
      </Field>
    </>
  );
}

export function BookingForm({ tripId, kind, booking }: { tripId: string; kind: Booking["kind"]; booking?: Booking }) {
  const b = booking;
  const submit = (
    <SubmitButton className={btn.primary} pendingLabel="Enregistrement…">
      {b ? "Enregistrer" : "Ajouter"}
    </SubmitButton>
  );

  if (kind === "logement") {
    return (
      <ActionForm action={saveBooking.bind(null, tripId, b?.id ?? null)} className="flex flex-col gap-5">
        <input type="hidden" name="kind" value="logement" />
        <Field label="Lien de l'annonce ou nom du logement" hint="Avec un lien Airbnb, Booking… le nom et la photo se remplissent tout seuls.">
          <input name="where" required defaultValue={b?.url ?? b?.title ?? ""} placeholder="https://www.airbnb.fr/rooms/…" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrivée">
            <input name="startAt" type="date" required defaultValue={toDate(b?.startAt)} className={inputClass} />
          </Field>
          <Field label="Départ">
            <input name="endAt" type="date" defaultValue={toDate(b?.endAt)} className={inputClass} />
          </Field>
        </div>
        <FilePicker name="ticket" label="Ajouter la confirmation" hint="PDF ou capture d'écran, facultatif" />
        <MoreDetails open={false}>
          <Field label="Nom affiché">
            <input name="title" placeholder={b?.title ?? "Rempli automatiquement"} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ville">
              <input name="toPlace" defaultValue={b?.toPlace ?? ""} className={inputClass} />
            </Field>
            <Field label="Réservé via">
              <input name="provider" defaultValue={b?.provider ?? ""} placeholder="Automatique" className={inputClass} />
            </Field>
          </div>
          <Field label="Adresse">
            <input name="address" defaultValue={b?.address ?? ""} autoComplete="off" className={inputClass} />
          </Field>
          <CommonDetails b={b} />
        </MoreDetails>
        {submit}
      </ActionForm>
    );
  }

  return (
    <ActionForm action={saveBooking.bind(null, tripId, b?.id ?? null)} className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-4 gap-2">
        <legend className="sr-only">Moyen de transport</legend>
        {TRANSPORTS.map((t) => (
          <label
            key={t.kind}
            className="flex h-18 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-line text-sm font-semibold text-muted transition has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-accent"
          >
            <input type="radio" name="kind" value={t.kind} defaultChecked={(b?.kind ?? kind) === t.kind} className="sr-only" />
            <KindIcon kind={t.kind} size={20} />
            {t.label}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="De">
          <input name="fromPlace" required defaultValue={b?.fromPlace ?? ""} placeholder="Paris" className={inputClass} />
        </Field>
        <Field label="À">
          <input name="toPlace" required defaultValue={b?.toPlace ?? ""} placeholder="Saint-Domingue" className={inputClass} />
        </Field>
      </div>
      <Field label="Départ le">
        <input name="startAt" type="datetime-local" required defaultValue={toDateTime(b?.startAt)} className={inputClass} />
      </Field>
      <FilePicker name="ticket" label="Ajouter le billet" hint="PDF ou capture d'écran, facultatif" />
      <MoreDetails open={false}>
        <Field label="Arrivée le">
          <input name="endAt" type="datetime-local" defaultValue={toDateTime(b?.endAt)} className={inputClass} />
        </Field>
        <Field label="Compagnie">
          <input name="provider" defaultValue={b?.provider ?? ""} className={inputClass} />
        </Field>
        <Field label="Modifiable jusqu'au" hint="Vous serez prévenu sur l'accueil avant cette date.">
          <input name="changeDeadline" type="date" defaultValue={b?.changeDeadline ?? ""} className={inputClass} />
        </Field>
        <Field label="Lien de la réservation">
          <input name="url" type="url" inputMode="url" defaultValue={b?.url ?? ""} placeholder="https://" className={inputClass} />
        </Field>
        <CommonDetails b={b} />
      </MoreDetails>
      {submit}
    </ActionForm>
  );
}
