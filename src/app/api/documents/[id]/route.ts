import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireTrip } from "@/lib/session";
import { extensionFor, readStoredFile } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return new Response("Introuvable", { status: 404 });
  await requireTrip(doc.tripId); // membership check (404 for non-members)

  const body = await readStoredFile(doc.storageKey);
  const download = new URL(request.url).searchParams.has("telecharger");
  const filename = `${doc.name}.${extensionFor(doc.mimeType)}`;
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": doc.mimeType,
      "content-length": String(body.length),
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      // Only PDFs and images are accepted at upload (see storage.ts), never HTML or SVG.
    },
  });
}
