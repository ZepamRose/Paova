"use client";

import { useState } from "react";
import { FileDown, FileArchive, FileText } from "lucide-react";

async function downloadFrom(href: string) {
  const res = await fetch(href);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? "export";
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function GroupExportButtons({
  groupId,
  signedCount,
  className,
  compact = false,
  signatureMode = "individual",
}: {
  groupId: string;
  signedCount: number;
  className: string;
  compact?: boolean;
  signatureMode?: string;
}) {
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRepMode = signatureMode === "group_representative";

  async function run(kind: "csv" | "pdf") {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const href =
        kind === "csv"
          ? `/dashboard/groupes/${groupId}/export/csv`
          : `/dashboard/groupes/${groupId}/export/pdfs`;
      await downloadFrom(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`${compact ? "mt-2.5" : "mt-4"} flex flex-col gap-1.5`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run("csv")}
          disabled={busy !== null}
          className={className}
        >
          <FileDown size={14} strokeWidth={1.85} aria-hidden />
          {busy === "csv" ? "CSV…" : "CSV"}
        </button>
        <button
          type="button"
          onClick={() => run("pdf")}
          disabled={busy !== null || signedCount === 0}
          className={className}
          title={
            signedCount === 0
              ? "Aucune signature à exporter"
              : isRepMode
                ? "Télécharger le PDF de groupe"
                : `ZIP de ${signedCount} PDF`
          }
        >
          {isRepMode ? (
            <FileText size={14} strokeWidth={1.85} aria-hidden />
          ) : (
            <FileArchive size={14} strokeWidth={1.85} aria-hidden />
          )}
          {busy === "pdf"
            ? "PDF…"
            : signedCount === 0
              ? "PDF"
              : isRepMode
                ? "PDF"
                : `PDF (${signedCount})`}
        </button>
      </div>
      {error ? (
        <p
          role="alert"
          className="text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          {error}
        </p>
      ) : !compact ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          {isRepMode
            ? "CSV = liste des participants. PDF = décharge représentant."
            : "CSV = liste complète. ZIP = preuves PDF."}
        </p>
      ) : null}
    </div>
  );
}
