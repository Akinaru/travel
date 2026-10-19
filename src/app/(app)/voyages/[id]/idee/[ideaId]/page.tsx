import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { addCost, deleteCost, deleteIdea, updateCost, updateIdea } from "@/actions/ideas";
import { Cover } from "@/components/cover";
import { CostFields } from "@/components/cost-fields";
import { EstimateBasisForm } from "@/components/estimate-basis-form";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ExternalIcon, PinIcon, TrashIcon } from "@/components/icons";
import { btn, Container, Field, inputClass, PageHeader, SectionTitle } from "@/components/ui";
import { db } from "@/db";
import { destinationIdeas, ideaCosts } from "@/db/schema";
import { COST_CATEGORIES, COST_UNITS, estimate, estimateBasis, lineTotal } from "@/lib/estimate";
import { formatEuroRange } from "@/lib/format";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";

export default async function IdeaPage({ params }: PageProps<"/voyages/[id]/idee/[ideaId]">) {
  const { id, ideaId } = await params;
  const { trip } = await requireTrip(id);
  if (!/^[0-9a-f-]{36}$/i.test(ideaId)) notFound();
  const [[idea], costs, members] = await Promise.all([
    db.select().from(destinationIdeas).where(and(eq(destinationIdeas.id, ideaId), eq(destinationIdeas.tripId, trip.id))),
    db.select().from(ideaCosts).where(eq(ideaCosts.ideaId, ideaId)).orderBy(asc(ideaCosts.createdAt)),
    membersOf([trip.id]),
  ]);
  if (!idea) notFound();

  const basis = estimateBasis(trip, members.length);
  const total = estimate(costs, basis);
  const nightsLabel = basis.nights === null ? "durée à définir" : `${basis.nights} nuit${basis.nights > 1 ? "s" : ""}`;

  return (
    <Container>
      <PageHeader back={`/voyages/${trip.id}/idees`} title={idea.name} />
      <div className="flex flex-col gap-6 px-5 pt-2 pb-12">
        <Cover src={idea.imageUrl} alt={idea.name} className="h-44 w-full rounded-3xl" fallback={<PinIcon size={26} />} />

        <section className="grid grid-cols-2 gap-x-px overflow-hidden rounded-3xl bg-white/15 text-white">
          <div className="flex flex-col gap-1 bg-ink p-5">
            <span className="text-sm text-white/70">Budget total</span>
            <span className="text-xl font-bold tracking-tight sm:text-2xl">{costs.length ? formatEuroRange(total.min, total.max) : "—"}</span>
          </div>
          <div className="flex flex-col gap-1 bg-ink p-5">
            <span className="text-sm text-white/70">Par personne</span>
            <span className="text-xl font-bold tracking-tight sm:text-2xl">
              {costs.length ? formatEuroRange(total.perPerson.min, total.perPerson.max) : "—"}
            </span>
          </div>
          <span className="col-span-2 bg-ink px-5 pb-4 text-sm text-white/70">
            {basis.travelers} voyageur{basis.travelers > 1 ? "s" : ""} · {nightsLabel}
            {total.missing > 0 && (
              <span className="block pt-1 text-[#f7c9a6]">
                {total.missing} poste{total.missing > 1 ? "s" : ""} non compté{total.missing > 1 ? "s" : ""} : indiquez le nombre de
                nuits ci-dessous.
              </span>
            )}
          </span>
        </section>

        <EstimateBasisForm tripId={trip.id} basis={basis} />

        <section className="flex flex-col gap-3">
          <SectionTitle>Postes de dépense</SectionTitle>
          {costs.length === 0 && (
            <p className="text-sm text-muted">Notez les prix trouvés, en fourchette si besoin : vols, logement, voiture, activités…</p>
          )}
          {costs.map((c) => {
            const line = lineTotal(c, basis);
            return (
              // Keyed on the values too, so the editor closes once a change is saved.
              <details
                key={[c.id, c.category, c.label, c.minAmount, c.maxAmount, c.unit, c.url].join("|")}
                className="group rounded-2xl border border-line open:border-ink"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{c.label ?? COST_CATEGORIES[c.category]}</span>
                    <span className="text-[13px] text-muted">
                      {c.label ? `${COST_CATEGORIES[c.category]} · ` : ""}
                      {formatEuroRange(c.minAmount, c.maxAmount)} {COST_UNITS[c.unit]}
                    </span>
                  </span>
                  {line ? (
                    <span className="flex shrink-0 flex-col text-right">
                      <span className="text-[15px] font-bold">{formatEuroRange(line.min, line.max)}</span>
                      <span className="text-[13px] text-muted">{formatEuroRange(line.perPerson.min, line.perPerson.max)} / pers.</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm font-medium text-warm-strong">durée ?</span>
                  )}
                </summary>
                <div className="flex flex-col gap-3 border-t border-line p-3.5">
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      <ExternalIcon size={16} /> Ouvrir le lien
                    </a>
                  )}
                  <ActionForm action={updateCost.bind(null, trip.id, c.id)} className="flex flex-col gap-3">
                    <span className="text-sm font-semibold">Modifier</span>
                    <CostFields cost={c} />
                    <SubmitButton className={btn.primary} pendingLabel="Enregistrement…">
                      Enregistrer
                    </SubmitButton>
                  </ActionForm>
                  <form action={deleteCost.bind(null, trip.id, c.id)}>
                    <SubmitButton className={`${btn.danger} w-full`} confirm="Supprimer ce poste ?">
                      <TrashIcon size={18} /> Supprimer
                    </SubmitButton>
                  </form>
                </div>
              </details>
            );
          })}

          <ActionForm action={addCost.bind(null, trip.id, idea.id)} className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-dashed border-[#c9c4bb] p-4">
            <span id="ajouter" className="scroll-mt-4 text-[15px] font-bold">Ajouter un prix</span>
            <CostFields />
            <SubmitButton className={btn.primary} pendingLabel="Ajout…">
              Ajouter ce prix
            </SubmitButton>
          </ActionForm>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Informations</SectionTitle>
          <ActionForm action={updateIdea.bind(null, trip.id, idea.id)} className="flex flex-col gap-4">
            <Field label="Destination" hint="Changer le nom met à jour la photo.">
              <input name="name" required defaultValue={idea.name} className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea name="summary" rows={3} defaultValue={idea.summary ?? ""} className={`${inputClass} py-3`} />
            </Field>
            <Field label="Notes" hint="Météo, pour / contre, ce qu'il reste à vérifier…">
              <textarea name="notes" rows={4} defaultValue={idea.notes ?? ""} className={`${inputClass} py-3`} />
            </Field>
            <SubmitButton className={btn.secondary} pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </ActionForm>
        </section>

        <form action={deleteIdea.bind(null, trip.id, idea.id)}>
          <SubmitButton className={`${btn.danger} w-full`} confirm={`Retirer « ${idea.name} » ?`} confirmText="Ses estimations de prix seront supprimées." confirmLabel="Retirer">
            Retirer cette destination
          </SubmitButton>
        </form>
      </div>
    </Container>
  );
}
