"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { DashboardGroupRow, DashboardListView } from "@/lib/dashboard/types";
import { formatRelativeFr } from "@/lib/dates";
import { GroupIcon } from "@/components/groups/group-icon";
import { GroupProgressBar } from "@/components/groups/group-progress";
import { CopyLinkButton } from "./copy-link-button";
import {
  DASHBOARD_PAGE_SIZE,
  DashboardListPagination,
} from "./dashboard-list-pagination";
import { unarchiveGroup } from "./groupes/actions";

const LIST_EASE = [0.22, 1, 0.36, 1] as const;
const motionCls = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";


export function DashboardGroupsSection({
  groups,
  archivedGroups,
  listView,
  searchActive = false,
  appUrl,
  canCreateGroup = true,
}: {
  groups: DashboardGroupRow[];
  archivedGroups: DashboardGroupRow[];
  listView: DashboardListView;
  searchActive?: boolean;
  appUrl: string;
  /** False when no active waiver exists — group creation is blocked. */
  canCreateGroup?: boolean;
}) {
  const [page, setPage] = useState(1);
  const reduced = useReducedMotion() ?? false;
  const showArchived = listView === "archived";
  const rows = showArchived ? archivedGroups : groups;
  const totalPages = Math.max(1, Math.ceil(rows.length / DASHBOARD_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * DASHBOARD_PAGE_SIZE;
    return rows.slice(start, start + DASHBOARD_PAGE_SIZE);
  }, [rows, safePage]);

  const rowIds = rows.map((r) => r.id).join("|");

  useEffect(() => {
    setPage(1);
  }, [listView, searchActive, rowIds]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const groupCard =
    "relative overflow-hidden border border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_3.5%,var(--color-surface))] shadow-[var(--elev-3)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]";
  const cardHover = `transition-[transform,box-shadow,border-color,background-color] ${motionCls} hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_5.5%,var(--color-surface))] hover:shadow-[var(--elev-hover)]`;
  const primaryBtn = `shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,box-shadow,filter] ${motionCls} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985]`;
  const quietAction = `inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,background-color,transform] ${motionCls} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;
  /** Primary card action — open the group. */
  const viewAction = `inline-flex h-8 items-center rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,box-shadow,color] ${motionCls} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] hover:shadow-[var(--elev-2)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;

  return (
    <section
      className="flex flex-col gap-4 sm:gap-5"
      aria-labelledby="dashboard-groups-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              aria-hidden
            >
              <GroupIcon size={14} />
            </span>
            <h2
              id="dashboard-groups-heading"
              className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.1rem]"
            >
              Groupes de signature
              {rows.length > 0 ? (
                <span className="ml-1.5 tabular-nums font-medium text-[var(--color-muted)]">
                  {rows.length}
                </span>
              ) : null}
            </h2>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-muted)]">
            {searchActive
              ? rows.length === 0
                ? "Aucun résultat pour cette recherche."
                : `${rows.length} résultat${rows.length > 1 ? "s" : ""}`
              : showArchived
                ? "Masqués du tableau de bord — signatures conservées."
                : "Suivez la progression collective, signature après signature."}
          </p>
        </div>
        {!showArchived && canCreateGroup ? (
          <Link
            href="/dashboard/groupes/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-3 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <GroupIcon size={13} className="text-[var(--color-brand)]" />
            Nouveau groupe
          </Link>
        ) : null}
      </div>

      {!showArchived && !canCreateGroup && !searchActive ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))] px-4 py-3.5">
          <p className="text-[13.5px] font-medium text-[var(--color-foreground)]">
            Un groupe nécessite une décharge
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            Commencez par créer une décharge. Vous pourrez ensuite créer un
            groupe pour une classe, une équipe, une entreprise ou tout autre
            ensemble de participants.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-3 inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-[12.5px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] duration-[220ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Créer une décharge
          </Link>
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {rows.length === 0 ? (
          canCreateGroup || showArchived || searchActive ? (
          <motion.div
            key={`empty-groups-${listView}-${searchActive}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: LIST_EASE }}
            className={`flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-6 text-center ${
              searchActive ? "py-8" : "py-10 sm:px-10 sm:py-11"
            }`}
          >
            {!searchActive ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[var(--elev-1)]">
                <GroupIcon size={22} />
              </div>
            ) : null}
            <div className="flex max-w-sm flex-col gap-1.5">
              <p className="text-[15px] font-semibold tracking-tight">
                {searchActive
                  ? "Aucun groupe trouvé"
                  : showArchived
                    ? "Aucun groupe archivé"
                    : "Aucun groupe pour l’instant"}
              </p>
              {!searchActive ? (
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {showArchived
                    ? "Les groupes archivés apparaissent ici. Vous pourrez les désarchiver à tout moment."
                    : "Créez un groupe pour envoyer une même décharge à plusieurs participants."}
                </p>
              ) : null}
            </div>
            {!showArchived && !searchActive && canCreateGroup ? (
              <Link
                href="/dashboard/groupes/new"
                className={`inline-flex min-h-10 items-center rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] ${primaryBtn}`}
              >
                Créer un groupe
              </Link>
            ) : null}
          </motion.div>
          ) : null
        ) : (
          <motion.div
            key={`list-groups-${listView}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: LIST_EASE }}
            className="flex flex-col gap-2.5"
          >
            <ul className="flex flex-col gap-2.5">
              {visibleRows.map((g) => {
                const closed = g.status === "closed";
                const publicUrl = `${appUrl}/g/${g.public_token}`;
                const createdRel = formatRelativeFr(g.created_at);

                return (
                  <motion.li
                    key={g.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: LIST_EASE,
                    }}
                    className={`relative z-0 rounded-[1.15rem] hover:z-10 ${groupCard} ${cardHover}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[var(--color-brand)]"
                    />

                    <div className="flex flex-col gap-2.5 px-3.5 py-3 pl-4 sm:px-4 sm:py-3.5 sm:pl-[1.15rem]">
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/dashboard/groupes/${g.id}`}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-surface))] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_24%,transparent)]">
                            <GroupIcon size={17} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[15px]">
                                {g.name}
                              </h3>
                              <span className="inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] px-2 py-0.5 text-[10.5px] font-semibold leading-4 tracking-[0.02em] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_24%,transparent)]">
                                Groupe
                              </span>
                              {closed ? (
                                <span className="shrink-0 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
                                  Fermé
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-muted)]">
                              {g.template_title}
                              {createdRel ? (
                                <>
                                  <span
                                    aria-hidden
                                    className="mx-1.5 text-[var(--color-muted)]/35"
                                  >
                                    ·
                                  </span>
                                  <span>Créé {createdRel}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </Link>

                        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                          {showArchived ? (
                            <form action={unarchiveGroup}>
                              <input
                                type="hidden"
                                name="group_id"
                                value={g.id}
                              />
                              <input
                                type="hidden"
                                name="return_to"
                                value="dashboard"
                              />
                              <button type="submit" className={quietAction}>
                                Désarchiver
                              </button>
                            </form>
                          ) : (
                            <CopyLinkButton
                              url={publicUrl}
                              variant="icon"
                              size="sm"
                            />
                          )}
                          <Link
                            href={`/dashboard/groupes/${g.id}`}
                            className={viewAction}
                          >
                            Voir
                          </Link>
                        </div>
                      </div>

                      {/* Progress well — collective tracking signal */}
                      <Link
                        href={`/dashboard/groupes/${g.id}`}
                        className="block rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] px-3 py-2.5 ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] transition-[background-color,ring-color] duration-[220ms] hover:bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                      >
                        <GroupProgressBar
                          variant="dashboard"
                          signed={g.signed}
                          total={g.total}
                        />
                      </Link>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <DashboardListPagination
              page={safePage}
              totalPages={totalPages}
              totalItems={rows.length}
              onChange={setPage}
              label="groupes"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
