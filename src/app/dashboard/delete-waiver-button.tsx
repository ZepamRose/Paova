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
  variant?: "compact" | "full";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "full"
            ? "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,#dc2626_22%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_5%,var(--color-surface))] px-3.5 text-sm font-medium tracking-tight text-[color-mix(in_srgb,#dc2626_82%,var(--color-foreground))] shadow-[var(--elev-1)] transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,#dc2626_38%,var(--color-border))] hover:bg-[color-mix(in_srgb,#dc2626_9%,var(--color-surface))] hover:text-red-600 hover:shadow-[0_6px_16px_-10px_rgba(220,38,38,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/45 active:translate-y-0 active:scale-[0.985] dark:border-[color-mix(in_srgb,#f87171_28%,var(--color-border))] dark:bg-[color-mix(in_srgb,#f87171_8%,var(--color-surface))] dark:text-[color-mix(in_srgb,#fca5a5_88%,var(--color-foreground))] dark:hover:border-[color-mix(in_srgb,#f87171_42%,var(--color-border))] dark:hover:bg-[color-mix(in_srgb,#f87171_12%,var(--color-surface))] dark:hover:text-red-300"
            : "rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        }
      >
        {variant === "full" ? (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
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
