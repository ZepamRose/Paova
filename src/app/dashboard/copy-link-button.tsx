"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can fail on insecure origins; ignore silently.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
    >
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  );
}
