"use client";

import { useState, type CSSProperties } from "react";
import { FileDown } from "lucide-react";

const emphasisClassName =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,#c45c5c_18%,var(--color-border))] bg-[color-mix(in_srgb,#c45c5c_5%,var(--color-surface))] px-3 text-[13px] font-medium text-[#a84848] shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,opacity] duration-[180ms] hover:-translate-y-px hover:border-[color-mix(in_srgb,#c45c5c_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,#c45c5c_8%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,#c45c5c_35%,transparent)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-70 dark:border-[color-mix(in_srgb,#e8a0a0_22%,var(--color-border))] dark:bg-[color-mix(in_srgb,#e8a0a0_8%,var(--color-surface))] dark:text-[#e8b4b4] dark:hover:bg-[color-mix(in_srgb,#e8a0a0_12%,var(--color-surface))]";

const quietClassName =
  "inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,background-color,opacity] duration-[180ms] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:pointer-events-none disabled:opacity-70";

export function PdfDownloadButton({
  href,
  className,
  style,
  label = "PDF",
  busyLabel,
  variant = "emphasis",
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  label?: string;
  busyLabel?: string;
  variant?: "emphasis" | "quiet";
}) {
  const resolvedClassName =
    className ?? (variant === "quiet" ? quietClassName : emphasisClassName);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("PDF failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? "decharge.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.location.assign(href);
    } finally {
      window.setTimeout(() => setBusy(false), 280);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? "Préparation du PDF…" : "Télécharger le PDF"}
      className={resolvedClassName}
      style={style}
    >
      {busy ? (
        <>
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          {busyLabel ?? (label ? "PDF…" : null)}
        </>
      ) : (
        <>
          <FileDown size={14} strokeWidth={1.85} aria-hidden />
          {label ? label : null}
        </>
      )}
    </button>
  );
}
