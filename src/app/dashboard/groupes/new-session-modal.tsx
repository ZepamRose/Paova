"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Plus, Loader2, ArrowRight } from "lucide-react";
import { SmartWaiverSelector } from "./smart-waiver-selector";
import { CompactDateTimePicker } from "./compact-datetime-picker";
import { DurationPicker } from "./duration-picker";
import { createSigningGroup } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateChoice = {
  id: string;
  title: string;
  fieldLabels?: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Design tokens ────────────────────────────────────────────────────────────

const fieldBase =
  "h-11 w-full rounded-xl border bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150";

const fieldIdle =
  "border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))]";

const fieldFocus =
  "focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const fieldFilled =
  "border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]";

const field = `${fieldBase} ${fieldIdle} ${fieldFocus}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTimeForSummary(date: Date | null, time: string): string {
  if (!date || !time) return "";
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(date, now)) return `Aujourd’hui à ${time}`;
  if (sameDay(date, tomorrow)) return `Demain à ${time}`;

  const d = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return `${d} à ${time}`;
}

function formatDurationForSummary(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "Sans limite";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

// ─── Submit button (doit vivre dans le <form> pour useFormStatus) ─────────────

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      className={[
        "relative inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium",
        "transition-[transform,filter,opacity,background-color,box-shadow,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
        canSubmit && !pending
          ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] hover:-translate-y-[1.5px] hover:shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-2)] hover:brightness-[1.04] active:scale-[0.99]"
          : pending
            ? "cursor-wait bg-[var(--color-brand)] text-[var(--color-on-brand)] opacity-75"
            : "bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface-2))] text-[color-mix(in_srgb,var(--color-brand)_55%,var(--color-muted))]",
      ].join(" ")}
    >
      {pending ? (
        <>
          <Loader2 size={15} strokeWidth={2.2} className="animate-spin" aria-hidden />
          <span>Création…</span>
        </>
      ) : (
        <>
          <span>Créer la session</span>
          <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
        </>
      )}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function NewSessionModal({ choices }: { choices: TemplateChoice[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(choices[0]?.id ?? "");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const nameRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const handleClose = useCallback(() => {
    close();
    setTimeout(() => {
      setName(""); setDate(null); setTime(""); setDuration(null);
      setNameTouched(false); setTemplateId(choices[0]?.id ?? "");
    }, 240);
  }, [close, choices]);

  // Focus le champ Nom apres l'animation d'ouverture
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameRef.current?.focus(), reduced ? 0 : 130);
    return () => clearTimeout(t);
  }, [open, reduced]);

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

  const selectedTemplate = choices.find((c) => c.id === templateId) ?? null;
  const canSubmit = name.trim().length > 0 && Boolean(templateId);
  const nameError = nameTouched && name.trim().length === 0;

  // Compute combined datetime ISO for backend
  const startTimeISO = date && time
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${time}:00`
    : "";

  const cardVariants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } };

  return (
    <>
      {/* ── Bouton déclencheur ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3.5 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[var(--elev-2)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
      >
        <Plus size={14} strokeWidth={2.2} aria-hidden />
        Nouvelle session
      </button>

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
              <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-4">
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

              {/* Formulaire */}
              <form action={createSigningGroup} className="flex flex-col">
                <div className="flex flex-col gap-3.5 px-5 pt-4 pb-3.5">

                  {/* ── Décharge ───────────────────────────────────────── */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                      Décharge
                    </span>
                    <SmartWaiverSelector
                      choices={choices}
                      value={templateId}
                      onChange={setTemplateId}
                    />
                    <input type="hidden" name="template_id" value={templateId} />
                  </div>

                  {/* ── Nom ────────────────────────────────────────────── */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="session-name"
                      className="text-[13px] font-medium text-[var(--color-foreground)]"
                    >
                      Nom de la session
                    </label>
                    <input
                      ref={nameRef}
                      id="session-name"
                      name="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      placeholder="Ex. Cours de yoga — 2 août"
                      className={[
                        field,
                        name.trim().length > 0 ? fieldFilled : "",
                        nameError
                          ? "border-[color-mix(in_srgb,#ef4444_50%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,#ef4444_12%,transparent)]"
                          : "",
                      ].join(" ")}
                    />
                    <AnimatePresence>
                      {nameError ? (
                        <motion.p
                          key="name-error"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.14 }}
                          className="overflow-hidden text-[12px] text-[color-mix(in_srgb,#ef4444_80%,var(--color-foreground))]"
                        >
                          Un nom est requis.
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* ── Quand ? ────────────────────────────────────────── */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--color-foreground)]">
                      Quand ?
                      <span className="ml-1.5 text-[12px] font-normal text-[var(--color-muted)]">(facultatif)</span>
                    </label>
                    <CompactDateTimePicker
                      date={date}
                      time={time}
                      onDateChange={setDate}
                      onTimeChange={setTime}
                    />
                    <input type="hidden" name="start_time" value={startTimeISO} />
                  </div>

                  {/* ── Durée ──────────────────────────────────────────── */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--color-foreground)]">
                      Durée
                      <span className="ml-1.5 text-[12px] font-normal text-[var(--color-muted)]">(facultatif)</span>
                    </label>
                    <DurationPicker value={duration} onChange={setDuration} />
                    <input type="hidden" name="duration_minutes" value={duration ?? ""} />
                  </div>
                </div>

                {/* ── Résumé + Actions ────────────────────────────────── */}
                <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-5 pb-5 pt-4">
                  {/* Résumé */}
                  <AnimatePresence mode="wait">
                    {(name.trim() || date || duration !== null || selectedTemplate) ? (
                      <motion.div
                        key="summary"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: EASE }}
                        className="rounded-lg bg-[var(--color-surface-2)]/50 px-3 py-2.5"
                      >
                        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/70">
                          Résumé
                        </p>
                        <div className="flex flex-col gap-1">
                          {selectedTemplate ? (
                            <p className="text-[13px] text-[var(--color-foreground)]">
                              • Décharge : <span className="font-medium">{selectedTemplate.title}</span>
                            </p>
                          ) : null}
                          {date && time ? (
                            <p className="text-[13px] text-[var(--color-foreground)]">
                              • {formatDateTimeForSummary(date, time)}
                            </p>
                          ) : null}
                          {duration !== null || (date && time) ? (
                            <p className="text-[13px] text-[var(--color-foreground)]">
                              • Durée : <span className="font-medium">{formatDurationForSummary(duration)}</span>
                            </p>
                          ) : null}
                          <p className="text-[13px] text-[var(--color-foreground)]">
                            • Participants : <span className="text-[var(--color-muted)]">ajout après création</span>
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="text-[12.5px] text-[var(--color-muted)]/60"
                      >
                        Nommez la session pour continuer.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-[13px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)]"
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
