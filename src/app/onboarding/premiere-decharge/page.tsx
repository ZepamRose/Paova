import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";
import {
  getPrimaryPacks,
  getSecondaryPacks,
} from "@/lib/waiver-packs";
import { createFromPreset } from "@/app/dashboard/waivers/actions";

function PackSubmitButton({
  packId,
  label,
  description,
}: {
  packId: string;
  label: string;
  description: string;
}) {
  return (
    <form action={createFromPreset}>
      <input type="hidden" name="preset_id" value={packId} />
      <button
        type="submit"
        className="flex w-full flex-col gap-1 rounded-xl border border-[var(--color-border)] p-5 text-left transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-surface-2)]"
      >
        <span className="font-semibold tracking-tight">{label}</span>
        <span className="text-sm text-[var(--color-muted)]">{description}</span>
        <span className="mt-2 text-sm font-medium text-[var(--color-brand)]">
          Utiliser ce contexte →
        </span>
      </button>
    </form>
  );
}

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

  const primaryPacks = getPrimaryPacks();
  const secondaryPacks = getSecondaryPacks();

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
          Choisissez le contexte qui correspond à votre activité. Vous pourrez
          tout modifier ensuite.
        </p>
      </div>

      {error === "preset" && (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm">
          Contexte introuvable. Réessayez ou créez une décharge manuellement.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {primaryPacks.map((pack) => (
          <li key={pack.id}>
            <PackSubmitButton
              packId={pack.id}
              label={pack.label}
              description={pack.description}
            />
          </li>
        ))}
      </ul>

      {secondaryPacks.length > 0 ? (
        <details className="group rounded-xl border border-[var(--color-border)]">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              Voir plus de contextes
              <span className="text-[var(--color-muted)] transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <ul className="flex flex-col gap-3 border-t border-[var(--color-border)] p-3">
            {secondaryPacks.map((pack) => (
              <li key={pack.id}>
                <PackSubmitButton
                  packId={pack.id}
                  label={pack.label}
                  description={pack.description}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

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
          Passer pour l&apos;instant
        </Link>
      </div>
    </main>
  );
}
