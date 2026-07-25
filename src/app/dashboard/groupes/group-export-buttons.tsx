"use client";

import { useState } from "react";
import { FileDown, FileArchive } from "lucide-react";

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
}: {
  groupId: string;
  signedCount: number;
  className: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"csv" | "zip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "csv" | "zip") {
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
          onClick={() => run("zip")}
          disabled={busy !== null || signedCount === 0}
          className={className}
          title={
            signedCount === 0
              ? "Aucune signature à exporter"
              : `ZIP de ${signedCount} PDF`
          }
        >
          <FileArchive size={14} strokeWidth={1.85} aria-hidden />
          {busy === "zip"
            ? "ZIP…"
            : signedCount === 0
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
          CSV = liste complète. ZIP = preuves PDF.
        </p>
      ) : null}
    </div>
  );
}
