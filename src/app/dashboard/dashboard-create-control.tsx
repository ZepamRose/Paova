"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GroupIcon } from "@/components/groups/group-icon";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Primary create control — one button, clear hierarchy:
 * Créer un formulaire | Créer une session planifiée
 */
export function DashboardCreateControl({
  className = "",
  canCreateGroup = true,
  canManageWaivers = true,
  canCreateGroups = true,
}: {
  className?: string;
  /** False when the business has no active waiver yet. */
  canCreateGroup?: boolean;
  /** From business_member role — never invent on the client. */
  canManageWaivers?: boolean;
  canCreateGroups?: boolean;
}) {
  // Hooks must run on every render, in the same order — the early return for
  // employees (no manage capability) lives below, after all of them.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
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

  const motionCls =
    "transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const focus =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]";

  // Nothing to create: employees see no control at all.
  if (!canManageWaivers && !canCreateGroups) {
    return null;
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : ""} ${className}`}>
      <button
        type="button"
        aria-label="Créer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3.5 text-[13px] font-medium tracking-tight text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_1px_2px_rgba(0,0,0,0.06)] sm:h-9 sm:px-4 ${motionCls} hover:brightness-[1.03] ${focus} active:scale-[0.985]`}
      >
        <span>Créer</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`opacity-90 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
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
            className="absolute right-0 z-50 mt-1.5 min-w-[17.5rem] origin-top-right overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] py-1 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
          >
            {canManageWaivers ? (
            <Link
              role="menuitem"
              href="/dashboard/waivers/new"
              onClick={() => setOpen(false)}
              className="flex gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-brand)]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                  <path d="M8 7h8" />
                  <path d="M8 11h6" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[var(--color-foreground)]">
                  Créer un formulaire
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-muted)]">
                  Un formulaire à partager par lien ou QR
                </span>
              </span>
            </Link>
            ) : null}

            {canCreateGroups ? (
              canCreateGroup ? (
              <Link
                role="menuitem"
                href="/dashboard/groupes/new"
                onClick={() => setOpen(false)}
                className="flex gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-brand)]">
                  <GroupIcon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[var(--color-foreground)]">
                    Créer une session planifiée
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-muted)]">
                    Collectez plusieurs signatures pour un même événement
                  </span>
                </span>
              </Link>
            ) : (
              <div
                role="menuitem"
                aria-disabled="true"
                className="flex gap-3 px-3.5 py-2.5 text-left opacity-90"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)]">
                  <GroupIcon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[var(--color-foreground)]/70">
                    Créer une session planifiée
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-muted)]">
                    Nécessite d&apos;abord un formulaire
                  </span>
                </span>
              </div>
            )
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
