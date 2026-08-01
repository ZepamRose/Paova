"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { DashboardGroupRow, DashboardListView } from "@/lib/dashboard/types";
import { StatusBadge } from "@/components/status-badge";
import { GroupIcon } from "@/components/groups/group-icon";
import { GroupProgressBar } from "@/components/groups/group-progress";
import {
  DASHBOARD_PAGE_SIZE,
  DashboardListPagination,
} from "./dashboard-list-pagination";
import { GroupActionsMenu } from "./group-actions-menu";
import { NewSessionModal } from "./groupes/new-session-modal";

const LIST_EASE = [0.22, 1, 0.36, 1] as const;

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "Mardi 14 octobre • 09:30", ou null si la session n'est pas datée. */
function formatSchedule(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = DATE_FMT.format(d);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} • ${TIME_FMT.format(d)}`;
}
const motionCls = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";


export function DashboardGroupsSection({
  groups,
  archivedGroups,
  listView,
  searchActive = false,
  appUrl,
  canCreateGroup = true,
  canCreateGroups = true,
  canManageGroups = true,
  templateChoices = [],
}: {
  groups: DashboardGroupRow[];
  archivedGroups: DashboardGroupRow[];
  listView: DashboardListView;
  searchActive?: boolean;
  appUrl: string;
  /** False when no active waiver exists — group creation is blocked. */
  canCreateGroup?: boolean;
  /** Créer / animer une session — ouvert aux collaborateurs. */
  canCreateGroups?: boolean;
  /** Archiver / restaurer — propriétaires et administrateurs. */
  canManageGroups?: boolean;
  templateChoices?: Array<{ id: string; title: string }>;
}) {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
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
    "relative overflow-hidden border border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] shadow-[var(--elev-3)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]";
  const cardHover = `cursor-pointer transition-[transform,box-shadow,border-color,background-color] ${motionCls} hover:-translate-y-[1.5px] hover:border-[color-mix(in_srgb,var(--color-brand)_45%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] hover:shadow-[var(--elev-hover)]`;
  const primaryBtn = `shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,box-shadow,filter] ${motionCls} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.98]`;

  return (
    <section
      className="flex flex-col gap-5 sm:gap-6"
      aria-labelledby="dashboard-groups-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              aria-hidden
            >
              <GroupIcon size={14} />
            </span>
            <h2
              id="dashboard-groups-heading"
              className="text-[1.08rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.15rem]"
            >
              {showArchived
                ? "Sessions archivées"
                : "Sessions planifiées"}
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
                ? "Masquées du tableau de bord — données conservées."
                : "Gérez vos sessions en direct."}
          </p>
        </div>
      </div>

      {!showArchived && !canCreateGroup && !searchActive && canCreateGroups ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))] px-4 py-3.5">
          <p className="text-[13.5px] font-medium text-[var(--color-foreground)]">
            Une session nécessite un modèle
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            Commencez par créer un modèle de formulaire. Vous pourrez ensuite créer des
            sessions pour vos différents participants.
          </p>
          <Link
            href="/dashboard/waivers/new"
            className="mt-3 inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-[12.5px] font-medium tracking-[-0.01em] text-[var(--color-on-brand)] transition-[transform,filter] duration-[150ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Créer un modèle
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
                  ? "Aucune session trouvée"
                  : showArchived
                    ? "Aucune session archivée"
                    : "Aucune session pour l’instant"}
              </p>
              {!searchActive ? (
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {showArchived
                    ? "Les sessions archivées apparaissent ici. Vous pourrez les désarchiver à tout moment."
                    : "Une session regroupe plusieurs participants qui signent le même formulaire (ex : cours, événement, sortie scolaire)."}
                </p>
              ) : null}
            </div>
            {!showArchived && !searchActive && canCreateGroups && canCreateGroup ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={`inline-flex min-h-11 items-center rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] ${primaryBtn}`}
              >
                Créer ma première session
              </button>
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

                return (
                  <motion.li
                    key={g.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: LIST_EASE,
                    }}
                    className={`relative z-0 rounded-[1.2rem] hover:z-10 ${groupCard} ${cardHover}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[var(--color-brand)]"
                    />

                    <div className="flex flex-col gap-3 px-4 py-4 pl-[1.2rem] sm:gap-2.5 sm:px-4 sm:py-3.5 sm:pl-[1.15rem]">
                      <div className="flex items-start gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-surface))] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_24%,transparent)]">
                            <GroupIcon size={17} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-tight text-[var(--color-foreground)] sm:truncate sm:text-[15px] sm:leading-normal">
                                {/* Stretched link — same pattern as the form cards. */}
                                <Link
                                  href={`/dashboard/groupes/${g.id}`}
                                  className="outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
                                >
                                  {g.name}
                                </Link>
                              </h3>
                              {/* "Ouverte" n'apprenait rien : dans une liste de
                                  sessions, tout est ouvert. Ce qui compte est
                                  l'avancement, porté plus bas. Seuls les états
                                  qui sortent de l'ordinaire restent ici. */}
                              {showArchived || closed ? (
                                <StatusBadge
                                  status={showArchived ? "archived" : "inactive"}
                                  className="shrink-0"
                                />
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-[12.5px] font-medium text-[var(--color-foreground)]/75 sm:mt-0.5">
                              {formatSchedule(g.scheduled_at) ?? g.template_title}
                            </p>
                            {formatSchedule(g.scheduled_at) ? (
                              <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-muted)]">
                                {g.template_title}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Above the stretched link so it stays clickable. */}
                        <div className="relative z-20 flex shrink-0 items-center gap-0.5 pt-0.5">
                          <GroupActionsMenu
                            id={g.id}
                            name={g.name}
                            publicUrl={publicUrl}
                            archived={showArchived}
                            canArchive={canManageGroups}
                          />
                        </div>
                      </div>

                      {/* Progress well — collective tracking signal */}
                      <Link
                        href={`/dashboard/groupes/${g.id}`}
                        className="block rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-3 py-2.5 ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] transition-[background-color,ring-color] duration-[150ms] hover:bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
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
              label="sessions"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NewSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        choices={templateChoices}
      />
    </section>
  );
}
