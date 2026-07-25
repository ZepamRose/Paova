"use client";

import { useState } from "react";
import { DeleteWaiverDialog } from "./delete-waiver-dialog";

export function DeleteWaiverButton({
  id,
  title,
  submissionCount = 0,
  variant = "compact",
}: {
  id: string;
  title: string;
  submissionCount?: number;
  variant?: "compact" | "full" | "quiet";
}) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "quiet"
      ? "inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium tracking-tight text-[var(--color-muted)] transition-[color,background-color,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_55%,transparent)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
      : variant === "full"
        ? "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3.5 text-sm font-medium tracking-tight text-[var(--color-foreground)]/78 shadow-[var(--elev-1)] transition-[background-color,border-color,color,transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_88%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985]"
        : "rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {variant === "full" || variant === "quiet" ? (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="opacity-70"
            >
              <rect x="2" y="3" width="20" height="5" rx="1" />
              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
              <path d="M10 12h4" />
            </svg>
            Archiver
          </>
        ) : (
          "Archiver"
        )}
      </button>

      <DeleteWaiverDialog
        open={open}
        onClose={() => setOpen(false)}
        id={id}
        title={title}
        submissionCount={submissionCount}
      />
    </>
  );
}
