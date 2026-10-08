import { asc, eq, inArray } from "drizzle-orm";
import { addItem, createChecklist, cycleItem, deleteChecklist, deleteItem } from "@/actions/checklists";
import { uploadDocuments } from "@/actions/documents";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CheckIcon, FileIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Badge, btn, EmptyState, Field, inputClass } from "@/components/ui";
import { UploadButton } from "@/components/upload";
import { db } from "@/db";
import { checklistItems, checklists, documents } from "@/db/schema";
import { formatShortDate } from "@/lib/format";
import { requireTrip } from "@/lib/session";

const STATUS = {
  todo: { label: "À faire", tone: "neutral" as const },
  progress: { label: "En cours", tone: "warm" as const },
  done: { label: "Fait", tone: "accent" as const },
};

function StatusDot({ status }: { status: keyof typeof STATUS }) {
  if (status === "done")
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-white">
        <CheckIcon size={16} strokeWidth={3} />
      </span>
    );
  if (status === "progress")
    return (
      <span className="flex size-7 items-center justify-center rounded-full border-[2.5px] border-warm">
        <span className="size-2.5 rounded-full bg-warm" />
      </span>
    );
  return <span className="size-7 rounded-full border-2 border-[#c9c4bb]" />;
}

function NewChecklistForm({ tripId }: { tripId: string }) {
  return (
    <ActionForm action={createChecklist.bind(null, tripId)} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Partir de</legend>
        {[
          { value: "visa", label: "Dossier de visa", hint: "10 documents courants, à ajuster selon le consulat" },
          { value: "depart", label: "Avant le départ", hint: "Banque, assurance, téléphone…" },
          { value: "vide", label: "Liste vide", hint: "Vous ajoutez vos propres étapes" },
        ].map((t, i) => (
          <label key={t.value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-3.5 has-checked:border-accent has-checked:bg-accent-soft/40">
            <input type="radio" name="template" value={t.value} defaultChecked={i === 0} className="mt-1 size-4 accent-[#0a6670]" />
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">{t.label}</span>
              <span className="text-[13px] text-muted">{t.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field label="Nom" hint="Facultatif pour les modèles">
        <input name="title" placeholder="Ex. : Visa de stage" className={inputClass} />
      </Field>
      <Field label="À terminer avant le">
        <input name="dueDate" type="date" className={inputClass} />
      </Field>
      <SubmitButton className={btn.primary}>Créer la liste</SubmitButton>
    </ActionForm>
  );
}

export default async function DemarchesPage({ params }: PageProps<"/voyages/[id]/demarches">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const lists = await db.select().from(checklists).where(eq(checklists.tripId, trip.id)).orderBy(asc(checklists.createdAt));
  const items = lists.length
    ? await db
        .select({ item: checklistItems, docName: documents.name })
        .from(checklistItems)
        .leftJoin(documents, eq(documents.id, checklistItems.documentId))
        .where(inArray(checklistItems.checklistId, lists.map((l) => l.id)))
        .orderBy(asc(checklistItems.position))
    : [];

  if (lists.length === 0) {
    return (
      <div className="flex flex-col gap-5 pt-2">
        <EmptyState
          icon={<FileIcon size={26} />}
          title="Aucune démarche"
          text="Visa, papiers, vaccins : suivez chaque document à obtenir et rangez-le au même endroit."
        />
        <NewChecklistForm tripId={trip.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      {lists.map((list) => {
        const rows = items.filter((r) => r.item.checklistId === list.id);
        const done = rows.filter((r) => r.item.status === "done").length;
        return (
          <section key={list.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 rounded-3xl bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold">{list.title}</h2>
                <span className="text-[15px] font-bold">
                  {done} / {rows.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-line">
                <div className="h-full bg-accent transition-all" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
              </div>
              {list.dueDate && <span className="text-[13px] text-muted">À terminer avant le {formatShortDate(list.dueDate)}</span>}
            </div>
            <p className="text-[13px] text-muted">Touchez le rond pour changer le statut : à faire, en cours, fait.</p>

            <ul className="flex flex-col gap-2">
              {rows.map(({ item, docName }) => (
                <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
                  <div className="flex items-center gap-3">
                    <form action={cycleItem.bind(null, trip.id, item.id)}>
                      <SubmitButton className="flex size-11 items-center justify-center rounded-full" aria-label={`${item.label} : ${STATUS[item.status].label}, changer le statut`}>
                        <StatusDot status={item.status} />
                      </SubmitButton>
                    </form>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`text-[15px] font-semibold ${item.status === "done" ? "text-muted line-through decoration-1" : ""}`}>{item.label}</span>
                      {item.hint && <span className="text-[13px] text-muted">{item.hint}</span>}
                    </div>
                    <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 pl-14">
                    {item.documentId ? (
                      <a href={`/api/documents/${item.documentId}`} target="_blank" rel="noopener" className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-strong">
                        <FileIcon size={16} /> {docName}
                      </a>
                    ) : (
                      <UploadButton
                        action={uploadDocuments.bind(null, trip.id)}
                        category="visa"
                        itemId={item.id}
                        className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-strong"
                      >
                        <PlusIcon size={16} /> Joindre le document
                      </UploadButton>
                    )}
                    <form action={deleteItem.bind(null, trip.id, item.id)} className="ml-auto">
                      <SubmitButton className={`${btn.icon} size-9 text-muted`} aria-label={`Retirer ${item.label}`} confirm={`Retirer « ${item.label} » de la liste ?`} confirmLabel="Retirer">
                        <TrashIcon size={16} />
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            <details className="group rounded-2xl">
              <summary className={`${btn.dashed} cursor-pointer list-none group-open:hidden`}>
                <PlusIcon size={18} /> Ajouter un document à prévoir
              </summary>
              <ActionForm action={addItem.bind(null, trip.id, list.id)} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                <Field label="Document ou étape">
                  <input name="label" required className={inputClass} />
                </Field>
                <Field label="Précision">
                  <input name="hint" placeholder="Facultatif" className={inputClass} />
                </Field>
                <SubmitButton className={btn.primary}>Ajouter</SubmitButton>
              </ActionForm>
            </details>

            <form action={deleteChecklist.bind(null, trip.id, list.id)} className="self-center">
              <SubmitButton className="min-h-11 text-sm font-semibold text-danger" confirm={`Supprimer la liste « ${list.title} » ?`}
                confirmText="Les documents joints restent dans l'onglet Documents.">
                Supprimer cette liste
              </SubmitButton>
            </form>
          </section>
        );
      })}

      <details className="rounded-3xl border border-line p-4">
        <summary className="cursor-pointer text-[15px] font-bold">Nouvelle liste de démarches</summary>
        <div className="pt-4">
          <NewChecklistForm tripId={trip.id} />
        </div>
      </details>
    </div>
  );
}
