"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { NewGroupForm } from "./new-group-form";
import type { RosterMode } from "@/lib/groups";
import type { OpeningHours } from "@/lib/groups/lifecycle";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateChoice = {
  id: string;
  title: string;
  rosterMode?: RosterMode;
  fieldLabels?: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Modal ────────────────────────────────────────────────────────────────────

export function NewSessionModal({
  choices,
  open: controlledOpen,
  onOpenChange,
  openingHours,
}: {
  choices: TemplateChoice[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openingHours?: OpeningHours | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const reduced = useReducedMotion() ?? false;

  const close = useCallback(() => setOpen(false), [setOpen]);

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const cardVariants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } };

  return (
    <>
      {/* ── Bouton déclencheur ─────────────────────────────────────────── */}
      {controlledOpen === undefined && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3.5 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[var(--elev-2)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden />
          Nouvelle session
        </button>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nouvelle session"
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          >
            {/* Fond assombri */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
              onClick={handleClose}
              aria-hidden
            />

            {/* Carte avec scroll interne */}
            <motion.div
              key="card"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
            >
              {/* En-tête fixe */}
              <div className="flex shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-4">
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Nouvelle session
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Fermer"
                  className="rounded-lg p-1.5 text-[var(--color-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Contenu scrollable */}
              <div className="overflow-y-auto px-5 py-5">
                <NewGroupForm
                  choices={choices}
                  preselected={null}
                  fromWaiver={false}
                  initialName=""
                  openingHours={openingHours ?? null}
                />
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
