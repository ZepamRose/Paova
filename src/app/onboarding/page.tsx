import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // If the user already has a business, skip onboarding.
  const { data: existing } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenue sur SafeSign
        </h1>
        <p className="text-[var(--color-muted)]">
          Comment s&apos;appelle votre établissement ?
        </p>
      </div>

      <form action={createBusiness} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          required
          placeholder="Ex. Escape Room Lyon"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />

        {error === "name" && (
          <p className="text-sm text-red-600">Veuillez saisir un nom.</p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Créer mon espace
        </button>
      </form>
    </main>
  );
}
