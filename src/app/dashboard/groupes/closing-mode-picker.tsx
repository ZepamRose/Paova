"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Building2, CalendarClock, Hand } from "lucide-react";
import type { ClosingMode, OpeningHours } from "@/lib/groups/lifecycle";
import { TimePicker } from "@/components/ui/datetime-picker";
import { getBusinessCloseTime } from "@/lib/groups/lifecycle";

const EASE = [0.22, 1, 0.36, 1] as const;

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1 h 30", value: 90 },
  { label: "2 h", value: 120 },
  { label: "3 h", value: 180 },
] as const;

const MODE_OPTIONS: {
  value: ClosingMode;
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  {
    value: "duration",
    label: "Après une durée",
    description: "La session se ferme automatiquement.",
    Icon: Clock,
  },
  {
    value: "business_close",
    label: "Fermeture établissement",
    description: "La session se ferme à votre heure de fermeture.",
    Icon: Building2,
  },
  {
    value: "fixed_time",
    label: "Heure précise",
    description: "Choisissez l'heure de fin exacte.",
    Icon: CalendarClock,
  },
  {
    value: "manual",
    label: "Fermeture manuelle",
    description: "Vous fermez la session vous-même.",
    Icon: Hand,
  },
];

export function ClosingModePicker({
  mode,
  onModeChange,
  durationMinutes,
  onDurationChange,
  fixedEndTime,
  onFixedEndTimeChange,
  openingHours,
  startDate,
  onValidationChange,
}: {
  mode: ClosingMode;
  onModeChange: (mode: ClosingMode) => void;
  durationMinutes: number | null;
  onDurationChange: (minutes: number | null) => void;
  fixedEndTime: string;
  onFixedEndTimeChange: (value: string) => void;
  openingHours: OpeningHours | null;
  startDate: Date | null;
  onValidationChange?: (valid: boolean) => void;
}) {
  const [durationOpen, setDurationOpen] = useState(false);

  const businessCloseTime =
    mode === "business_close" && startDate
      ? getBusinessCloseTime(openingHours, startDate)
      : null;

  // Validation du mode business_close
  const businessCloseValidation = (() => {
    if (mode !== "business_close" || !startDate) return { valid: true, error: null };

    const closeTime = getBusinessCloseTime(openingHours, startDate);

    // Établissement fermé ce jour
    if (!closeTime) {
      return {
        valid: false,
        error: "L'établissement est fermé ce jour-là. Choisissez un autre mode de fin ou une autre date.",
      };
    }

    // Extraire l'heure de fermeture (format "HH:MM")
    const [closeHours, closeMinutes] = closeTime.split(":").map(Number);

    // Extraire l'heure de début de l'activité
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();

    // Convertir en minutes depuis minuit pour comparaison facile
    const closeTimeInMinutes = closeHours * 60 + closeMinutes;
    const startTimeInMinutes = startHours * 60 + startMinutes;

    // L'heure de début doit être strictement antérieure à l'heure de fermeture
    if (startTimeInMinutes >= closeTimeInMinutes) {
      return {
        valid: false,
        error: `L'activité doit commencer avant la fermeture (${closeTime}). Ajustez l'heure de début ou choisissez un autre mode de fin.`,
      };
    }

    return { valid: true, error: null };
  })();

  const durationLabel =
    durationMinutes
      ? DURATIONS.find((d) => d.value === durationMinutes)?.label ??
        `${durationMinutes} min`
      : "Choisir…";

  // Notify parent of validation state
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(businessCloseValidation.valid);
    }
  }, [businessCloseValidation.valid, onValidationChange]);

  return (
    <div className="flex flex-col gap-2">
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {MODE_OPTIONS.map(({ value, label, Icon }) => {
          // Hide business_close if no opening hours configured
          if (value === "business_close" && !openingHours) return null;

          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12.5px] font-medium transition-[border-color,background-color,color,box-shadow] duration-150",
                active
                  ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] text-[var(--color-brand)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_10%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface-2)]/40 text-[var(--color-foreground)] hover:border-[color-mix(in_srgb,var(--color-border)_45%,var(--color-muted))]",
              ].join(" ")}
            >
              <Icon
                size={13}
                strokeWidth={2.2}
                className={active ? "text-[var(--color-brand)]" : "text-[var(--color-muted)]"}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* Sub-controls per mode */}
      <AnimatePresence mode="wait">
        {mode === "duration" && (
          <motion.div
            key="duration"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ overflow: durationOpen ? "visible" : "hidden" }}
          >
            {/* Duration quick-pick */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDurationOpen((v) => !v)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
              >
                <span className={durationMinutes ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
                  {durationLabel}
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">▾</span>
              </button>
              <AnimatePresence>
                {durationOpen && (
                  <motion.div
                    key="dropdown"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14, ease: EASE }}
                    className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
                  >
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => { onDurationChange(d.value); setDurationOpen(false); }}
                        className={[
                          "flex w-full items-center px-3.5 py-2 text-[13px] transition-colors duration-100 hover:bg-[var(--color-surface-2)]",
                          durationMinutes === d.value
                            ? "font-medium text-[var(--color-brand)]"
                            : "text-[var(--color-foreground)]",
                        ].join(" ")}
                      >
                        {d.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {mode === "business_close" && (
          <motion.div
            key="business_close"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            {businessCloseValidation.error ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,#dc2626_30%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_4%,var(--color-surface))] px-3.5 py-2.5">
                <span className="text-[15px] leading-none">⚠️</span>
                <p className="flex-1 text-[12.5px] leading-snug text-[color-mix(in_srgb,#dc2626_85%,var(--color-foreground))]">
                  {businessCloseValidation.error}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5">
                <Building2 size={13} strokeWidth={2} className="shrink-0 text-[var(--color-muted)]" />
                <p className="text-[12.5px] text-[var(--color-muted)]">
                  {businessCloseTime
                    ? <>Fermeture à <span className="font-semibold text-[var(--color-foreground)]">{businessCloseTime}</span></>
                    : startDate
                      ? "Établissement fermé ce jour-là."
                      : "Indiquez l'heure de début pour voir l'heure de fermeture."}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {mode === "fixed_time" && (
          <motion.div
            key="fixed_time"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            <TimePicker
              value={fixedEndTime}
              onChange={onFixedEndTimeChange}
              placeholder="--:--"
            />
          </motion.div>
        )}

        {mode === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface-2)]/50 px-3.5 py-2.5 text-[12.5px] text-[var(--color-muted)]">
              La session restera ouverte jusqu&apos;à votre action.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
