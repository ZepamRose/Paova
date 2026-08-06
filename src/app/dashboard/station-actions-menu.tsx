"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, ExternalLink, Copy, QrCode, Monitor, Printer, Archive } from "lucide-react";
import { archiveGroup } from "./groupes/actions";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Menu d'actions spécifique aux Signatures libres (stations).
 * Adapté aux besoins d'un point de collecte permanent.
 */
export function StationActionsMenu({
  id,
  name,
  publicUrl,
  archived = false,
  canArchive = true,
}: {
  id: string;
  name: string;
  publicUrl: string;
  archived?: boolean;
  canArchive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = `station-menu-${id}`;
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Silently fail if clipboard is blocked
    }
  }

  function openInNewTab(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const item =
    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)]";
  const icon = "shrink-0 text-[var(--color-muted)]";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Actions pour ${name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-[color,background-color,transform,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.94] ${
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
            className="absolute right-0 z-50 mt-1.5 min-w-[14rem] origin-top-right overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] py-1 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            {!archived && (
              <>
                <a
                  href={`/dashboard/groupes/${id}`}
                  role="menuitem"
                  className={item}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye size={15} strokeWidth={2} className={icon} />
                  Voir les détails
                </a>

                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInNewTab(publicUrl);
                  }}
                  className={item}
                >
                  <ExternalLink size={15} strokeWidth={2} className={icon} />
                  Ouvrir le formulaire
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink();
                  }}
                  className={item}
                >
                  <Copy size={15} strokeWidth={2} className={icon} />
                  {copied ? "Lien copié !" : "Copier le lien"}
                </button>

                <a
                  href={`/dashboard/groupes/${id}?tab=qr`}
                  role="menuitem"
                  className={item}
                  onClick={(e) => e.stopPropagation()}
                >
                  <QrCode size={15} strokeWidth={2} className={icon} />
                  Afficher le QR Code
                </a>

                <a
                  href={`/dashboard/groupes/${id}?mode=kiosk`}
                  role="menuitem"
                  className={item}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Monitor size={15} strokeWidth={2} className={icon} />
                  Mode kiosque
                </a>

                <a
                  href={`/dashboard/groupes/${id}/print`}
                  role="menuitem"
                  className={item}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Printer size={15} strokeWidth={2} className={icon} />
                  Imprimer
                </a>

                {canArchive && <div className="my-1 h-px bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]" />}
              </>
            )}

            {canArchive && (
              <form action={archiveGroup}>
                <input type="hidden" name="group_id" value={id} />
                <input type="hidden" name="return_to" value="dashboard" />
                <button
                  type="submit"
                  role="menuitem"
                  className={`${item} text-[var(--color-muted)] hover:text-[var(--color-foreground)]`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Archive size={15} strokeWidth={2} className={icon} />
                  Archiver
                </button>
              </form>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}