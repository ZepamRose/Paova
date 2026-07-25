"use client";

import { useState } from "react";
import { Download } from "lucide-react";

/** Simple client-side download — no server audit trail for groups (yet). */
export function QrDownloadButton({
  dataUrl,
  filename,
  className,
}: {
  dataUrl: string;
  filename: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      window.setTimeout(() => setBusy(false), 500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className={className}
    >
      <Download size={15} strokeWidth={1.85} aria-hidden />
      {busy ? "Téléchargement…" : "Télécharger le QR"}
    </button>
  );
}
