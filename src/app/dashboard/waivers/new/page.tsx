import Link from "next/link";
import { requireDashboardCapability } from "@/lib/auth/session";
import { WaiverForm } from "../waiver-form";

export default async function NewWaiverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string; name?: string }>;
}) {
  const { error, return_to, name } = await searchParams;
  await requireDashboardCapability("manage_waivers");

  // Only ever hop back to a same-origin, known internal flow (never an
  // arbitrary redirect target coming from the query string).
  const returnTo =
    return_to && return_to.startsWith("/dashboard/groupes/new")
      ? `${return_to}${name ? `${return_to.includes("?") ? "&" : "?"}name=${encodeURIComponent(name)}` : ""}`
      : null;

  const backHref = returnTo ?? "/dashboard";
  const backLabel = returnTo ? "Nouvelle session" : "Tableau de bord";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-10 sm:gap-9 sm:px-6 sm:py-12">
      <header className="animate-fade-up flex flex-col gap-3.5">
        <Link
          href={backHref}
          className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          <span
            aria-hidden
            className="transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          >
            ←
          </span>
          {backLabel}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
            Nouvelle décharge
          </h1>
          <p className="max-w-lg text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
            {returnTo
              ? "Créez le formulaire pour votre session. Vous reviendrez directement à la création de la session une fois terminé."
              : "Choisissez un contexte pour démarrer plus vite, puis ajustez le contenu. Vous pourrez ensuite partager le lien ou le QR code."}
          </p>
        </div>
      </header>

      <div className="animate-fade-up-delay">
        <WaiverForm hasError={error === "required"} returnTo={returnTo} />
      </div>
    </main>
  );
}
