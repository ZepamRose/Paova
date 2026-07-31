"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  variant = "button",
  size = "default",
  className = "",
}: {
  url: string;
  variant?: "button" | "icon";
  /** Quieter compact control for dense list rows. */
  size?: "default" | "sm";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const compact = size === "sm";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can fail on insecure origins; ignore silently.
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Lien copié" : "Copier le lien public"}
        title={copied ? "Copié !" : "Copier le lien"}
        className={`inline-flex items-center justify-center transition-[color,background-color,border-color,transform,box-shadow] duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.98] ${
          compact
            ? "h-11 w-11 rounded-xl border border-transparent bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] sm:h-8 sm:w-8 sm:rounded-lg"
            : "h-9 w-9 rounded-lg border shadow-[var(--elev-1)]"
        } ${
          compact
            ? copied
              ? "text-[var(--color-brand)]"
              : ""
            : copied
              ? "border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)]"
              : "border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)]"
        } ${className}`}
      >
        {copied ? (
          <svg
            width={compact ? 14 : 16}
            height={compact ? 14 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="animate-scale-in text-[var(--color-brand)]"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width={compact ? 14 : 16}
            height={compact ? 14 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-medium tracking-[-0.01em] shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,color] duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.98] ${
        copied
          ? "border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)] shadow-[var(--elev-2)]"
          : "border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)]"
      } ${className}`}
    >
      {copied ? (
        <>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="animate-scale-in text-[var(--color-brand)]"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Copié
        </>
      ) : (
        <>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copier
        </>
      )}
    </button>
  );
}
