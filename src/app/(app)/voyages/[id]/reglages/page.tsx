import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { createInviteLink } from "@/actions/invites";
import { deleteTrip, removeMember, updateTrip } from "@/actions/trips";
import { Avatars } from "@/components/avatars";
import { CopyButton } from "@/components/copy-button";
import { ActionForm, SubmitButton } from "@/components/forms";
import { btn, Container, Field, inputClass, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { tripInvites } from "@/db/schema";
import { membersOf } from "@/lib/queries";
import { requireTrip } from "@/lib/session";

async function appOrigin() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export default async function TripSettingsPage({ params }: PageProps<"/voyages/[id]/reglages">) {
  const { id } = await params;
  const { trip, role, user } = await requireTrip(id);
  const [members, [invite]] = await Promise.all([
    membersOf([trip.id]),
    db.select().from(tripInvites).where(eq(tripInvites.tripId, trip.id)),
  ]);
  const inviteValid = invite && invite.expiresAt > new Date();
  const inviteUrl = inviteValid ? `${await appOrigin()}/invitation/${invite.token}` : null;

  return (
    <Container>
      <PageHeader back={`/voyages/${trip.id}`} title="Réglages du voyage" />
      <div className="flex flex-col gap-8 px-5 pt-2 pb-12">
        <section id="partage" className="flex scroll-mt-4 flex-col gap-4 rounded-3xl bg-surface p-4">
          <h2 className="text-lg font-bold">Partager le voyage</h2>
          <p className="text-sm text-muted">
            Envoyez ce lien (WhatsApp, SMS…). La personne crée son compte ou se connecte, puis peut tout voir et tout modifier.
            Le lien est valable 7 jours.
          </p>
          {inviteUrl ? (
            <div className="flex flex-col gap-2">
              <input readOnly value={inviteUrl} aria-label="Lien d'invitation" className={`${inputClass} text-sm`} />
              <div className="grid grid-cols-2 gap-2">
                <CopyButton text={inviteUrl} className={btn.primary} />
                <form action={createInviteLink.bind(null, trip.id)}>
                  <SubmitButton className={`${btn.secondary} w-full`}>Nouveau lien</SubmitButton>
                </form>
              </div>
            </div>
          ) : (
            <form action={createInviteLink.bind(null, trip.id)}>
              <SubmitButton className={`${btn.primary} w-full`}>Créer un lien d&apos;invitation</SubmitButton>
            </form>
          )}
          <ul className="flex flex-col gap-2 pt-2">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3">
                <Avatars people={[m]} size={36} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold">
                    {m.name}
                    {m.userId === user.id ? " (vous)" : ""}
                  </span>
                  <span className="truncate text-[13px] text-muted">{m.role === "owner" ? "Créateur" : "Peut modifier"}</span>
                </span>
                {m.userId !== trip.createdBy && (role === "owner" || m.userId === user.id) && (
                  <form action={removeMember.bind(null, trip.id)}>
                    <input type="hidden" name="userId" value={m.userId} />
                    <SubmitButton
                      className="min-h-11 px-2 text-sm font-semibold text-danger"
                      confirm={m.userId === user.id ? "Quitter ce voyage ?" : `Retirer ${m.name} du voyage ?`}
                      confirmText={m.userId === user.id ? "Vous ne verrez plus ce voyage." : "Cette personne ne verra plus ce voyage."}
                      confirmLabel={m.userId === user.id ? "Quitter" : "Retirer"}
                    >
                      {m.userId === user.id ? "Quitter" : "Retirer"}
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Informations</h2>
          <ActionForm action={updateTrip.bind(null, trip.id)} className="flex flex-col gap-4">
            <Field label="Nom du voyage">
              <input name="title" required defaultValue={trip.title} className={inputClass} />
            </Field>
            <Field label="Destination" hint="Changer la destination met à jour la photo.">
              <input name="destination" defaultValue={trip.destination ?? ""} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Départ">
                <input name="startDate" type="date" defaultValue={trip.startDate ?? ""} className={inputClass} />
              </Field>
              <Field label="Retour">
                <input name="endDate" type="date" defaultValue={trip.endDate ?? ""} className={inputClass} />
              </Field>
            </div>
            <Field label="Statut">
              <select name="status" defaultValue={trip.status} className={inputClass}>
                <option value="idee">Idée</option>
                <option value="preparation">En préparation</option>
                <option value="confirme">Confirmé</option>
                <option value="termine">Terminé</option>
              </select>
            </Field>
            <SubmitButton className={btn.primary} pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </ActionForm>
        </section>

        {role === "owner" && (
          <form action={deleteTrip.bind(null, trip.id)}>
            <SubmitButton className={`${btn.danger} w-full`} confirm="Supprimer ce voyage ?"
              confirmText="Réservations, programme, démarches et documents seront supprimés définitivement.">
              Supprimer le voyage
            </SubmitButton>
          </form>
        )}
      </div>
    </Container>
  );
}
