import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { CopyLinkButton } from "./copy-link-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title, public_slug, is_active, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const appUrl = env.appUrl;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded-md bg-[var(--color-brand)]" />
          <span className="text-lg font-semibold tracking-tight">SafeSign</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-muted)]">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <section className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {business.name}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Vos décharges de responsabilité.
          </p>
        </div>
        <Link
          href="/dashboard/waivers/new"
          className="shrink-0 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + Nouvelle décharge
        </Link>
      </section>

      {!templates || templates.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucune décharge pour l&apos;instant. Créez-en une pour obtenir un
            lien à partager.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => {
            const publicUrl = `${appUrl}/w/${t.public_slug}`;
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{t.title}</span>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-brand)] hover:underline"
                  >
                    {publicUrl}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <CopyLinkButton url={publicUrl} />
                  <Link
                    href={`/dashboard/waivers/${t.id}`}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    Voir
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
