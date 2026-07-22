"use client";

import { useState } from "react";
import { GitBranch, ChevronDown } from "lucide-react";

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

function VersionRow({ item }: { item: VersionItem }) {
  const [open, setOpen] = useState(false);
  const nFields = fieldCount(item.fields);

  return (
    <li className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] shadow-[var(--elev-1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3.5 px-3.5 py-3.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-surface-2))] sm:px-4"
        aria-expanded={open}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            item.is_current
              ? "bg-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-surface))] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-surface))] text-[var(--color-muted)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border)_55%,transparent)]"
          }`}
          aria-hidden
        >
          <GitBranch size={15} strokeWidth={1.85} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
              Version {item.version}
            </span>
            {item.is_current ? (
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                Actuelle
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-[13px] text-[var(--color-foreground)]/85">
            {item.title}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
            {formatDateTime(item.created_at)}
            {" · "}
            {item.signature_count} signature
            {item.signature_count === 1 ? "" : "s"}
            {" · "}
            {nFields} champ{nFields === 1 ? "" : "s"}
          </p>
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.85}
          className={`mt-2 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3.5 py-4 sm:px-4">
          {item.signer_name_label ? (
            <p className="mb-3 text-[12px] text-[var(--color-muted)]">
              Libellé du nom :{" "}
              <span className="text-[var(--color-foreground)]">
                {item.signer_name_label}
              </span>
            </p>
          ) : null}
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Texte juridique
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface-2))] px-4 py-3">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-foreground)]/85">
              {item.legal_text}
            </p>
          </div>
          <p className="mt-3 text-[12px] text-[var(--color-muted)]">
            Contenu figé — les signatures de cette version restent liées à ce
            texte exact.
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function VersionHistory({ versions }: { versions: VersionItem[] }) {
  if (versions.length === 0) {
    return (
      <p className="mt-5 text-[13px] leading-relaxed text-[var(--color-muted)]">
        Aucune version enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ul className="mt-6 flex flex-col gap-2.5">
      {versions.map((item) => (
        <VersionRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
