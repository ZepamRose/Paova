import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { requireDashboardCapability } from "@/lib/auth/session";
import { createStation } from "../../actions";
import { StationTemplateSelect } from "./station-template-select";
import { SubmitButton } from "./submit-button";

const field =
  "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)] sm:p-6";

export default async function NewStationPage({
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
    .select("id, title")
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("title", { ascending: true });

  const choices = (templates ?? []).map((t) => ({
    id: t.id,
    title: t.title,
  }));

  const preselected = choices.find((t) => t.id === preselectedTemplateId) ?? null;
  const fromWaiver = Boolean(preselected);

  const errorMsg =
    sp.error === "name_required"
      ? "Le nom est obligatoire."
      : sp.error === "template_required"
        ? "La décharge est obligatoire."
        : sp.error === "template"
          ? "Décharge introuvable."
          : sp.error === "create"
            ? "Création impossible. Réessayez."
            : null;

  const backHref = fromWaiver
    ? `/dashboard/waivers/${preselected!.id}`
    : "/dashboard/groupes/new";
  const backLabel = fromWaiver ? "Décharge" : "Choix du type";

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
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,#3b82f6_12%,transparent)] text-[#3b82f6]">
            <Zap size={17} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.625rem]">
              Nouveau QR permanent
            </h1>
            <p className="mt-1 max-w-lg text-[14px] leading-snug text-[var(--color-muted)]">
              Créez un QR Code permanent pour collecter des signatures en continu.
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
        <div className="rounded-[1.25rem] border border-[color-mix(in_srgb,#3b82f6_16%,var(--color-border))] bg-[color-mix(in_srgb,#3b82f6_4%,var(--color-surface))] px-6 py-8 sm:px-8 sm:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3b82f6]">
            Un QR permanent nécessite un formulaire
          </p>
          <p className="mt-2 text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            Commencez par créer un formulaire.
          </p>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            Vous pourrez ensuite créer un QR permanent pour collecter des signatures
            en continu.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#3b82f6] px-4 text-[13px] font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-[220ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
          >
            Créer un formulaire
          </Link>
        </div>
      ) : (
        <form action={createStation} className="flex flex-col gap-5">
          <section className={`${card} flex flex-col gap-5`}>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Informations
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">
                Nom du point de signature et formulaire associé.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                Nom du QR permanent
              </span>
              <input
                name="name"
                required
                defaultValue={initialName}
                placeholder="Ex: Salle principale, Accueil, Entrée..."
                className={field}
                autoComplete="off"
              />
              <span className="text-[11.5px] text-[var(--color-muted)]">
                Ce nom n&apos;est visible que pour vous.
              </span>
            </label>

            <StationTemplateSelect
              choices={choices}
              preselected={preselected}
            />

            <div className="rounded-xl border border-[color-mix(in_srgb,#3b82f6_18%,var(--color-border))] bg-[color-mix(in_srgb,#3b82f6_5%,var(--color-surface))] px-4 py-3">
              <p className="text-[12.5px] leading-relaxed text-[var(--color-foreground)]">
                Le QR Code sera permanent et pourra être scanné à tout moment.
                Chaque scan créera automatiquement une nouvelle signature.
              </p>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
            <Link
              href={backHref}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-4 text-[13px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            >
              Annuler
            </Link>
            <SubmitButton />
          </div>
        </form>
      )}
    </main>
  );
}
