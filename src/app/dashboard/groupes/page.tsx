import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/permissions";
import { GroupIcon } from "@/components/groups/group-icon";
import {
  GroupProgressBar,
  GroupStatBadges,
} from "@/components/groups/group-progress";
import { unarchiveGroup } from "./actions";

export default async function GroupesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const showArchived = sp.view === "archived";
  const { supabase, membership } = await getDashboardSession();
  const canManageGroups = hasCapability(membership.role, "manage_groups");
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: allGroups } = await supabase
    .from("signing_group")
    .select("id, name, public_token, status, created_at, template_id")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const archivedGroups = (allGroups ?? []).filter(
    (g) => g.status === "archived",
  );
  const activeGroups = (allGroups ?? []).filter(
    (g) => g.status !== "archived",
  );
  const groups = showArchived ? archivedGroups : activeGroups;

  const groupIds = (allGroups ?? []).map((g) => g.id);
  const { data: groupStatsRows } =
    groupIds.length > 0
      ? await supabase.rpc("dashboard_group_stats", {
          p_business_id: business.id,
        })
      : { data: [] as { group_id: string; total: number; signed: number }[] };

  const stats = new Map<string, { total: number; signed: number }>();
  for (const row of groupStatsRows ?? []) {
    stats.set(row.group_id, {
      total: Number(row.total),
      signed: Number(row.signed),
    });
  }

  const templateIds = [...new Set((allGroups ?? []).map((g) => g.template_id))];
  const { data: templates } =
    templateIds.length > 0
      ? await supabase
          .from("waiver_template")
          .select("id, title")
          .in("id", templateIds)
      : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((templates ?? []).map((t) => [t.id, t.title]));

  const motion =
    "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={showArchived ? "/dashboard/groupes" : "/dashboard"}
            className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
          >
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5"
            >
              ←
            </span>
            {showArchived ? "Groupes" : "Tableau de bord"}
          </Link>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface-2))] text-[var(--color-brand)]">
              <GroupIcon size={17} />
            </span>
            <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
              {showArchived ? "Groupes archivés" : "Groupes"}
            </h1>
          </div>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--color-muted)]">
            {showArchived
              ? "Groupes masqués du tableau de bord. Leurs signatures restent conservées."
              : "Une même décharge pour plusieurs participants. Suivez les signatures en un coup d'œil."}
          </p>
        </div>
        {!showArchived && canManageGroups ? (
          <Link
            href="/dashboard/groupes/new"
            className={`inline-flex h-10 items-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[transform,filter] ${motion} hover:-translate-y-px hover:brightness-[1.03]`}
          >
            Créer un groupe
          </Link>
        ) : null}
      </header>

      {groups.length === 0 ? (
        <div className="rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] text-[var(--color-brand)] shadow-[var(--elev-1)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_14%,transparent)]">
            <GroupIcon size={24} />
          </div>
          <h2 className="mt-5 text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            {showArchived ? "Aucun groupe archivé" : "Aucun groupe"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            {showArchived
              ? "Les groupes que vous archivez apparaîtront ici."
              : "Créez un groupe pour envoyer une même décharge à plusieurs participants."}
          </p>
          {!showArchived && canManageGroups ? (
            <Link
              href="/dashboard/groupes/new"
              className={`mt-6 inline-flex h-10 items-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] ${motion} hover:-translate-y-px hover:brightness-[1.03]`}
            >
              Créer un groupe
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {groups.map((g) => {
            const s = stats.get(g.id) ?? { total: 0, signed: 0 };
            const pending = Math.max(0, s.total - s.signed);
            return (
              <li key={g.id} className="relative">
                <Link
                  href={`/dashboard/groupes/${g.id}`}
                  className={`block rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-3)] ring-1 ring-black/[0.02] transition-[transform,box-shadow,border-color] ${motion} hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] hover:shadow-[var(--elev-hover)] dark:ring-white/[0.04] sm:p-5 ${
                    showArchived ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-brand)]">
                      <GroupIcon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                          {g.name}
                        </h2>
                        {g.status === "closed" ? (
                          <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)]">
                            Fermé
                          </span>
                        ) : null}
                        {g.status === "archived" ? (
                          <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)]/80">
                            Archivé
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">
                        {titleById.get(g.template_id) ?? "Décharge"}
                      </p>
                      <GroupStatBadges
                        className="mt-2.5"
                        total={s.total}
                        signed={s.signed}
                        status={g.status}
                      />
                      <GroupProgressBar
                        className="mt-3.5"
                        signed={s.signed}
                        total={s.total}
                      />
                      {pending > 0 ? (
                        <p className="mt-2 text-[12px] text-[var(--color-muted)]">
                          {pending} en attente
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
                {showArchived ? (
                  <form
                    action={unarchiveGroup}
                    className="absolute right-4 top-4 sm:right-5 sm:top-5"
                  >
                    <input type="hidden" name="group_id" value={g.id} />
                    <input type="hidden" name="return_to" value="groupes" />
                    <button
                      type="submit"
                      className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-foreground)]/82 shadow-[var(--elev-1)] transition-colors hover:bg-[var(--color-surface-2)]"
                    >
                      Désarchiver
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!showArchived && archivedGroups.length > 0 ? (
        <Link
          href="/dashboard/groupes?view=archived"
          className="self-center text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          Voir les groupes archivés ({archivedGroups.length})
        </Link>
      ) : null}
    </main>
  );
}
