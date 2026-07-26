import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/membership";
import { ExpressGroupForm } from "../express-group-form";

export default async function ExpressGroupePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const preselectedTemplateId = String(sp.template ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) redirect("/onboarding");
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title, status")
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .eq("status", "open")
    .order("title", { ascending: true });

  const choices = (templates ?? []).map((t) => ({
    id: t.id,
    title: t.title,
  }));

  const errorMsg =
    sp.error === "required"
      ? "Choisissez une décharge."
      : sp.error === "template"
        ? "Décharge introuvable ou inactive."
        : sp.error === "create"
          ? "Création impossible. Réessayez."
          : null;

  const backHref = preselectedTemplateId
    ? `/dashboard/waivers/${preselectedTemplateId}`
    : "/dashboard";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-5 py-9 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-0.5"
          >
            ←
          </span>
          Retour
        </Link>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface-2))] text-[var(--color-brand)]">
            <Zap size={18} strokeWidth={1.9} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.5rem] font-semibold tracking-tight sm:text-[1.625rem]">
              Groupe express
            </h1>
            <p className="mt-1.5 text-[14px] leading-snug text-[var(--color-muted)]">
              Option secondaire : session sans liste, QR immédiat. Pour une
              réservation ou un appel à l&apos;avance, préférez un groupe avec
              liste.
            </p>
          </div>
        </div>
      </header>

      {errorMsg ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          {errorMsg}
        </p>
      ) : null}

      {choices.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6">
          <p className="text-[14px] font-medium">Aucune décharge ouverte</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Créez ou réouvrez une décharge pour lancer un groupe express.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)]"
          >
            Créer une décharge
          </Link>
        </div>
      ) : (
        <ExpressGroupForm
          choices={choices}
          preselectedId={preselectedTemplateId}
        />
      )}

      <p className="text-[12.5px] text-[var(--color-muted)]">
        Vous avez déjà la liste des participants ?{" "}
        <Link
          href={
            preselectedTemplateId
              ? `/dashboard/groupes/new?template=${preselectedTemplateId}`
              : "/dashboard/groupes/new"
          }
          className="font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline"
        >
          Créer un groupe avec liste
        </Link>
      </p>
    </main>
  );
}
