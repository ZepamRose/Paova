"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Plus, Loader2, ArrowRight } from "lucide-react";
import { CompactClosingModePicker } from "./compact-closing-mode-picker";
import { CompactToggle } from "./compact-toggle";
import { SmartWaiverSelector } from "./smart-waiver-selector";
import { LiveSummary } from "./live-summary";
import { CompactDateTimePicker } from "./compact-datetime-picker";
import { createSigningGroup } from "./actions";
import type { RosterMode } from "@/lib/groups";
import type { OpeningHours, ClosingMode } from "@/lib/groups/lifecycle";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type TemplateChoice = {
  id: string;
  title: string;
  rosterMode?: RosterMode;
  fieldLabels?: string[];
};

const field =
  "h-9 w-full rounded-lg border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] px-3 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      className={cn(
        "h-9 rounded-lg px-4 text-[13px] font-medium transition-all duration-150",
        canSubmit && !pending
          ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-sm hover:brightness-105 active:scale-[0.98]"
          : pending
            ? "cursor-wait bg-[var(--color-brand)] text-[var(--color-on-brand)] opacity-75"
            : "bg-[var(--color-brand)]/20 text-[var(--color-brand)]/50 cursor-not-allowed"
      )}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 size={13} strokeWidth={2.5} className="animate-spin" aria-hidden />
          Création…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          Créer la session
          <ArrowRight size={13} strokeWidth={2.5} aria-hidden />
        </span>
      )}
    </button>
  );
}

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

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("");
  const [closingMode, setClosingMode] = useState<ClosingMode>("manual");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState("");
  const [closingModeValid, setClosingModeValid] = useState(true);
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [signatureMode, setSignatureMode] = useState<"individual" | "group_representative">("individual");
  const [templateId, setTemplateId] = useState(choices[0]?.id ?? "");

  const reduced = useReducedMotion() ?? false;
  const nameRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const handleClose = useCallback(() => {
    close();
    setTimeout(() => {
      setName("");
      setStartDate(null);
      setStartTime("");
      setClosingMode("manual");
      setDurationMinutes(null);
      setFixedEndTime("");
      setRequiresSignature(true);
      setSignatureMode("individual");
      setTemplateId(choices[0]?.id ?? "");
    }, 280);
  }, [close, choices]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameRef.current?.focus(), reduced ? 0 : 150);
    return () => clearTimeout(t);
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const selected = choices.find((c) => c.id === templateId) ?? null;
  const nameDone = name.trim().length > 0;
  const waiverDone = !requiresSignature || Boolean(selected);
  const canSubmit = nameDone && closingModeValid && waiverDone;

  const startTimeISO = startDate && startTime
    ? (() => {
        const [h, m] = startTime.split(":").map(Number);
        const d = new Date(startDate);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      })()
    : "";

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 24,
      scale: 0.96,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
  };

  return (
    <>
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

      <AnimatePresence>
        {open ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nouvelle session"
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          >
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

            <motion.div
              key="card"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
              transition={{
                duration: 0.28,
                ease: EASE,
                opacity: { duration: 0.22 },
              }}
              className="relative z-10 flex w-full max-w-[480px] max-h-[90vh] flex-col rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-4 py-3">
                <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Nouvelle session
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Fermer"
                  className="rounded-lg p-1.5 text-[var(--color-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)]"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              <form action={createSigningGroup} className="flex min-h-0 flex-col">
                <div className="overflow-y-auto px-4 py-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="session-name" className="text-[13px] font-medium text-[var(--color-foreground)]">
                        Nom
                      </label>
                      <input
                        ref={nameRef}
                        id="session-name"
                        name="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex. Cours de yoga lundi"
                        className={field}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[var(--color-foreground)]">
                        Quand <span className="text-[11px] text-[var(--color-muted)]">(facultatif)</span>
                      </label>
                      <CompactDateTimePicker
                        date={startDate}
                        time={startTime}
                        onDateChange={setStartDate}
                        onTimeChange={setStartTime}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[var(--color-foreground)]">Fin</label>
                      <CompactClosingModePicker
                        mode={closingMode}
                        onModeChange={setClosingMode}
                        durationMinutes={durationMinutes}
                        onDurationChange={setDurationMinutes}
                        fixedEndTime={fixedEndTime}
                        onFixedEndTimeChange={setFixedEndTime}
                        openingHours={openingHours ?? null}
                        startDate={startDate}
                        onValidationChange={setClosingModeValid}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-[var(--color-foreground)]">Décharge ?</label>
                      <CompactToggle
                        options={[
                          { value: true, label: "Oui" },
                          { value: false, label: "Non" },
                        ]}
                        value={requiresSignature}
                        onChange={setRequiresSignature}
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      {requiresSignature && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0,
                            filter: "blur(2px)",
                            marginTop: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                            filter: "blur(0px)",
                            marginTop: 12,
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                            filter: "blur(2px)",
                            marginTop: 0,
                          }}
                          transition={{
                            duration: 0.2,
                            ease: EASE,
                            height: { duration: 0.22 },
                            opacity: { duration: 0.18 },
                          }}
                          className="flex flex-col gap-3 overflow-hidden"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0 }}
                            className="flex flex-col gap-1.5"
                          >
                            <label className="text-[13px] font-medium text-[var(--color-foreground)]">
                              Quelle décharge ?
                            </label>
                            <SmartWaiverSelector
                              choices={choices}
                              value={templateId}
                              onChange={setTemplateId}
                              compact
                            />
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.08 }}
                            className="flex flex-col gap-1.5"
                          >
                            <label className="text-[13px] font-medium text-[var(--color-foreground)]">Mode</label>
                            <CompactToggle
                              options={[
                                { value: "individual" as const, label: "Individuel" },
                                { value: "group_representative" as const, label: "Représentant" },
                              ]}
                              value={signatureMode}
                              onChange={setSignatureMode}
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <input type="hidden" name="start_time" value={startTimeISO} />
                <input type="hidden" name="closing_mode" value={closingMode} />
                {closingMode === "duration" && durationMinutes && (
                  <input type="hidden" name="duration_minutes" value={durationMinutes.toString()} />
                )}
                {closingMode === "fixed_time" && fixedEndTime && (
                  <input type="hidden" name="end_time" value={fixedEndTime} />
                )}
                <input type="hidden" name="requires_signature" value={requiresSignature ? "true" : "false"} />
                {requiresSignature && (
                  <>
                    <input type="hidden" name="signature_mode" value={signatureMode} />
                    <input type="hidden" name="template_id" value={templateId} />
                  </>
                )}

                <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-4 py-3">
                  <LiveSummary
                    name={name}
                    startDate={startDate}
                    startTime={startTime}
                    closingMode={closingMode}
                    durationMinutes={durationMinutes}
                    requiresSignature={requiresSignature}
                    selected={selected}
                    signatureMode={signatureMode}
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-[12.5px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)]"
                    >
                      Annuler
                    </button>
                    <SubmitButton canSubmit={canSubmit} />
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
