import { asc, eq, inArray } from "drizzle-orm";
import { addIdea, chooseIdea, deleteIdea, toggleVote } from "@/actions/ideas";
import { Cover } from "@/components/cover";
import { ActionForm, SubmitButton } from "@/components/forms";
import { HeartIcon, PinIcon, TrashIcon } from "@/components/icons";
import { Badge, btn, inputClass } from "@/components/ui";
import { db } from "@/db";
import { destinationIdeas, ideaVotes } from "@/db/schema";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";

export default async function IdeasPage({ params }: PageProps<"/voyages/[id]/idees">) {
  const { id } = await params;
  const { trip, user } = await requireTrip(id);
  const [ideas, members] = await Promise.all([
    db.select().from(destinationIdeas).where(eq(destinationIdeas.tripId, trip.id)).orderBy(asc(destinationIdeas.createdAt)),
    membersOf([trip.id]),
  ]);
  const votes = ideas.length
    ? await db.select().from(ideaVotes).where(inArray(ideaVotes.ideaId, ideas.map((i) => i.id)))
    : [];

  return (
    <div className="flex flex-col gap-4 pt-2">
      <p className="text-sm text-muted">
        Proposez des destinations : la photo et une courte description s&apos;ajoutent toutes seules. Chacun met un cœur sur ses
        préférées, puis choisissez ensemble.
      </p>
      <ActionForm action={addIdea.bind(null, trip.id)} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input name="name" required placeholder="Ex. : Lisbonne" aria-label="Destination" className={inputClass} />
          <SubmitButton className={`${btn.primary} shrink-0`} pendingLabel="…">
            Proposer
          </SubmitButton>
        </div>
      </ActionForm>

      <div className="grid gap-4 md:grid-cols-2">
      {ideas.map((idea) => {
        const voters = new Set(votes.filter((v) => v.ideaId === idea.id).map((v) => v.userId));
        const agreed = members.length > 1 && members.every((m) => voters.has(m.userId));
        return (
          <article key={idea.id} className={`overflow-hidden rounded-3xl border ${agreed ? "border-accent" : "border-line"}`}>
            <Cover src={idea.imageUrl} alt={idea.name} className="h-40 w-full" fallback={<PinIcon size={26} />} />
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{idea.name}</h3>
                {agreed && <Badge tone="accent">D&apos;accord tous les deux</Badge>}
              </div>
              {idea.summary && <p className="line-clamp-3 text-sm text-muted">{idea.summary}</p>}
              <div className="flex flex-wrap items-center gap-2">
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
                <form action={deleteIdea.bind(null, trip.id, idea.id)} className="ml-auto">
                  <SubmitButton className={`${btn.icon} text-muted`} aria-label={`Retirer ${idea.name}`} confirm={`Retirer « ${idea.name} » ?`} confirmLabel="Retirer">
                    <TrashIcon size={18} />
                  </SubmitButton>
                </form>
              </div>
              <form action={chooseIdea.bind(null, trip.id, idea.id)}>
                <SubmitButton
                  className={`${agreed ? btn.primary : btn.secondary} w-full`}
                  confirm={`Partir à ${idea.name} ?`}
                  confirmText="Le voyage passe en préparation : vous pourrez ajouter billets, logement et programme."
                  confirmLabel="Choisir"
                  danger={false}
                >
                  Choisir {idea.name}
                </SubmitButton>
              </form>
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
