import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Zap } from "lucide-react";
import { requireDashboardCapability } from "@/lib/auth/session";
import { GroupIcon } from "@/components/groups/group-icon";

export default async function NewActivityTypePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; name?: string }>;
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

  const hasTemplates = (templates ?? []).length > 0;
  const fromWaiver = Boolean(preselectedTemplateId);
  const backHref = fromWaiver
    ? `/dashboard/waivers/${preselectedTemplateId}`
    : "/dashboard";
  const backLabel = fromWaiver ? "Décharge" : "Tableau de bord";

  // Build query params to pass to sub-pages
  const queryParams = new URLSearchParams();
  if (preselectedTemplateId) queryParams.set("template", preselectedTemplateId);
  if (initialName) queryParams.set("name", initialName);
  const query = queryParams.toString();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-5 py-9 sm:px-6 sm:py-12">
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
            <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
              Nouvelle activité
            </h1>
            <p className="mt-1 max-w-lg text-[14px] leading-snug text-[var(--color-muted)]">
              Choisissez le type d&apos;activité que vous souhaitez créer.
            </p>
          </div>
        </div>
      </header>

      {!hasTemplates ? (
        <div className="rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] px-6 py-8 sm:px-8 sm:py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand)]">
            Une activité nécessite un formulaire
          </p>
          <p className="mt-2 text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            Commencez par créer un formulaire.
          </p>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            Vous pourrez ensuite créer une session planifiée ou un QR permanent
            pour collecter les signatures.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-[220ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Créer un formulaire
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Session planifiée */}
          <Link
            href={`/dashboard/groupes/new/session${query ? `?${query}` : ""}`}
            className="group relative flex flex-col gap-4 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-[220ms] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] text-[var(--color-brand)] transition-transform duration-[220ms] group-hover:scale-110">
              <Calendar size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[1.125rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                Session planifiée
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                Créer une activité avec une date, une heure et des participants
                connus à l&apos;avance.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-brand)]">
              <span>Créer une session</span>
              <span
                aria-hidden
                className="transition-transform duration-[220ms] group-hover:translate-x-0.5"
              >
                →
              </span>
            </div>
          </Link>

          {/* QR permanent */}
          <Link
            href={`/dashboard/groupes/new/station${query ? `?${query}` : ""}`}
            className="group relative flex flex-col gap-4 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-[220ms] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,#3b82f6_10%,transparent)] text-[#3b82f6] transition-transform duration-[220ms] group-hover:scale-110">
              <Zap size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[1.125rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                QR permanent
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                Créer un QR Code permanent que les visiteurs pourront scanner
                librement tout au long de la journée.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-[12.5px] font-medium text-[#3b82f6]">
              <span>Créer un QR</span>
              <span
                aria-hidden
                className="transition-transform duration-[220ms] group-hover:translate-x-0.5"
              >
                →
              </span>
            </div>
          </Link>
        </div>
      )}
    </main>
  );
}
