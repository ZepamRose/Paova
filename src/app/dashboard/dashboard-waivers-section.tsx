"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StatusBadge } from "@/components/status-badge";
import {
  formatLastSignedMeta,
  pickWaiverMetaContext,
} from "@/lib/dashboard/context-hint";
import type { DashboardListView } from "@/lib/dashboard/types";
import {
  configFromTemplateRow,
  effectiveTemplateStatus,
  isTemplateStatus,
  isWithinSignatureHours,
  type TemplateStatus,
} from "@/lib/templates";
import { CopyLinkButton } from "./copy-link-button";
import {
  DASHBOARD_PAGE_SIZE,
  DashboardListPagination,
} from "./dashboard-list-pagination";
import { WaiverActionsMenu } from "./waiver-actions-menu";
import { ToggleStatusForm } from "./toggle-status-form";

export type DashboardWaiverRow = {
  id: string;
  title: string;
  public_slug: string;
  status: string;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  version?: number | null;
  signature_hours_enabled?: boolean | null;
  signature_timezone?: string | null;
  signature_hours_start?: string | null;
  signature_hours_end?: string | null;
  signature_hours_days?: number[] | null;
};

const LIST_EASE = [0.22, 1, 0.36, 1] as const;
const motionCls = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

function MetaSep() {
  return (
    <span aria-hidden className="mx-1.5 text-[var(--color-muted)]/35">
      ·
    </span>
  );
}

function formatRelativeFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusForRow(
  row: DashboardWaiverRow,
  archivedView: boolean,
): TemplateStatus {
  if (archivedView) return "archived";
  if (!isTemplateStatus(row.status)) return "inactive";
  return effectiveTemplateStatus({
    status: row.status,
    expires_at: row.expires_at,
  });
}

export function DashboardWaiversSection({
  active,
  archived,
  listView,
  appUrl,
  signatureCountByTemplate,
  lastSignedByTemplate,
  searchActive = false,
}: {
  active: DashboardWaiverRow[];
  archived: DashboardWaiverRow[];
  listView: DashboardListView;
  appUrl: string;
  signatureCountByTemplate: Record<string, number>;
  lastSignedByTemplate: Record<string, string>;
  searchActive?: boolean;
}) {
  const [nowReady, setNowReady] = useState(false);
  const [page, setPage] = useState(1);
  const reduced = useReducedMotion() ?? false;
  const showArchived = listView === "archived";
  const rows = showArchived ? archived : active;
  const totalPages = Math.max(1, Math.ceil(rows.length / DASHBOARD_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * DASHBOARD_PAGE_SIZE;
    return rows.slice(start, start + DASHBOARD_PAGE_SIZE);
  }, [rows, safePage]);

  useEffect(() => {
    setNowReady(true);
  }, []);

  const rowIds = rows.map((r) => r.id).join("|");

  // Reset when switching active/archived or when the filtered set changes (search).
  useEffect(() => {
    setPage(1);
  }, [listView, searchActive, rowIds]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const waiverCard =
    "border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)] ring-1 ring-black/[0.02] dark:ring-white/[0.04]";
  const cardHover = `transition-[transform,box-shadow,border-color,background-color] ${motionCls} hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] hover:shadow-[var(--elev-hover)]`;
  const primaryBtn = `shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,box-shadow,filter] ${motionCls} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985]`;
  /** Quiet utilities on the card (copy, overflow). */
  const quietAction = `inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,background-color,transform] ${motionCls} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;
  /** Primary card action — open the waiver. */
  const viewAction = `inline-flex h-8 items-center rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,box-shadow,color] ${motionCls} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] hover:shadow-[var(--elev-2)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;
  const restoreBtn = `inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-[13px] font-medium text-[var(--color-on-brand)] ${primaryBtn}`;

  return (
    <section
      className="flex flex-col gap-4 sm:gap-5"
      aria-labelledby="dashboard-waivers-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center text-[var(--color-muted)]"
              aria-hidden
            >
              <FileText size={14} strokeWidth={1.85} />
            </span>
            <h2
              id="dashboard-waivers-heading"
              className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.1rem]"
            >
              Vos décharges
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
                ? "Consultez et restaurez vos formulaires archivés."
                : "Ouvrez, partagez et suivez vos formulaires de signature."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showArchived && rows.length > 0 && !searchActive ? (
          <motion.div
            key="archived-info"
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: LIST_EASE }}
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_48%,var(--color-surface))] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-muted)]"
          >
            Ces décharges n&apos;acceptent plus de signatures. Restaurez-en une
            pour la remettre en ligne.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {rows.length === 0 ? (
          <motion.div
            key={`empty-waivers-${listView}-${searchActive}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: LIST_EASE }}
            className={`flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-6 text-center ${
              searchActive ? "py-8" : "py-10 sm:px-10 sm:py-11"
            }`}
          >
            {!searchActive ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
                <FileText size={22} strokeWidth={1.6} aria-hidden />
              </div>
            ) : null}
            <div className="flex max-w-sm flex-col gap-1.5">
              <p className="text-[15px] font-semibold tracking-tight">
                {searchActive
                  ? "Aucune décharge trouvée"
                  : showArchived
                    ? "Aucune décharge archivée"
                    : "Aucune décharge pour l'instant"}
              </p>
              {!searchActive ? (
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {showArchived
                    ? "Les décharges archivées apparaissent ici. Vous pourrez les restaurer à tout moment."
                    : "Créez votre première décharge en quelques secondes à partir d'un modèle prêt à l'emploi."}
                </p>
              ) : null}
            </div>
            {!showArchived && !searchActive ? (
              <Link
                href="/onboarding/premiere-decharge"
                className={`inline-flex min-h-10 items-center rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] ${primaryBtn}`}
              >
                Créer ma première décharge
              </Link>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key={`list-waivers-${listView}`}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: LIST_EASE }}
            className="flex flex-col gap-2"
          >
            <ul className="flex flex-col gap-2">
              {visibleRows.map((t) => {
                const publicUrl = `${appUrl}/w/${t.public_slug}`;
                const count = signatureCountByTemplate[t.id] ?? 0;
                const lastSignedIso = lastSignedByTemplate[t.id];
                const lastSignedLabel = formatLastSignedMeta(lastSignedIso, {
                  ready: nowReady,
                  formatRelative: formatRelativeFr,
                  formatShort: formatShortDate,
                });
                const created = formatShortDate(t.created_at);
                const archivedAt = t.deleted_at
                  ? formatLongDate(t.deleted_at)
                  : null;
                const rowStatus = statusForRow(t, showArchived);
                const hoursConfig = configFromTemplateRow(t);
                const outsideHours =
                  nowReady &&
                  !showArchived &&
                  rowStatus === "open" &&
                  hoursConfig.enabled &&
                  !isWithinSignatureHours(hoursConfig);
                const version = t.version ?? 1;
                const metaContext = nowReady
                  ? pickWaiverMetaContext(t, {
                      archivedView: showArchived,
                      lastSignedAt: lastSignedIso,
                      outsideHours,
                    })
                  : null;

                // One dense meta line: activity · context · last signed.
                const metaParts: string[] = [];
                if (showArchived) {
                  metaParts.push(
                    count === 0
                      ? "Aucune signature"
                      : `${count} signature${count > 1 ? "s" : ""}`,
                  );
                  if (archivedAt) metaParts.push(`Archivée le ${archivedAt}`);
                  metaParts.push(lastSignedLabel);
                } else {
                  metaParts.push(
                    count === 0
                      ? "Aucune signature"
                      : `${count} signature${count > 1 ? "s" : ""}`,
                  );
                  metaParts.push(metaContext ?? `Créée ${created}`);
                  if (
                    outsideHours &&
                    metaContext !== "Hors horaires — lien fermé"
                  ) {
                    metaParts.push("Hors horaires");
                  }
                  metaParts.push(lastSignedLabel);
                }

                return (
                  <motion.li
                    key={t.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: LIST_EASE,
                    }}
                    className={`relative z-0 rounded-[1.05rem] px-3.5 py-2.5 hover:z-10 has-[[aria-expanded=true]]:z-30 sm:px-3.5 sm:py-2.5 ${waiverCard} ${cardHover}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)]/65"
                        aria-hidden
                      >
                        <FileText size={14} strokeWidth={1.75} />
                      </span>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="min-w-0 truncate text-[14.5px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[15px]">
                            {t.title}
                          </h3>
                          {!showArchived ? (
                            <StatusBadge
                              status={rowStatus}
                              className="shrink-0"
                            />
                          ) : null}
                          <span
                            className="shrink-0 text-[10px] font-normal tabular-nums tracking-tight text-[var(--color-muted)]/32"
                            aria-label={`Version ${version}`}
                          >
                            v{version}
                          </span>
                        </div>

                        <p className="truncate text-[12px] leading-snug text-[var(--color-muted)]">
                          {metaParts.map((part, i) => (
                            <span
                              key={`${part}-${i}`}
                              className={
                                i === 0 && count > 0
                                  ? "font-medium tabular-nums text-[var(--color-brand)]"
                                  : undefined
                              }
                            >
                              {i > 0 ? <MetaSep /> : null}
                              {part}
                            </span>
                          ))}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {showArchived ? (
                          <>
                            <ToggleStatusForm
                              id={t.id}
                              label="Restaurer"
                              pendingLabel="Restauration…"
                              returnTo="dashboard"
                              className={restoreBtn}
                            />
                            <Link
                              href={`/dashboard/waivers/${t.id}`}
                              className={viewAction}
                            >
                              Voir
                            </Link>
                          </>
                        ) : (
                          <>
                            <CopyLinkButton
                              url={publicUrl}
                              variant="icon"
                              size="sm"
                            />
                            <Link
                              href={`/dashboard/waivers/${t.id}`}
                              className={viewAction}
                            >
                              Voir
                            </Link>
                            <WaiverActionsMenu
                              id={t.id}
                              title={t.title}
                              submissionCount={count}
                            />
                          </>
                        )}
                      </div>
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
              label="décharges"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
