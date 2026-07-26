import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDashboardCapability } from "@/lib/auth/session";
import { GroupIcon } from "@/components/groups/group-icon";
import { detectRosterMode } from "@/lib/groups";
import { NewGroupForm } from "../new-group-form";

export default async function NewGroupePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; template?: string; name?: string }>;
}) {
  const sp = await searchParams;
  const preselectedTemplateId = String(sp.template ?? "").trim();
  const initialName = String(sp.name ?? "").trim();
  const { supabase, membership } =
    await requireDashboardCapability("manage_groups");
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title, status, fields")
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("title", { ascending: true });

  // Un groupe peut s'appuyer sur n'importe quelle décharge active (classe,
  // équipe, entreprise, association, événement…) — pas seulement celles avec
  // un champ "participants" (ex. liste d'enfants).
  const choices = (templates ?? []).map((t) => {
    const fields = (
      Array.isArray(t.fields) ? t.fields : []
    ) as { label?: unknown; type?: unknown }[];
    const normalizedFields = fields
      .map((f) => ({
        label: typeof f.label === "string" ? f.label : "",
        type: typeof f.type === "string" ? f.type : "",
      }))
      .filter((f) => f.label);
    return {
      id: t.id,
      title: t.title,
      rosterMode: detectRosterMode(normalizedFields),
      fieldLabels: normalizedFields.map((f) => f.label),
    };
  });
  const preselected =
    choices.find((t) => t.id === preselectedTemplateId) ?? null;
  const fromWaiver = Boolean(preselected);

  const errorMsg =
    sp.error === "required"
      ? "Indiquez un nom et une décharge."
      : sp.error === "template"
        ? "Décharge introuvable."
        : sp.error === "create"
          ? "Création impossible. Réessayez."
          : sp.error === "members"
            ? "Le groupe n'a pas pu être créé : l'import de la liste a échoué. Vérifiez le fichier et réessayez."
            : null;

  const backHref = fromWaiver
    ? `/dashboard/waivers/${preselected!.id}`
    : "/dashboard";
  const backLabel = fromWaiver ? "Décharge" : "Tableau de bord";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-9 sm:gap-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] duration-200 hover:text-[var(--color-foreground)]"
        >
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            ←
          </span>
          {backLabel}
        </Link>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface-2))] text-[var(--color-brand)]">
            <GroupIcon size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.625rem]">
              Nouveau groupe
            </h1>
            <p className="mt-1 max-w-lg text-[14px] leading-snug text-[var(--color-muted)]">
              Liste à l&apos;avance, signature avant le jour J ou sur place.
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
        <div className="rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] px-6 py-8 sm:px-8 sm:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand)]">
            Un groupe nécessite une décharge
          </p>
          <p className="mt-2 text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            Commencez par créer une décharge.
          </p>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            Vous pourrez ensuite créer un groupe pour une classe, une équipe,
            une entreprise ou tout autre ensemble de participants.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-[220ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Créer une décharge
          </Link>
        </div>
      ) : (
        <NewGroupForm
          choices={choices}
          preselected={preselected}
          fromWaiver={fromWaiver}
          initialName={initialName}
        />
      )}
    </main>
  );
}
