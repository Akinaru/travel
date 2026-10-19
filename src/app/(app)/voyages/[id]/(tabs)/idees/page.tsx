import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { addIdea, chooseIdea, toggleVote } from "@/actions/ideas";
import { Cover } from "@/components/cover";
import { EstimateBasisForm } from "@/components/estimate-basis-form";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ChevronIcon, HeartIcon, PinIcon } from "@/components/icons";
import { Badge, btn, inputClass } from "@/components/ui";
import { db } from "@/db";
import { destinationIdeas, ideaCosts, ideaVotes } from "@/db/schema";
import { COST_CATEGORIES, estimate, estimateBasis, lineTotal } from "@/lib/estimate";
import { formatEuroRange } from "@/lib/format";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";

export default async function IdeasPage({ params }: PageProps<"/voyages/[id]/idees">) {
  const { id } = await params;
  const { trip, user } = await requireTrip(id);
  const [ideas, members] = await Promise.all([
    db.select().from(destinationIdeas).where(eq(destinationIdeas.tripId, trip.id)).orderBy(asc(destinationIdeas.createdAt)),
    membersOf([trip.id]),
  ]);
  const ideaIds = ideas.map((i) => i.id);
  const [votes, costs] = ideaIds.length
    ? await Promise.all([
        db.select().from(ideaVotes).where(inArray(ideaVotes.ideaId, ideaIds)),
        db.select().from(ideaCosts).where(inArray(ideaCosts.ideaId, ideaIds)).orderBy(asc(ideaCosts.createdAt)),
      ])
    : [[], []];

  const basis = estimateBasis(trip, members.length);
  const estimates = new Map(ideas.map((idea) => [idea.id, estimate(costs.filter((c) => c.ideaId === idea.id), basis)]));
  const priced = ideas.filter((i) => costs.some((c) => c.ideaId === i.id));
  // Only worth pointing out when there is something to compare.
  const cheapest =
    priced.length > 1 ? priced.reduce((a, b) => (estimates.get(b.id)!.max < estimates.get(a.id)!.max ? b : a)).id : null;
  const deciding = trip.status === "idee";

  return (
    <div className="flex flex-col gap-4 pt-2">
      <p className="text-sm text-muted">
        {deciding
          ? "Ajoutez autant de destinations que vous voulez et notez les prix trouvés (vols, logement…) en fourchette : le budget de chaque piste se calcule tout seul. Mettez un cœur sur vos préférées, puis choisissez."
          : "Les pistes étudiées avant de choisir, avec leur budget estimé."}
      </p>

      <EstimateBasisForm tripId={trip.id} basis={basis} />

      <ActionForm action={addIdea.bind(null, trip.id)} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input name="name" required placeholder="Ex. : Tromsø" aria-label="Destination" className={inputClass} />
          <SubmitButton className={`${btn.primary} shrink-0`} pendingLabel="…">
            Ajouter
          </SubmitButton>
        </div>
      </ActionForm>

      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => {
          const voters = new Set(votes.filter((v) => v.ideaId === idea.id).map((v) => v.userId));
          const agreed = members.length > 1 && members.every((m) => voters.has(m.userId));
          const ideaCostList = costs.filter((c) => c.ideaId === idea.id);
          const total = estimates.get(idea.id)!;
          const chosen = trip.chosenIdeaId === idea.id;
          const href = `/voyages/${trip.id}/idee/${idea.id}`;
          return (
            <article key={idea.id} className={`flex flex-col overflow-hidden rounded-3xl border ${agreed || chosen ? "border-accent" : "border-line"}`}>
              <Link href={href} tabIndex={-1} aria-hidden="true">
                <Cover src={idea.imageUrl} alt={idea.name} className="h-40 w-full" fallback={<PinIcon size={26} />} />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">
                    <Link href={href} className="hover:underline">
                      {idea.name}
                    </Link>
                  </h3>
                  <div className="flex flex-wrap justify-end gap-1">
                    {chosen && <Badge tone="accent">Choisie</Badge>}
                    {agreed && !chosen && <Badge tone="accent">D&apos;accord tous les deux</Badge>}
                    {cheapest === idea.id && <Badge tone="warm">La moins chère</Badge>}
                  </div>
                </div>
                {idea.summary && <p className="line-clamp-2 text-sm text-muted">{idea.summary}</p>}

                <Link href={href} className="flex flex-col gap-2 rounded-2xl bg-surface p-3.5 transition hover:bg-sand">
                  {ideaCostList.length === 0 ? (
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">Estimer le budget</span>
                      <ChevronIcon size={18} className="text-muted" />
                    </span>
                  ) : (
                    <>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-muted">Budget estimé</span>
                        <span className="text-lg font-bold">{formatEuroRange(total.min, total.max)}</span>
                      </span>
                      <span className="-mt-1.5 text-right text-[13px] text-muted">
                        soit {formatEuroRange(total.perPerson.min, total.perPerson.max)} / pers. ({basis.travelers} voyageur
                        {basis.travelers > 1 ? "s" : ""})
                      </span>
                      <ul className="flex flex-col gap-1 border-t border-line pt-2 text-[13px]">
                        {ideaCostList.map((c) => {
                          const line = lineTotal(c, basis);
                          return (
                            <li key={c.id} className="flex justify-between gap-2">
                              <span className="truncate text-muted">{c.label ?? COST_CATEGORIES[c.category]}</span>
                              <span className="shrink-0 font-medium">{line ? formatEuroRange(line.min, line.max) : "durée ?"}</span>
                            </li>
                          );
                        })}
                      </ul>
                      {total.missing > 0 && (
                        <span className="text-[13px] text-warm-strong">Indiquez le nombre de nuits pour tout compter.</span>
                      )}
                    </>
                  )}
                </Link>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {members.map((m) => {
                    const liked = voters.has(m.userId);
                    const style = `inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${
                      liked ? "border border-[#f2d3bd] bg-warm-soft text-warm-strong" : "border border-line text-muted"
                    }`;
                    const label = m.userId === user.id ? "Moi" : m.name;
                    return m.userId === user.id ? (
                      <form key={m.userId} action={toggleVote.bind(null, trip.id, idea.id)}>
                        <SubmitButton className={style} aria-label={liked ? "Retirer mon cœur" : "J'aime cette idée"}>
                          <HeartIcon size={16} filled={liked} /> {label}
                        </SubmitButton>
                      </form>
                    ) : (
                      <span key={m.userId} className={style}>
                        <HeartIcon size={16} filled={liked} /> {label}
                      </span>
                    );
                  })}
                </div>
                {!chosen && (
                  <form action={chooseIdea.bind(null, trip.id, idea.id)}>
                    <SubmitButton
                      className={`${agreed ? btn.primary : btn.secondary} w-full`}
                      confirm={`Partir à ${idea.name} ?`}
                      confirmText="Le voyage passe en préparation : vous pourrez ajouter billets, logement, documents et programme."
                      confirmLabel="Choisir"
                      danger={false}
                    >
                      Choisir {idea.name}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {members.length < 2 && ideas.length > 0 && (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
          Invitez votre partenaire de voyage (bouton « Partager ») pour voter à deux.
        </p>
      )}
    </div>
  );
}
