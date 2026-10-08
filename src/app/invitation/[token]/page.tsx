import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/actions/invites";
import { Cover } from "@/components/cover";
import { SubmitButton } from "@/components/forms";
import { PinIcon } from "@/components/icons";
import { btn } from "@/components/ui";
import { db } from "@/db";
import { tripInvites, trips } from "@/db/schema";
import { formatRange } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function InvitationPage({ params }: PageProps<"/invitation/[token]">) {
  const { token } = await params;
  if (!(await getSession())) redirect(`/connexion?next=${encodeURIComponent(`/invitation/${token}`)}`);
  const [row] = await db
    .select({ trip: trips })
    .from(tripInvites)
    .innerJoin(trips, eq(trips.id, tripInvites.tripId))
    .where(and(eq(tripInvites.token, token), gt(tripInvites.expiresAt, new Date())));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      {row ? (
        <>
          <div className="overflow-hidden rounded-3xl border border-line">
            <Cover src={row.trip.coverUrl} alt="" className="h-48 w-full" fallback={<PinIcon size={28} />} />
            <div className="flex flex-col gap-1 p-4">
              <p className="text-sm text-muted">Vous êtes invité au voyage</p>
              <h1 className="text-2xl font-bold">{row.trip.title}</h1>
              <p className="text-sm text-muted">
                {[row.trip.destination, formatRange(row.trip.startDate, row.trip.endDate)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <form action={acceptInvite.bind(null, token)}>
            <SubmitButton className={`${btn.primary} w-full`}>Rejoindre le voyage</SubmitButton>
          </form>
        </>
      ) : (
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">Lien expiré</h1>
          <p className="text-muted">Ce lien d&apos;invitation n&apos;est plus valable. Demandez-en un nouveau.</p>
          <Link href="/" className={btn.secondary}>
            Retour à mes voyages
          </Link>
        </div>
      )}
    </main>
  );
}
