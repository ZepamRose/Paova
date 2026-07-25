"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

export function ExportCsvButton({
  href,
  className,
  label = "Exporter les signatures (CSV)",
  title,
  disabled = false,
}: {
  href: string;
  className?: string;
  label?: string;
  title?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? "signatures.csv";

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
      window.setTimeout(() => setBusy(false), 320);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      aria-busy={busy}
      aria-label={busy ? "Export des données en cours" : label}
      title={busy ? undefined : title}
      className={className}
    >
      {busy ? (
        <>
          <svg
            className="animate-spin"
            width="15"
            height="15"
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
          Préparation…
        </>
      ) : (
        <>
          <FileDown size={15} strokeWidth={1.85} aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
