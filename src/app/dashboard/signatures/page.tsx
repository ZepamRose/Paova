import Link from "next/link";
import { redirect } from "next/navigation";
import { FileDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchSubmissions } from "@/lib/search";

const inputClass =
  "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-sm shadow-[var(--elev-1)] outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildExportHref(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return `/dashboard/signatures/export${s ? `?${s}` : ""}`;
}

export default async function SignaturesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    template?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    redirect("/onboarding");
  }

  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title")
    .eq("business_id", business.id)
    .order("title", { ascending: true });

  const q = sp.q?.trim() || "";
  const templateId = sp.template?.trim() || "";
  const from = sp.from?.trim() || "";
  const to = sp.to?.trim() || "";
  const status = sp.status?.trim() || "signed";

  let rows: Awaited<ReturnType<typeof searchSubmissions>> = [];
  let searchError: string | null = null;
  try {
    rows = await searchSubmissions(supabase, {
      q,
      templateId: templateId || null,
      from: from || null,
      to: to || null,
      status: status || null,
      limit: 100,
      offset: 0,
    });
  } catch {
    searchError =
      "La recherche est indisponible. Vérifiez que la migration 0010 a été appliquée.";
  }

  const exportHref = buildExportHref({
    q: q || undefined,
    template: templateId || undefined,
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-5 py-10 sm:gap-9 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
              Signatures
            </h1>
            <p className="mt-1.5 text-[15px] text-[var(--color-muted)]">
              Recherchez par nom, email, téléphone, référence ou empreinte.
            </p>
          </div>
          <a
            href={exportHref}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-4 text-sm font-medium shadow-[var(--elev-1)] transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)]"
          >
            <FileDown size={15} strokeWidth={1.85} aria-hidden />
            Exporter CSV
          </a>
        </div>
      </header>

      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)] sm:p-6">
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          method="get"
        >
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search
              size={15}
              strokeWidth={1.85}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nom, email, téléphone, PV-…, SHA-256…"
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="template" className="text-[12px] font-medium text-[var(--color-muted)]">
              Décharge
            </label>
            <select
              id="template"
              name="template"
              defaultValue={templateId}
              className={inputClass}
            >
              <option value="">Toutes</option>
              {(templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="from" className="text-[12px] font-medium text-[var(--color-muted)]">
              Du
            </label>
            <input
              id="from"
              type="date"
              name="from"
              defaultValue={from}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="to" className="text-[12px] font-medium text-[var(--color-muted)]">
              Au
            </label>
            <input
              id="to"
              type="date"
              name="to"
              defaultValue={to}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-[12px] font-medium text-[var(--color-muted)]">
              Statut
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className={inputClass}
            >
              <option value="signed">Signées</option>
              <option value="all">Tous</option>
            </select>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[filter,transform] hover:-translate-y-px hover:brightness-[1.04]"
            >
              Rechercher
            </button>
            <Link
              href="/dashboard/signatures"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] px-4 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
            >
              Réinitialiser
            </Link>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--color-muted)]">
          {searchError
            ? searchError
            : `${rows.length} résultat${rows.length === 1 ? "" : "s"}${
                rows.length >= 100 ? " (limité à 100)" : ""
              }`}
        </p>

        {!searchError && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-6 py-10 text-center text-sm text-[var(--color-muted)]">
            Aucune signature ne correspond à ces filtres.
          </div>
        ) : null}

        {!searchError && rows.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-1)] divide-y divide-[color-mix(in_srgb,var(--color-border)_48%,transparent)]">
            {rows.map((row) => (
              <li
                key={row.submission_id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {row.signer_name}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-muted)]">
                    {row.signer_email || "Sans email"}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[var(--color-muted)]">
                    {row.template_title}
                    {row.proof_reference ? ` · ${row.proof_reference}` : ""}
                    {row.template_version != null
                      ? ` · v${row.template_version}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-[var(--color-muted)]">
                    {formatDateTime(row.signed_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/dashboard/waivers/${row.template_id}`}
                    className="inline-flex h-9 items-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] px-3 text-[13px] font-medium transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    Décharge
                  </Link>
                  <a
                    href={`/dashboard/waivers/${row.template_id}/submissions/${row.submission_id}/pdf`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,#c45c5c_18%,var(--color-border))] bg-[color-mix(in_srgb,#c45c5c_5%,var(--color-surface))] px-3 text-[13px] font-medium text-[#a84848] dark:text-[#e8b4b4]"
                  >
                    <FileDown size={14} strokeWidth={1.85} aria-hidden />
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
