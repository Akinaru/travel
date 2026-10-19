import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { addCost, deleteCost, deleteIdea, updateCost, updateIdea } from "@/actions/ideas";
import { Cover } from "@/components/cover";
import { CostFields } from "@/components/cost-fields";
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

        <section className="flex flex-col gap-1 rounded-3xl bg-ink p-5 text-white">
          <span className="text-sm text-white/70">Budget estimé</span>
          <span className="text-3xl font-bold tracking-tight">{costs.length ? formatEuroRange(total.min, total.max) : "—"}</span>
          <span className="text-sm text-white/70">
            {basis.travelers} voyageur{basis.travelers > 1 ? "s" : ""} · {nightsLabel}
            {costs.length > 0 && basis.travelers > 1 && ` · ${formatEuroRange(total.perPerson.min, total.perPerson.max)} / pers.`}
          </span>
          {total.missing > 0 && (
            <span className="pt-1 text-sm text-[#f7c9a6]">
              {total.missing} poste{total.missing > 1 ? "s" : ""} non compté{total.missing > 1 ? "s" : ""} : indiquez le nombre de nuits
              sur la page des idées.
            </span>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Postes de dépense</SectionTitle>
          {costs.length === 0 && (
            <p className="text-sm text-muted">Notez les prix trouvés, en fourchette si besoin : vols, logement, voiture, activités…</p>
          )}
          {costs.map((c) => {
            const line = lineTotal(c, basis);
            return (
              <details key={c.id} className="group rounded-2xl border border-line open:border-ink">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{c.label ?? COST_CATEGORIES[c.category]}</span>
                    <span className="text-[13px] text-muted">
                      {c.label ? `${COST_CATEGORIES[c.category]} · ` : ""}
                      {formatEuroRange(c.minAmount, c.maxAmount)} {COST_UNITS[c.unit]}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[15px] font-bold">
                    {line ? formatEuroRange(line.min, line.max) : <span className="text-sm font-medium text-warm-strong">durée ?</span>}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line p-3.5">
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      <ExternalIcon size={16} /> Ouvrir le lien
                    </a>
                  )}
                  <ActionForm action={updateCost.bind(null, trip.id, c.id)} className="flex flex-col gap-3">
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

          <details id="ajouter" className="rounded-2xl" open={costs.length === 0}>
            <summary className={`${btn.dashed} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>+ Ajouter un prix</summary>
            <ActionForm action={addCost.bind(null, trip.id, idea.id)} className="flex flex-col gap-3 pt-3">
              <CostFields />
              <SubmitButton className={btn.primary} pendingLabel="Ajout…">
                Ajouter
              </SubmitButton>
            </ActionForm>
          </details>
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
