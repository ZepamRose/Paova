"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DeleteWaiverDialog } from "./delete-waiver-dialog";

const EASE = [0.22, 1, 0.36, 1] as const;

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function WaiverActionsMenu({
  id,
  title,
  submissionCount = 0,
  publicUrl,
}: {
  id: string;
  title: string;
  submissionCount?: number;
  publicUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = `waiver-menu-${id}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

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

  async function copyPublicLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable on an insecure local origin.
    }
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : ""}`}>
      <button
        type="button"
        aria-label="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition-[color,background-color,transform,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.94] sm:h-8 sm:w-8 sm:rounded-full ${
          open
            ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-foreground)] shadow-[var(--elev-1)]"
            : "text-[var(--color-muted)]/70 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        }`}
      >
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          animate={open ? { scale: 1.06 } : { scale: 1 }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          <circle cx="12" cy="5" r="1.55" />
          <circle cx="12" cy="12" r="1.55" />
          <circle cx="12" cy="19" r="1.55" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            initial={reduced ? false : { opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 z-50 mt-1.5 min-w-[10.5rem] origin-top-right overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] py-1 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
          >
            {publicUrl ? (
              <button
                type="button"
                role="menuitem"
                onClick={copyPublicLink}
                className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/88 transition-[background-color,color] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="opacity-55">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Lien copi\u00e9" : "Copier le lien"}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/88 transition-[background-color,color,padding] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            >
              <ArchiveIcon className="opacity-55" />
              Archiver
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
