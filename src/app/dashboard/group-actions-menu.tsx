"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { archiveGroup, unarchiveGroup } from "./groupes/actions";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Actions for a group card, mirroring WaiverActionsMenu so both card types
 * behave identically. It only wraps the server actions that already existed
 * (copy link, archive, unarchive) — nothing new happens, the entry point moved
 * out of the card body so the whole card can become the link target.
 */
export function GroupActionsMenu({
  id,
  name,
  publicUrl,
  archived = false,
  canArchive = true,
}: {
  id: string;
  name: string;
  publicUrl?: string;
  archived?: boolean;
  /** Archivage réservé aux propriétaires et administrateurs : le serveur le
   *  refuse aux collaborateurs, l'entrée ne doit donc pas leur être proposée. */
  canArchive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = `group-menu-${id}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  async function copy() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked by permissions; the link stays reachable from
      // the group page, so failing quietly is better than an error toast here.
    }
  }

  const item =
    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)]";

  return (
    <div ref={rootRef} className="relative">
      {/* Geometry, open state and press feedback copied from
          WaiverActionsMenu so the two card types feel like one control. */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Actions pour ${name}`}
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
            initial={reduced ? false : { opacity: 0, y: -3, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 z-50 mt-1.5 min-w-[13rem] origin-top-right overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] py-1 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.18)]"
          >
            {publicUrl && !archived ? (
              <button type="button" role="menuitem" onClick={copy} className={item}>
                {copied ? "Lien copié" : "Copier le lien"}
              </button>
            ) : null}

            {canArchive ? (
            <form action={archived ? unarchiveGroup : archiveGroup}>
              <input type="hidden" name="group_id" value={id} />
              <input type="hidden" name="return_to" value="dashboard" />
              <button type="submit" role="menuitem" className={item}>
                {archived ? "Désarchiver" : "Archiver"}
              </button>
            </form>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
