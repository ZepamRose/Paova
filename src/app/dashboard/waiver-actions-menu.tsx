"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DeleteWaiverDialog } from "./delete-waiver-dialog";

export function WaiverActionsMenu({
  id,
  title,
  submissionCount = 0,
}: {
  id: string;
  title: string;
  submissionCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : ""}`}>
      <button
        type="button"
        aria-label="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-[var(--color-surface)] shadow-[var(--elev-1)] transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.985] ${
          open
            ? "border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
            : "border-[var(--color-border)] text-[var(--color-muted)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)]"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)] animate-fade-up"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-[var(--color-surface-2)]"
          >
            Archiver
          </button>
        </div>
      ) : null}

      <DeleteWaiverDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        id={id}
        title={title}
        submissionCount={submissionCount}
      />
    </div>
  );
}
