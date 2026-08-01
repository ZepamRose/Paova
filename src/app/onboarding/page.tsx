import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { createBusiness } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If the user already belongs to a business (owner, admin, or a newly
  // claimed invite), skip onboarding entirely.
  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (membership) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <BrandLogo href="/dashboard" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenue sur Paova
        </h1>
        <p className="text-[var(--color-muted)]">
          Comment s&apos;appelle votre établissement ?
        </p>
        <p className="text-xs text-[var(--color-muted)]">Étape 1 sur 2</p>
      </div>

      <form action={createBusiness} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          required
          placeholder="Ex. Studio Yoga Marseille · Club Escalade Lyon · École de Surf"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />

        {error === "name" && (
          <p className="text-sm text-red-600">Veuillez saisir un nom.</p>
        )}
        {error === "invite_pending" && (
          <p className="text-sm text-red-600">
            Une invitation est encore en attente pour votre adresse. Ouvrez le
            lien reçu par e-mail, ou contactez la personne qui vous a invité.
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] transition-opacity hover:opacity-90"
        >
          Créer mon espace
        </button>
      </form>
    </main>
  );
}
