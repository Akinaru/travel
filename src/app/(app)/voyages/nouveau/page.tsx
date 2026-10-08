import { createTrip } from "@/actions/trips";
import { ActionForm, SubmitButton } from "@/components/forms";
import { btn, Container, Field, inputClass, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

export default async function NewTripPage() {
  await requireUser();
  return (
    <Container>
      <PageHeader back="/" title="Nouveau voyage" />
      <ActionForm action={createTrip} className="flex flex-col gap-5 px-5 pt-3 pb-10">
        <Field label="Nom du voyage">
          <input name="title" required placeholder="Ex. : Stage en République dominicaine" className={inputClass} />
        </Field>
        <Field label="Destination" hint="Laissez vide si vous hésitez encore : vous pourrez proposer des idées et voter à deux.">
          <input name="destination" placeholder="Ex. : Saint-Domingue" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Départ">
            <input name="startDate" type="date" className={inputClass} />
          </Field>
          <Field label="Retour">
            <input name="endDate" type="date" className={inputClass} />
          </Field>
        </div>
        <SubmitButton className={btn.primary} pendingLabel="Recherche d'une photo…">
          Créer le voyage
        </SubmitButton>
      </ActionForm>
    </Container>
  );
}
