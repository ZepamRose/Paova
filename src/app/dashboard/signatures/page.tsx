import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { enrichSearchRows, searchSubmissions } from "@/lib/search";
import { SignaturesLiveSearch } from "./signatures-live-search";

export default async function SignaturesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    template?: string;
    group?: string;
    from?: string;
    to?: string;
    status?: string;
    sort?: string;
    page?: string;
    scope?: string;
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

  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) {
    redirect("/onboarding");
  }
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) {
    redirect("/onboarding");
  }

  const [
    { data: templates },
    { data: groups },
    { count: totalSignatures },
    { data: latest },
  ] = await Promise.all([
    supabase
      .from("waiver_template")
      .select("id, title")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .order("title", { ascending: true }),
    supabase
      .from("signing_group")
      .select("id, name, template_id, status")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("submission_search")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("submission_search")
      .select("signed_at")
      .eq("business_id", business.id)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const groupOptions = (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    templateId: g.template_id,
    status: g.status,
  }));

  const overview = {
    totalSignatures: totalSignatures ?? 0,
    totalTemplates: (templates ?? []).length,
    totalGroups: groupOptions.length,
    lastSignedAt: latest?.signed_at ?? null,
  };

  const q = sp.q?.trim() || "";
  const templateId = sp.template?.trim() || "";
  const groupId = sp.group?.trim() || "";
  const from = sp.from?.trim() || "";
  const to = sp.to?.trim() || "";
  const status = sp.status?.trim() || "signed";
  const sortRaw = sp.sort?.trim() || "date_desc";
  const initialSort =
    sortRaw === "date_asc" ||
    sortRaw === "name_asc" ||
    sortRaw === "name_desc" ||
    sortRaw === "date_desc"
      ? sortRaw
      : "date_desc";
  const pageParsed = Number.parseInt(sp.page?.trim() || "1", 10);
  const initialPage =
    Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
  const scopeRaw = sp.scope?.trim() || "all";
  const initialScope =
    scopeRaw === "today" || scopeRaw === "week" ? scopeRaw : "all";

  let initialRows: Awaited<ReturnType<typeof enrichSearchRows>> = [];
  let initialError: string | null = null;
  try {
    const rows = await searchSubmissions(supabase, {
      q,
      templateId: templateId || null,
      groupId: groupId || null,
      from: from || null,
      to: to || null,
      status: status || null,
      limit: 200,
      offset: 0,
    });
    initialRows = await enrichSearchRows(supabase, rows);
  } catch {
    initialError =
      "La recherche est indisponible. Vérifiez que la migration 0010 a été appliquée.";
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-2.5 px-5 py-5 sm:gap-3 sm:px-6 sm:py-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-brand)_9%,transparent),transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-48 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_srgb,var(--color-foreground)_4%,transparent),transparent_75%)]"
        aria-hidden
      />
      <Link
        href="/dashboard"
        className="group inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)]"
      >
        <span
          className="transition-transform duration-150 group-hover:-translate-x-0.5"
          aria-hidden
        >
          ←
        </span>
        Tableau de bord
      </Link>

      <SignaturesLiveSearch
        templates={templates ?? []}
        groups={groupOptions}
        overview={overview}
        initialFilters={{
          q,
          template: templateId,
          group: groupId,
          from,
          to,
          status,
        }}
        initialSort={initialSort}
        initialPage={initialPage}
        initialScope={initialScope}
        initialRows={initialRows}
        initialError={initialError}
        allowExport={hasCapability(membership.role, "export_data")}
        allowErase={hasCapability(membership.role, "delete_submission")}
      />
    </main>
  );
}
