"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { recordQrDownload } from "../actions";

export function QrDownloadButton({
  templateId,
  dataUrl,
  filename,
  className,
}: {
  templateId: string;
  dataUrl: string;
  filename: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("id", templateId);
      await recordQrDownload(formData);
      router.refresh();
    } catch {
      // Best-effort audit — still allow download
    }

    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      window.setTimeout(() => setBusy(false), 400);
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
      {busy ? "Téléchargement…" : "Télécharger"}
    </button>
  );
}
