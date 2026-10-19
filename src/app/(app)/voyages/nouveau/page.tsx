import { createTrip } from "@/actions/trips";
import { ActionForm, SubmitButton } from "@/components/forms";
import { btn, Container, Field, inputClass, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

const phaseCard =
  "flex cursor-pointer flex-col gap-1 rounded-2xl border border-line p-4 transition has-[:checked]:border-ink has-[:checked]:bg-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30";

export default async function NewTripPage() {
  await requireUser();
  return (
    <Container>
      <PageHeader back="/" title="Nouveau voyage" />
      <ActionForm action={createTrip} className="group flex flex-col gap-5 px-5 pt-3 pb-10">
        <Field label="Nom du voyage">
          <input name="title" required placeholder="Ex. : Norvège en février" className={inputClass} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1.5 text-sm font-semibold">Où en êtes-vous ?</legend>
          <label className={phaseCard}>
            <input type="radio" name="phase" value="idee" defaultChecked className="sr-only" />
            <span className="text-[15px] font-semibold">On cherche encore où aller</span>
            <span className="text-[13px] text-muted">
              Comparez autant de destinations que vous voulez, avec une estimation du budget pour chacune.
            </span>
          </label>
          <label className={phaseCard}>
            <input id="phase-decide" type="radio" name="phase" value="decide" className="sr-only" />
            <span className="text-[15px] font-semibold">La destination est choisie</span>
            <span className="text-[13px] text-muted">Passez directement aux billets, logements, documents et démarches.</span>
          </label>
        </fieldset>
        <div className="hidden group-has-[#phase-decide:checked]:flex flex-col">
          <Field label="Destination">
            <input name="destination" placeholder="Ex. : Tromsø" className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Départ">
            <input name="startDate" type="date" className={inputClass} />
          </Field>
          <Field label="Retour">
            <input name="endDate" type="date" className={inputClass} />
          </Field>
        </div>
        <SubmitButton className={btn.primary} pendingLabel="Création…">
          Créer le voyage
        </SubmitButton>
      </ActionForm>
    </Container>
  );
}
