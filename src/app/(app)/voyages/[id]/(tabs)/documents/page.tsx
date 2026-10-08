import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { deleteDocument, uploadDocuments } from "@/actions/documents";
import { SubmitButton } from "@/components/forms";
import { LockIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { btn } from "@/components/ui";
import { UploadButton } from "@/components/upload";
import { db } from "@/db";
import { documents, type DocumentRow } from "@/db/schema";
import { formatSize, formatShortDate } from "@/lib/format";
import { requireTrip } from "@/lib/session";
import { extensionFor } from "@/lib/storage";

const CATEGORIES: { id: DocumentRow["category"]; label: string }[] = [
  { id: "identite", label: "Identité" },
  { id: "billets", label: "Billets" },
  { id: "visa", label: "Visa" },
  { id: "logement", label: "Logement" },
  { id: "autre", label: "Autre" },
];

export default async function DocumentsPage({ params, searchParams }: PageProps<"/voyages/[id]/documents">) {
  const { id } = await params;
  const { trip } = await requireTrip(id);
  const requested = (await searchParams).type;
  const filter = CATEGORIES.find((c) => c.id === requested)?.id ?? null;
  const all = await db.select().from(documents).where(eq(documents.tripId, trip.id)).orderBy(desc(documents.createdAt));
  const shown = filter ? all.filter((d) => d.category === filter) : all;
  const chip = (active: boolean) =>
    `flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${active ? "bg-accent text-white" : "border border-line"}`;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div id="ajouter" className="scroll-mt-20">
        <UploadButton
          action={uploadDocuments.bind(null, trip.id)}
          category={filter ?? "autre"}
          className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-3xl border-[1.5px] border-dashed border-accent bg-[#f2f8f8] text-accent-strong"
        >
          <UploadIcon size={24} />
          <span className="text-[15px] font-bold">Ajouter un fichier</span>
          <span className="text-[13px]">
            Photo ou PDF{filter ? ` · rangé dans « ${CATEGORIES.find((c) => c.id === filter)!.label} »` : ""}
          </span>
        </UploadButton>
      </div>

      <div role="group" aria-label="Filtrer" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        <Link href="?" replace scroll={false} className={chip(!filter)} aria-current={!filter ? "true" : undefined}>
          Tous
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`?type=${c.id}`} replace scroll={false} className={chip(filter === c.id)} aria-current={filter === c.id ? "true" : undefined}>
            {c.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">Aucun document ici pour l&apos;instant.</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
            <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-3">
              {d.mimeType.startsWith("image/") && d.mimeType !== "image/heic" && d.mimeType !== "image/heif" ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, authenticated file
                <img src={`/api/documents/${d.id}`} alt="" className="h-14 w-12 shrink-0 rounded-lg bg-sand object-cover" />
              ) : (
                <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg bg-sand text-[11px] font-bold text-muted uppercase">
                  {extensionFor(d.mimeType)}
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">{d.name}</span>
                <span className="text-[13px] text-muted">
                  {CATEGORIES.find((c) => c.id === d.category)?.label} · {formatSize(d.size)} · {formatShortDate(d.createdAt.toISOString())}
                </span>
              </span>
            </a>
            <form action={deleteDocument.bind(null, trip.id, d.id)}>
              <SubmitButton className={`${btn.icon} text-muted`} aria-label={`Supprimer ${d.name}`} confirm={`Supprimer « ${d.name} » ?`} confirmText="Le fichier sera supprimé définitivement.">
                <TrashIcon size={18} />
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>

      <p className="flex items-center justify-center gap-2 text-[13px] text-muted">
        <LockIcon size={16} /> Visible seulement par les membres du voyage
      </p>
    </div>
  );
}
