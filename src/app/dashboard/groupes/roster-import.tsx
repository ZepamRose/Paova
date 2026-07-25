"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileUp, Download, TriangleAlert } from "lucide-react";
import {
  downloadRosterCsvTemplate,
  parseRosterCsvDetailed,
  rosterColumnsHint,
  rosterPastePlaceholder,
  type RosterMode,
} from "@/lib/groups";

/**
 * Premium roster import: drag & drop + file picker + optional paste.
 * Writes CSV text into a hidden `roster` field for server actions.
 */
export function RosterImport({
  name = "roster",
  reassure = true,
  mode = "participants",
  onCountChange,
}: {
  name?: string;
  reassure?: boolean;
  mode?: RosterMode;
  onCountChange?: (count: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const { members: parsed, skippedRows, unrecognizedColumns } =
    parseRosterCsvDetailed(raw);
  const count = parsed.length;

  useEffect(() => {
    onCountChange?.(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  function applyText(text: string, label?: string | null) {
    setRaw(text);
    setFileName(label ?? null);
  }

  async function readFile(file: File) {
    const text = await file.text();
    applyText(text, file.name);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={raw} />

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        className={`relative rounded-xl border border-dashed px-4 py-7 text-center transition-[border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          dragging
            ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] shadow-[var(--elev-1)]"
            : "border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))] hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))]"
        }`}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--elev-1)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_60%,transparent)]">
          <FileUp size={18} strokeWidth={1.85} aria-hidden />
        </div>
        <p className="mt-3 text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
          {fileName
            ? fileName
            : dragging
              ? "Déposez le fichier…"
              : "Glissez un fichier CSV ici"}
        </p>
        <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
          {count > 0
            ? `${count} participant${count > 1 ? "s" : ""} détecté${count > 1 ? "s" : ""}`
            : "Ou importez depuis votre ordinateur"}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3.5 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.96]"
          >
            Importer un CSV
          </button>
          <button
            type="button"
            onClick={() => {
              downloadRosterCsvTemplate(mode);
              setJustDownloaded(true);
              window.setTimeout(() => setJustDownloaded(false), 1600);
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-medium shadow-[var(--elev-1)] transition-[transform,background-color,border-color,color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.96] ${
              justDownloaded
                ? "border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] text-[var(--color-brand)]"
                : "border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:-translate-y-px hover:bg-[var(--color-surface-2)]"
            }`}
          >
            {justDownloaded ? (
              <Check size={14} strokeWidth={2.2} aria-hidden />
            ) : (
              <Download size={14} strokeWidth={1.85} aria-hidden />
            )}
            {justDownloaded ? "Téléchargé" : "Télécharger un modèle"}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
        {rosterColumnsHint(mode)}
      </p>

      {unrecognizedColumns ? (
        <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5">
          <TriangleAlert
            size={14}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-[color-mix(in_srgb,#92400e_85%,var(--color-muted))]"
            aria-hidden
          />
          <p className="text-[12.5px] leading-relaxed text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
            Aucune colonne reconnue (Nom, Email, Date de naissance…) : seule la
            première colonne a été lue comme nom complet, le reste a été
            ignoré. Ajoutez une ligne d&apos;en-tête pour importer aussi les
            emails.
          </p>
        </div>
      ) : null}

      {!unrecognizedColumns && skippedRows > 0 ? (
        <p className="text-[12px] leading-relaxed text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
          {skippedRows} ligne{skippedRows > 1 ? "s" : ""} ignorée
          {skippedRows > 1 ? "s" : ""} (nom manquant).
        </p>
      ) : null}

      {reassure ? (
        <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
          Vous pourrez ajouter ou modifier les participants après la création
          du groupe.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="text-[12.5px] font-medium text-[var(--color-muted)] underline-offset-2 transition-colors hover:text-[var(--color-foreground)] hover:underline"
        >
          {showPaste ? "Masquer le collage" : "Coller du texte CSV à la place"}
        </button>
        {showPaste ? (
          <textarea
            value={raw}
            onChange={(e) => applyText(e.target.value, null)}
            rows={6}
            placeholder={rosterPastePlaceholder(mode)}
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-[var(--color-foreground)] outline-none transition-[border-color] focus:border-[var(--color-brand)]"
          />
        ) : null}
      </div>

      {count > 0 && !showPaste ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] px-3.5 py-2.5">
          <p className="text-[12px] font-medium text-[var(--color-muted)]">
            Aperçu
          </p>
          <ul className="mt-1.5 space-y-1">
            {parsed.slice(0, 4).map((m, i) => (
              <li
                key={`${m.full_name}-${i}`}
                className="truncate text-[13px] text-[var(--color-foreground)]"
              >
                {m.full_name}
                {m.dob ? (
                  <span className="text-[var(--color-muted)]"> · {m.dob}</span>
                ) : null}
              </li>
            ))}
            {count > 4 ? (
              <li className="text-[12px] text-[var(--color-muted)]">
                + {count - 4} autre{count - 4 > 1 ? "s" : ""}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
