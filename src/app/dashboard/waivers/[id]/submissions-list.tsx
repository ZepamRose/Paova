"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatRelativeActivityFr } from "@/lib/audit";
import { useLiveSubmissionsRefresh } from "@/lib/use-live-submissions-refresh";
import {
  formatSubjectsColumnLabel,
  type DisplayField,
} from "@/lib/submissions";
import { PdfDownloadButton } from "../../pdf-download-button";
import { SubmissionDetailDialog } from "../../submission-detail-dialog";
import { GroupIcon } from "@/components/groups/group-icon";
import { ScrollablePanel } from "./scrollable-panel";

type Submission = {
  id: string;
  signer_name: string;
  signer_email: string | null;
  signed_at: string;
  subjectsSummary: string | null;
  subjectsLabel: string | null;
  subjectsSearch: string;
  answers: Record<string, unknown>;
};

type GroupOption = { id: string; name: string };

export type SignaturesEmptyContext = {
  createdAt: string;
  publicUrl: string;
  lastLinkViewedAt: string | null;
  linkViewCount: number;
};

function formatCreated(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubmissionsList({
  templateId,
  fields,
  submissions,
  groups = [],
  emptyContext,
  canErase = false,
  page = 1,
  totalCount,
  pageSize = 40,
}: {
  templateId: string;
  fields: DisplayField[];
  submissions: Submission[];
  groups?: GroupOption[];
  emptyContext?: SignaturesEmptyContext;
  /** Owner/admin only — GDPR erasure. */
  canErase?: boolean;
  page?: number;
  totalCount?: number;
  pageSize?: number;
}) {
  const groupById = useMemo(
    () => new Map(groups.map((g) => [g.id, g])),
    [groups],
  );
  // Live refresh only on page 1 — older pages would jump when new rows arrive.
  useLiveSubmissionsRefresh({
    templateId,
    enabled: page === 1,
  });

  const [query, setQuery] = useState("");
  const hasAnySubjects = submissions.some((s) => Boolean(s.subjectsSummary));
  const total = totalCount ?? submissions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const subjectsColumnLabel = useMemo(() => {
    const labels = submissions
      .map((s) => s.subjectsLabel)
      .filter((label): label is string => Boolean(label));
    if (labels.length === 0) return null;
    const allMinors = labels.every(
      (label) => label === "Enfant" || label === "Enfants",
    );
    const allParticipants = labels.every(
      (label) => label === "Participant" || label === "Participants",
    );
    if (allMinors) return formatSubjectsColumnLabel("minors");
    if (allParticipants) return formatSubjectsColumnLabel("participants");
    return formatSubjectsColumnLabel("mixed");
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const name = s.signer_name?.toLowerCase() ?? "";
      const email = s.signer_email?.toLowerCase() ?? "";
      return (
        name.includes(q) ||
        email.includes(q) ||
        s.subjectsSearch.includes(q)
      );
    });
  }, [query, submissions]);

  if (submissions.length === 0 && total === 0) {
    const lastShare = formatRelativeActivityFr(
      emptyContext?.lastLinkViewedAt ?? null,
    );

    return (
      <div className="flex flex-col gap-5 rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-5 py-8 sm:px-6">
        <div className="text-center sm:text-left">
          <p className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Prête à recevoir des signatures
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
            Testez le parcours une fois, puis partagez le lien ou le QR.
          </p>
        </div>

        {emptyContext ? (
          <ul className="grid gap-2 text-[12.5px] text-[var(--color-muted)] sm:grid-cols-2">
            <li className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)]/80 px-3.5 py-2.5">
              En ligne depuis le{" "}
              <span className="font-medium text-[var(--color-foreground)]/85">
                {formatCreated(emptyContext.createdAt)}
              </span>
            </li>
            <li className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)]/80 px-3.5 py-2.5">
              {emptyContext.linkViewCount > 0 ? (
                <>
                  Lien ouvert{" "}
                  <span className="font-medium text-[var(--color-foreground)]/85">
                    {emptyContext.linkViewCount}×
                  </span>
                  {lastShare ? ` · ${lastShare}` : ""}
                </>
              ) : (
                "Lien pas encore ouvert"
              )}
            </li>
          </ul>
        ) : null}

        {emptyContext ? (
          <div>
            <a
              href={emptyContext.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3.5 text-sm font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
            >
              <ExternalLink size={15} strokeWidth={1.85} aria-hidden />
              Tester le parcours
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  const pageHref = (p: number) =>
    `/dashboard/waivers/${templateId}?tab=signatures&page=${p}`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]/65"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            hasAnySubjects
              ? "Rechercher par signataire, enfant ou email…"
              : "Rechercher par nom ou email…"
          }
          className="min-h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_88%,var(--color-surface-2))] py-2.5 pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/55 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-6 py-8 text-center text-sm text-[var(--color-muted)]">
          Aucun résultat pour «&nbsp;{query}&nbsp;».
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] shadow-[var(--elev-2)]">
          <ScrollablePanel>
            <div
              className={`sticky top-0 z-10 hidden items-center gap-4 border-b border-[color-mix(in_srgb,var(--color-border)_65%,var(--color-foreground))] bg-[var(--color-surface-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] sm:grid ${
                hasAnySubjects
                  ? "grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_7.25rem_9.75rem]"
                  : "grid-cols-[minmax(0,1fr)_7.25rem_9.75rem]"
              }`}
            >
              <span>Signataire</span>
              {hasAnySubjects ? (
                <span>{subjectsColumnLabel ?? "Personnes concernées"}</span>
              ) : null}
              <span>Date</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-[color-mix(in_srgb,var(--color-border)_58%,transparent)] bg-[var(--color-surface)]">
            {filtered.map((s) => {
              const pdfHref = `/dashboard/waivers/${templateId}/submissions/${s.id}/pdf`;
              const signedAt = new Date(s.signed_at);
              const datePart = signedAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const timePart = signedAt.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const dateLabel = `${datePart} · ${timePart}`;
              const groupId =
                typeof s.answers.__group_id === "string"
                  ? s.answers.__group_id
                  : null;
              const group = groupId ? groupById.get(groupId) : null;

              return (
                <li
                  key={s.id}
                  className={`group grid grid-cols-1 items-center gap-3 px-3.5 py-3.5 transition-[background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--color-surface-2)]/55 sm:gap-4 sm:px-4 sm:py-3.5 ${
                    hasAnySubjects
                      ? "sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_7.25rem_9.75rem]"
                      : "sm:grid-cols-[minmax(0,1fr)_7.25rem_9.75rem]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface))] text-[12px] font-semibold text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
                      aria-hidden
                    >
                      {(s.signer_name?.trim()?.charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                          {s.signer_name}
                        </p>
                        {group ? (
                          <span
                            title={`Signé via la session « ${group.name} »`}
                            className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] px-1.5 py-[1px] text-[10px] font-medium text-[color-mix(in_srgb,var(--color-brand)_75%,var(--color-foreground))]"
                          >
                            <GroupIcon size={10} />
                            <span className="max-w-[8rem] truncate">
                              {group.name}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[12.5px] text-[var(--color-muted)]">
                        {s.signer_email || "Sans email"}
                      </p>
                      {s.subjectsSummary ? (
                        <p className="mt-1.5 rounded-lg bg-[var(--color-surface-2)] px-2 py-1 text-[13px] font-medium leading-snug text-[var(--color-foreground)] sm:hidden">
                          <span className="mr-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                            {s.subjectsLabel ?? "Concernés"}
                          </span>
                          {s.subjectsSummary}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[12px] tabular-nums text-[var(--color-muted)] sm:hidden">
                        {dateLabel}
                      </p>
                    </div>
                  </div>

                  {hasAnySubjects ? (
                    <div className="hidden min-w-0 sm:block">
                      {s.subjectsSummary ? (
                        <div className="rounded-lg bg-[var(--color-surface-2)]/80 px-2.5 py-1.5">
                          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                            {s.subjectsLabel}
                          </p>
                          <p className="mt-0.5 text-[13.5px] font-medium leading-snug tracking-tight text-[var(--color-foreground)]">
                            {s.subjectsSummary}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[var(--color-muted)]">—</p>
                      )}
                    </div>
                  ) : null}

                  <div
                    className="hidden min-w-0 flex-col justify-center sm:flex"
                    title={dateLabel}
                  >
                    <p className="truncate text-[13px] font-medium tabular-nums leading-snug text-[var(--color-foreground)]/78">
                      {datePart}
                    </p>
                    <p className="truncate text-[12px] tabular-nums leading-snug text-[var(--color-muted)]">
                      {timePart}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap">
                    <SubmissionDetailDialog
                      submission={{
                        id: s.id,
                        templateId,
                        signerName: s.signer_name,
                        signerEmail: s.signer_email,
                        signedAt: s.signed_at,
                        fields,
                        answers: s.answers,
                      }}
                      canErase={canErase}
                      eraseReturnTo="waiver"
                    />
                    <PdfDownloadButton href={pdfHref} variant="quiet" />
                  </div>
                </li>
              );
            })}
            </ul>
          </ScrollablePanel>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination des signatures"
          className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px] text-[var(--color-muted)]"
        >
          <p>
            Page {page} / {totalPages}
            <span className="text-[var(--color-muted)]/70">
              {" "}
              · {total} signature{total === 1 ? "" : "s"}
            </span>
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-foreground)]/85 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                Précédent
              </Link>
            ) : (
              <span className="rounded-lg px-3 py-1.5 opacity-40">Précédent</span>
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-foreground)]/85 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                Suivant
              </Link>
            ) : (
              <span className="rounded-lg px-3 py-1.5 opacity-40">Suivant</span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
