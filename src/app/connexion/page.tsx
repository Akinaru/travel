import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

function safeNext(value: string | string[] | undefined) {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white">V</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Vos voyages, au même endroit</h1>
        <p className="text-muted">Billets, logements, documents et programme, à préparer à deux.</p>
      </div>
      <LoginForm next={next} googleEnabled={googleEnabled} />
    </main>
  );
}
