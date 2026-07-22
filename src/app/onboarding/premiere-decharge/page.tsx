import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";
import { WAIVER_PRESETS } from "@/lib/waiver-presets";
import { createFromPreset } from "@/app/dashboard/waivers/actions";

export default async function FirstWaiverOnboardingPage({
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

  const { data: business } = await supabase
    .from("business")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  // Already has a waiver → skip to dashboard.
  const { count } = await supabase
    .from("waiver_template")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  if ((count ?? 0) > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <BrandLogo href="/dashboard" />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Étape 2 sur 2 · {business.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Créez votre première décharge
        </h1>
        <p className="max-w-lg text-sm text-[var(--color-muted)]">
          Choisissez un modèle prêt à l&apos;emploi. Vous pourrez le modifier
          ensuite — un clic suffit pour démarrer.
        </p>
      </div>

      {error === "preset" && (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm">
          Modèle introuvable. Réessayez ou créez une décharge manuellement.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {WAIVER_PRESETS.map((preset) => (
          <li key={preset.id}>
            <form action={createFromPreset}>
              <input type="hidden" name="preset_id" value={preset.id} />
              <button
                type="submit"
                className="flex w-full flex-col gap-1 rounded-xl border border-[var(--color-border)] p-5 text-left transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-2)]"
              >
                <span className="font-semibold tracking-tight">
                  {preset.label}
                </span>
                <span className="text-sm text-[var(--color-muted)]">
                  {preset.description}
                </span>
                <span className="mt-2 text-sm font-medium text-[var(--color-brand)]">
                  Utiliser ce modèle →
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-sm">
        <Link
          href="/dashboard/waivers/new"
          className="font-medium text-[var(--color-brand)] hover:underline"
        >
          Créer une décharge de A à Z
        </Link>
        <Link
          href="/dashboard"
          className="text-[var(--color-muted)] hover:underline"
        >
          Passer et aller au tableau de bord
        </Link>
      </div>
    </main>
  );
}
