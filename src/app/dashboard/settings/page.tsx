import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { SettingsSavedBanner } from "./settings-saved-banner";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id, name, brand_color, brand_font, logo_url")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-10 sm:gap-9 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-[var(--color-muted)]/80 transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
            Réglages
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-muted)]">
            Configurez l&apos;identité de votre établissement. Les modifications
            sont automatiquement appliquées à vos pages publiques et à vos PDF.
          </p>
        </div>
      </header>

      <SettingsSavedBanner show={Boolean(success)} />

      {error === "name" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 text-sm leading-relaxed text-[#92400e] dark:text-[#fbbf24]"
        >
          Le nom de l&apos;établissement est obligatoire.
        </p>
      ) : null}

      <SettingsForm
        businessId={business.id}
        initialName={business.name}
        initialColor={business.brand_color}
        initialFont={business.brand_font}
        logoUrl={business.logo_url}
      />
    </main>
  );
}
