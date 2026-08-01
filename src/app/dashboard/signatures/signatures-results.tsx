"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { FileText, Info } from "lucide-react";
import type { DisplayField } from "@/lib/submissions";
import { GroupIcon } from "@/components/groups/group-icon";
import { PdfDownloadButton } from "../pdf-download-button";
import { SubmissionDetailDialog } from "../submission-detail-dialog";

export type SignatureGroupOption = { id: string; name: string };

export type SignatureResultRow = {
  submissionId: string;
  templateId: string;
  signerName: string;
  signerEmail: string | null;
  phone: string | null;
  signedAt: string;
  templateTitle: string;
  proofReference: string | null;
  templateVersion: number | null;
  subjectsSummary: string | null;
  subjectsLabel: string | null;
  fields: DisplayField[];
  answers: Record<string, unknown>;
};

const AVATAR_TONES = [
  { hue: "#2e7d6b" },
  { hue: "#4f7cac" },
  { hue: "#8b6b4a" },
  { hue: "#6b5b95" },
  { hue: "#b06a5a" },
  { hue: "#3f8a8a" },
  { hue: "#7a6a3e" },
  { hue: "#5a6e8a" },
] as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function avatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = AVATAR_TONES[hash % AVATAR_TONES.length]!.hue;
  return {
    bg: `color-mix(in srgb, ${hue} 16%, var(--color-surface-2))`,
    fg: `color-mix(in srgb, ${hue} 72%, var(--color-foreground))`,
    ring: `color-mix(in srgb, ${hue} 20%, transparent)`,
  };
}

function SignatureCard({
  row,
  groups,
  canErase,
}: {
  row: SignatureResultRow;
  groups: SignatureGroupOption[];
  canErase: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pdfHref = `/dashboard/waivers/${row.templateId}/submissions/${row.submissionId}/pdf`;
  const tone = avatarTone(row.signerName);
  const groupId =
    typeof row.answers?.__group_id === "string"
      ? (row.answers.__group_id as string)
      : null;
  const group = groupId ? groups.find((g) => g.id === groupId) ?? null : null;
  const submission = {
    id: row.submissionId,
    templateId: row.templateId,
    signerName: row.signerName,
    signerEmail: row.signerEmail,
    signedAt: row.signedAt,
    fields: row.fields,
    answers: row.answers,
    proofReference: row.proofReference,
    templateTitle: row.templateTitle,
  };

  function openDetails() {
    setOpen(true);
  }

  function onCardClick(event: MouseEvent<HTMLLIElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-card-actions]")) return;
    openDetails();
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      aria-label={`Ouvrir les détails de ${row.signerName}`}
      className="group relative cursor-pointer overflow-hidden rounded-[11px] border border-[color-mix(in_srgb,var(--color-border)_36%,var(--color-foreground))] bg-gradient-to-b from-[var(--color-surface)] to-[color-mix(in_srgb,var(--color-surface-2)_30%,var(--color-surface))] px-3 py-[7px] shadow-[0_1px_2px_rgba(15,23,42,0.07),0_1px_3px_-1px_rgba(15,23,42,0.07),0_1px_0_color-mix(in_srgb,var(--color-foreground)_5%,transparent)_inset] transition-[border-color,box-shadow,transform,background-color] duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_20%,var(--color-muted))] hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.14),0_1px_2px_rgba(15,23,42,0.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] sm:px-3.5"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] to-transparent"
        aria-hidden
      />
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-semibold tracking-[0.04em] transition-transform duration-[180ms] group-hover:scale-[1.03]"
          style={{
            backgroundColor: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
          aria-hidden
        >
          {initialsFromName(row.signerName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <p className="truncate text-[13.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
              {row.signerName}
            </p>
            {group ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] px-1.5 py-[1px] text-[10px] font-medium text-[color-mix(in_srgb,var(--color-brand)_75%,var(--color-foreground))]"
                title={`Fait partie de la session « ${group.name} »`}
              >
                <GroupIcon size={10} />
                <span className="max-w-[8rem] truncate">{group.name}</span>
              </span>
            ) : null}
            <p
              className="text-[11px] tabular-nums text-[var(--color-muted)]"
              title={formatDateTime(row.signedAt)}
            >
              {formatRelativeTime(row.signedAt)}
            </p>
          </div>

          {row.subjectsSummary ? (
            <p className="mt-0.5 truncate text-[12.5px] font-medium leading-snug text-[var(--color-foreground)]/90">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-muted)]">
                {row.subjectsLabel ?? "Concernés"}
              </span>
              {row.subjectsSummary}
            </p>
          ) : null}

          {row.signerEmail || row.phone ? (
            <p className="mt-0.5 truncate text-[12px] leading-snug">
              {row.signerEmail ? (
                <span className="text-[var(--color-muted)]">
                  {row.signerEmail}
                </span>
              ) : null}
              {row.signerEmail && row.phone ? (
                <span className="text-[var(--color-border)]"> · </span>
              ) : null}
              {row.phone ? (
                <span className="font-medium tabular-nums text-[var(--color-foreground)]/78">
                  {row.phone}
                </span>
              ) : null}
            </p>
          ) : !row.subjectsSummary ? (
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]/80">
              Sans email
            </p>
          ) : null}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[11px]">
            <span className="truncate font-medium text-[var(--color-muted)]">
              {row.templateTitle}
            </span>
            {row.proofReference || row.templateVersion != null ? (
              <span
                tabIndex={0}
                title={[
                  row.proofReference ? `Référence ${row.proofReference}` : null,
                  row.templateVersion != null
                    ? `Version ${row.templateVersion}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-[var(--color-muted)]/60 outline-none transition-colors hover:text-[var(--color-muted)] focus-visible:text-[var(--color-muted)]"
                aria-label="Référence et version de la décharge"
              >
                <Info size={11} strokeWidth={1.9} />
              </span>
            ) : null}
          </div>
        </div>

        <div
          data-card-actions
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Link
            href={`/dashboard/waivers/${row.templateId}`}
            title={`Voir la décharge « ${row.templateTitle} »`}
            aria-label={`Voir la décharge ${row.templateTitle}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] transition-[color,background-color] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <FileText size={15} strokeWidth={1.9} />
          </Link>
          <SubmissionDetailDialog
            open={open}
            onOpenChange={setOpen}
            triggerClassName="inline-flex h-7 items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] px-2.5 text-[12px] font-medium text-[var(--color-foreground)]/82 shadow-[var(--elev-1)] transition-[transform,background-color,box-shadow,border-color] duration-150 hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0"
            submission={submission}
            canErase={canErase}
            eraseReturnTo="signatures"
          />
          <PdfDownloadButton
            href={pdfHref}
            label=""
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] transition-[color,background-color,opacity] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:pointer-events-none disabled:opacity-70 [&_svg]:h-4 [&_svg]:w-4"
          />
        </div>
      </div>
    </li>
  );
}

export function SignaturesResults({
  rows,
  groups = [],
  canErase = false,
}: {
  rows: SignatureResultRow[];
  groups?: SignatureGroupOption[];
  /** Owner/admin only — GDPR erasure. */
  canErase?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <SignatureCard
          key={row.submissionId}
          row={row}
          groups={groups}
          canErase={canErase}
        />
      ))}
    </ul>
  );
}
