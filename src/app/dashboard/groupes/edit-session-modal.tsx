"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { PendingSubmitButton } from "../pending-submit-button";
import { updateGroupSettings } from "./actions";
import { ClosingModePicker } from "./closing-mode-picker";
import type { ClosingMode, OpeningHours } from "@/lib/groups/lifecycle";
import {
  CompactDateTimePicker,
  DatePicker,
  parseDateTimeLocal,
  parseDateString,
  formatDateString,
} from "@/components/ui/datetime-picker";

const motion = "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";

const field =
  "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] disabled:opacity-60";

interface Template {
  id: string;
  title: string;
}

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    name: string;
    closesAt: string | null;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    closingMode: ClosingMode;
    requiresSignature: boolean;
    templateId: string | null;
  };
  templates: Template[];
  openingHours?: OpeningHours | null;
  disabled?: boolean;
  /**
   * Des signatures existent pour cette activité.
   * Quand true : les champs juridiques (décharge, toggle signature)
   * sont en lecture seule. Les autres champs restent éditables.
   */
  legalLocked?: boolean;
}

function parseStartDate(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? null : d;
}

export function EditSessionModal({
  isOpen,
  onClose,
  session,
  templates,
  openingHours = null,
  disabled = false,
  legalLocked = false,
}: EditSessionModalProps) {
  const [requiresSignature, setRequiresSignature] = useState(session.requiresSignature);
  const [closingMode, setClosingMode] = useState<ClosingMode>(session.closingMode);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(session.durationMinutes);
  const [fixedEndTime, setFixedEndTime] = useState(
    session.endTime && session.closingMode === "fixed_time"
      ? (() => {
          const d = new Date(session.endTime);
          return isNaN(d.getTime())
            ? ""
            : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        })()
      : ""
  );

  // Separate date + time state for the premium picker
  const initParsed = parseDateTimeLocal(session.startTime);
  const [startDate, setStartDate] = useState<Date | null>(initParsed.date);
  const [startTimePart, setStartTimePart] = useState(initParsed.time);

  // Closes-on state for the premium date picker
  const initClosesOn = session.closesAt ? parseDateString(session.closesAt.slice(0, 10)) : null;
  const [closesOnDate, setClosesOnDate] = useState<Date | null>(initClosesOn);

  useEffect(() => {
    if (isOpen) {
      setRequiresSignature(session.requiresSignature);
      setClosingMode(session.closingMode);
      setDurationMinutes(session.durationMinutes);
      const reParsed = parseDateTimeLocal(session.startTime);
      setStartDate(reParsed.date);
      setStartTimePart(reParsed.time);
      setClosesOnDate(session.closesAt ? parseDateString(session.closesAt.slice(0, 10)) : null);
      setFixedEndTime(
        session.endTime && session.closingMode === "fixed_time"
          ? (() => {
              const d = new Date(session.endTime);
              return isNaN(d.getTime())
                ? ""
                : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            })()
          : ""
      );
    }
  }, [isOpen, session]);

  if (!isOpen) return null;

  // Derive a start Date for the ClosingModePicker (for business_close preview)
  const startDateObj: Date | null = startDate && startTimePart
    ? (() => {
        const [h, m] = startTimePart.split(":").map(Number);
        const d = new Date(startDate);
        d.setHours(h, m, 0, 0);
        return d;
      })()
    : null;

  // Compute end_time ISO for fixed_time mode
  const endTimeISO =
    closingMode === "fixed_time" && fixedEndTime && startDateObj
      ? (() => {
          const [h, m] = fixedEndTime.split(":").map(Number);
          const d = new Date(startDateObj);
          d.setHours(h, m, 0, 0);
          return d.toISOString();
        })()
      : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div
        className="relative mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-6 py-4">
          <h2
            id="edit-modal-title"
            className="text-[16px] font-bold tracking-tight text-[var(--color-foreground)]"
          >
            Modifier l&apos;activité
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]`}
            aria-label="Fermer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form action={updateGroupSettings} className="px-6 py-5">
          <input type="hidden" name="group_id" value={session.id} />
          <input type="hidden" name="requires_signature" value={requiresSignature.toString()} />
          <input type="hidden" name="closing_mode" value={closingMode} />
          <input type="hidden" name="duration_minutes" value={
            closingMode === "duration" && durationMinutes ? durationMinutes : ""
          } />
          <input type="hidden" name="end_time" value={endTimeISO} />
          <input type="hidden" name="start_time" value={startDateObj ? startDateObj.toISOString() : ""} />
          <input type="hidden" name="closes_on" value={closesOnDate ? formatDateString(closesOnDate) : ""} />

          <div className="space-y-4">
            {/* Name */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/90">
                Nom
              </span>
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={session.name}
                disabled={disabled}
                className={field}
              />
            </label>

            {/* Start Time */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/90">
                Date et heure de début
              </span>
              <CompactDateTimePicker
                date={startDate}
                time={startTimePart}
                onDateChange={setStartDate}
                onTimeChange={setStartTimePart}
                allowPast={true}
              />
            </div>

            {/* Closing mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/90">
                Durée / Fin
              </span>
              <ClosingModePicker
                mode={closingMode}
                onModeChange={setClosingMode}
                durationMinutes={durationMinutes}
                onDurationChange={setDurationMinutes}
                fixedEndTime={fixedEndTime}
                onFixedEndTimeChange={setFixedEndTime}
                openingHours={openingHours}
                startDate={startDateObj}
              />
            </div>

            {/* Closes On */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/90">
                Date limite de signature
                <span className="ml-1 text-[11px] font-normal text-[var(--color-muted)]">(facultatif)</span>
              </span>
              <DatePicker
                value={closesOnDate}
                onChange={setClosesOnDate}
                allowPast={true}
                placeholder="Pas de limite"
              />
              <span className="text-[11.5px] text-[var(--color-muted)]">
                Après cette date, les nouvelles signatures sont refusées.
              </span>
            </div>

            {/* Signatures Toggle */}
            <div className="flex flex-col gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,var(--color-surface))] p-4">
              <label className={`flex items-center justify-between gap-3 ${legalLocked ? "cursor-default" : "cursor-pointer"}`}>
                <div>
                  <span className="text-[13px] font-semibold text-[var(--color-foreground)]">
                    Exiger des signatures
                  </span>
                  <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
                    Activer pour collecter des décharges de responsabilité
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={(e) => setRequiresSignature(e.target.checked)}
                  disabled={disabled || legalLocked}
                  className="h-5 w-5 cursor-pointer accent-[var(--color-brand)] disabled:cursor-default"
                />
              </label>

              {requiresSignature ? (
                <label className="mt-2 flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--color-border)_35%,transparent)] pt-3">
                  <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/90">
                    Décharge à signer
                  </span>
                  <select
                    name="template_id"
                    required={requiresSignature}
                    defaultValue={session.templateId ?? ""}
                    disabled={disabled || legalLocked}
                    className={field}
                  >
                    <option value="">Choisir une décharge</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {legalLocked ? (
                <p className="mt-1 text-[11.5px] text-[var(--color-muted)] border-t border-[color-mix(in_srgb,var(--color-border)_35%,transparent)] pt-2.5">
                  Cette activité possède déjà une ou plusieurs signatures. Les éléments juridiques ne peuvent plus être modifiés.
                </p>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-60"
            >
              Annuler
            </button>
            {!disabled ? (
              <PendingSubmitButton
                className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand)]/90 disabled:pointer-events-none disabled:opacity-60"
                idle="Enregistrer"
                pendingLabel="Enregistrement…"
              />
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}


