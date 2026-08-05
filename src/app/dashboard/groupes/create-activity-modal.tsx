"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, CalendarClock, QrCode } from "lucide-react";
import { NewSessionModal } from "./new-session-modal";
import { ExpressGroupForm } from "./express-group-form";
import { createStation } from "./actions";
import type { OpeningHours } from "@/lib/groups/lifecycle";
import type { RosterMode } from "@/lib/groups";

type TemplateChoice = {
  id: string;
  title: string;
  rosterMode?: RosterMode;
  fieldLabels?: string[];
};

type View = "choice" | "session" | "station";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CreateActivityModal({
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
  
  const [view, setView] = useState<View>("choice");
  const reduced = useReducedMotion() ?? false;

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => setView("choice"), 240);
  }, [setOpen]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === "Escape") {
        if (view !== "choice") {
          setView("choice");
        } else {
          close();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, view, close]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const cardVariants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } };

  // Si on est dans un sous-formulaire, on affiche ce formulaire
  if (open && view === "session") {
    return <NewSessionModal choices={choices} open={true} onOpenChange={close} openingHours={openingHours} />;
  }

  if (open && view === "station") {
    // Réutilise ExpressGroupForm mais avec createStation
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau QR permanent"
        className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      >
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
          onClick={close}
          aria-hidden
        />
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-white drop-shadow-lg">
              Nouveau QR permanent
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:text-white"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <ExpressGroupForm
            choices={choices}
            action={createStation}
            submitLabel="Créer le QR permanent"
            nameLabel="Nom du QR permanent"
            namePlaceholder="Accueil"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && view === "choice" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nouvelle activité"
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
            onClick={close}
            aria-hidden
          />

          {/* Carte */}
          <motion.div
            key="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-3.5">
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Comment souhaitez-vous collecter les signatures ?
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-[var(--color-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Choix */}
            <div className="flex flex-col gap-2.5 px-5 py-4">
              {/* Session planifiée */}
              <button
                type="button"
                onClick={() => setView("session")}
                className="group relative flex flex-col gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] bg-[var(--color-surface)] p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02),0_0_0_1px_color-mix(in_srgb,var(--color-brand)_8%,transparent)] transition-[border-color,background-color,transform,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,var(--color-brand)_42%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_50%,var(--color-surface))] hover:shadow-[0_8px_16px_-4px_rgba(16,185,129,0.12),0_0_0_1px_color-mix(in_srgb,var(--color-brand)_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
              >
                {/* Badge recommandé */}
                <div className="absolute right-2.5 top-2.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--color-brand)_85%,var(--color-foreground))]">
                    Recommandé
                  </span>
                </div>

                {/* Icône */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_13%,transparent),color-mix(in_srgb,var(--color-brand)_7%,transparent))] text-[var(--color-brand)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                  <CalendarClock size={19} strokeWidth={2} />
                </div>

                {/* Contenu */}
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                    Session planifiée
                  </h3>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-[var(--color-muted)]">
                    Date, heure et participants connus à l&apos;avance.
                  </p>
                </div>

                {/* Action link */}
                <div className="flex items-center text-[11.5px] font-medium text-[var(--color-brand)] opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                  Créer →
                </div>
              </button>

              {/* QR permanent */}
              <button
                type="button"
                onClick={() => setView("station")}
                className="group relative flex flex-col gap-2.5 rounded-xl border border-[color-mix(in_srgb,#3b82f6_18%,var(--color-border))] bg-[var(--color-surface)] p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.02),0_0_0_1px_color-mix(in_srgb,#3b82f6_8%,transparent)] transition-[border-color,background-color,transform,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,#3b82f6_42%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_50%,var(--color-surface))] hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.12),0_0_0_1px_color-mix(in_srgb,#3b82f6_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
              >
                {/* Icône */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,#3b82f6_13%,transparent),color-mix(in_srgb,#3b82f6_7%,transparent))] text-[#3b82f6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                  <QrCode size={19} strokeWidth={2} />
                </div>

                {/* Contenu */}
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                    QR permanent
                  </h3>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-[var(--color-muted)]">
                    Les visiteurs scannent librement votre QR Code.
                  </p>
                </div>

                {/* Action link */}
                <div className="flex items-center text-[11.5px] font-medium text-[#3b82f6] opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                  Créer →
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
