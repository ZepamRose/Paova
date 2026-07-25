"use client";

import { useState } from "react";
import { GitBranch, ChevronDown } from "lucide-react";
import { daysSince } from "@/lib/audit";
import { ScrollablePanel } from "./scrollable-panel";

type VersionItem = {
  id: string;
  version: number;
  title: string;
  legal_text: string;
  fields: unknown;
  signer_name_label: string | null;
  created_at: string;
  signature_count: number;
  is_current: boolean;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fieldCount(fields: unknown): number {
  return Array.isArray(fields) ? fields.length : 0;
}

function fieldKeys(fields: unknown): string[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((f) =>
      f && typeof f === "object" && "key" in f
        ? String((f as { key: unknown }).key)
        : "",
    )
    .filter(Boolean)
    .sort();
}

function summarizeChanges(
  current: VersionItem,
  previous: VersionItem | null,
): string {
  if (!previous) {
    return "Version initiale — point de départ de cette décharge.";
  }

  const parts: string[] = [];
  if (current.title !== previous.title) {
    parts.push("titre modifié");
  }
  if (current.legal_text !== previous.legal_text) {
    parts.push("texte juridique mis à jour");
  }
  if (current.signer_name_label !== previous.signer_name_label) {
    parts.push("libellé du nom modifié");
  }

  const currKeys = fieldKeys(current.fields);
  const prevKeys = fieldKeys(previous.fields);
  const currCount = fieldCount(current.fields);
  const prevCount = fieldCount(previous.fields);
  if (currCount !== prevCount) {
    const delta = currCount - prevCount;
    parts.push(
      delta > 0
        ? `${delta} champ${delta === 1 ? "" : "s"} ajouté${delta === 1 ? "" : "s"}`
        : `${Math.abs(delta)} champ${Math.abs(delta) === 1 ? "" : "s"} retiré${Math.abs(delta) === 1 ? "" : "s"}`,
    );
  } else if (currKeys.join("|") !== prevKeys.join("|")) {
    parts.push("champs ajustés");
  }

  if (parts.length === 0) {
    return "Contenu republé sans changement majeur détecté.";
  }
  return parts.join(" · ").replace(/^./, (c) => c.toUpperCase()) + ".";
}

function VersionRow({
  item,
  previous,
}: {
  item: VersionItem;
  previous: VersionItem | null;
}) {
  const [open, setOpen] = useState(item.is_current);
  const nFields = fieldCount(item.fields);
  const summary = summarizeChanges(item, previous);
  const activeDays = item.is_current ? daysSince(item.created_at) : null;

  return (
    <li
      className={`rounded-2xl border bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] shadow-[var(--elev-1)] ${
        item.is_current
          ? "border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))]"
          : "border-[color-mix(in_srgb,var(--color-border)_65%,transparent)]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3.5 px-3.5 py-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-surface-2))] sm:px-4"
        aria-expanded={open}
      >
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-semibold tabular-nums ${
            item.is_current
              ? "bg-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-surface))] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-surface))] text-[var(--color-muted)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border)_55%,transparent)]"
          }`}
          aria-hidden
        >
          <GitBranch size={14} strokeWidth={1.85} className="mb-0.5 opacity-80" />
          v{item.version}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              Version {item.version}
            </span>
            {item.is_current ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-surface-2)_75%,var(--color-surface))] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_70%,transparent)]">
                Archivée
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            {summary}
          </p>
          <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
            {formatDateTime(item.created_at)}
            {" · "}
            <span className="font-medium text-[var(--color-foreground)]/80">
              {item.signature_count} signature
              {item.signature_count === 1 ? "" : "s"}
            </span>
            {" · "}
            {nFields} champ{nFields === 1 ? "" : "s"}
            {activeDays !== null ? (
              <>
                {" · "}
                active depuis {activeDays === 0 ? "aujourd'hui" : `${activeDays} j`}
              </>
            ) : null}
          </p>
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.85}
          className={`mt-2.5 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3.5 py-4 sm:px-4">
          <p className="mb-1 text-[13px] font-medium tracking-tight">
            {item.title}
          </p>
          {item.signer_name_label ? (
            <p className="mb-3 text-[12px] text-[var(--color-muted)]">
              Libellé du nom :{" "}
              <span className="text-[var(--color-foreground)]">
                {item.signer_name_label}
              </span>
            </p>
          ) : null}
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Texte juridique figé
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface-2))] px-4 py-3">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-foreground)]/85">
              {item.legal_text}
            </p>
          </div>
          <p className="mt-3 text-[12px] text-[var(--color-muted)]">
            Les signatures liées à cette version restent attachées à ce contenu
            exact.
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function VersionHistory({ versions }: { versions: VersionItem[] }) {
  if (versions.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-background))] px-5 py-8 text-center">
        <p className="text-sm font-medium tracking-tight">Aucune version</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-muted)]">
          Une nouvelle version apparaîtra dès que vous modifiez le texte
          juridique.
        </p>
      </div>
    );
  }

  // versions are newest-first from the page query
  return (
    <ScrollablePanel className="mt-6">
      <ul className="flex flex-col gap-2.5 pr-1">
        {versions.map((item, index) => (
          <VersionRow
            key={item.id}
            item={item}
            previous={versions[index + 1] ?? null}
          />
        ))}
      </ul>
    </ScrollablePanel>
  );
}
