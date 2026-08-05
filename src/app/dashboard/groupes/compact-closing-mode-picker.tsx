"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Building2, CalendarClock, Hand } from "lucide-react";
import type { ClosingMode, OpeningHours } from "@/lib/groups/lifecycle";
import { TimePicker } from "@/components/ui/datetime-picker";
import { getBusinessCloseTime } from "@/lib/groups/lifecycle";
import { cn } from "@/lib/utils";

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
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  { value: "duration", label: "Durée", Icon: Clock },
  { value: "business_close", label: "Fermeture", Icon: Building2 },
  { value: "fixed_time", label: "Heure fixe", Icon: CalendarClock },
  { value: "manual", label: "Manuel", Icon: Hand },
];

export function CompactClosingModePicker({
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

  const businessCloseValidation = (() => {
    if (mode !== "business_close" || !startDate) return { valid: true, error: null };

    const closeTime = getBusinessCloseTime(openingHours, startDate);
    if (!closeTime) {
      return { valid: false, error: "Établissement fermé ce jour-là." };
    }

    const [closeHours, closeMinutes] = closeTime.split(":").map(Number);
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const closeTimeInMinutes = closeHours * 60 + closeMinutes;
    const startTimeInMinutes = startHours * 60 + startMinutes;

    if (startTimeInMinutes >= closeTimeInMinutes) {
      return { valid: false, error: `Doit commencer avant ${closeTime}.` };
    }

    return { valid: true, error: null };
  })();

  const durationLabel = durationMinutes
    ? DURATIONS.find((d) => d.value === durationMinutes)?.label ?? `${durationMinutes} min`
    : "Choisir…";

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(businessCloseValidation.valid);
    }
  }, [businessCloseValidation.valid, onValidationChange]);

  const visibleModes = MODE_OPTIONS.filter((m) => m.value !== "business_close" || openingHours);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative inline-flex h-8 items-stretch rounded-lg border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] p-0.5">
        {/* Pill animé */}
        <motion.div
          layoutId="closing-mode-pill"
          className="absolute inset-0.5 rounded-md bg-[var(--color-brand)] shadow-sm"
          initial={false}
          animate={{
            x: visibleModes.findIndex((m) => m.value === mode) * (100 / visibleModes.length) + "%",
            width: `calc(${100 / visibleModes.length}% - 2px)`,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />

        {visibleModes.map(({ value, label, Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors duration-150",
                active
                  ? "text-[var(--color-on-brand)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon size={11} strokeWidth={2.5} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setDurationOpen((v) => !v)}
                className="flex h-8 w-full items-center justify-between rounded-lg border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] px-3 text-[12px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
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
                    className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
                  >
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => { onDurationChange(d.value); setDurationOpen(false); }}
                        className={cn(
                          "flex w-full items-center px-3 py-1.5 text-[12px] transition-colors duration-100 hover:bg-[var(--color-surface-2)]",
                          durationMinutes === d.value
                            ? "font-medium text-[var(--color-brand)]"
                            : "text-[var(--color-foreground)]"
                        )}
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
              <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,#dc2626_30%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_4%,var(--color-surface))] px-2.5 py-1.5">
                <span className="text-[13px] leading-none">⚠️</span>
                <p className="flex-1 text-[11.5px] leading-snug text-[color-mix(in_srgb,#dc2626_85%,var(--color-foreground))]">
                  {businessCloseValidation.error}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)]/50 px-2.5 py-1.5">
                <Building2 size={11} strokeWidth={2} className="shrink-0 text-[var(--color-muted)]" />
                <p className="text-[11.5px] text-[var(--color-muted)]">
                  {businessCloseTime ? (
                    <>Ferme à <span className="font-semibold text-[var(--color-foreground)]">{businessCloseTime}</span></>
                  ) : (
                    "Établissement fermé ce jour-là."
                  )}
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
            <TimePicker value={fixedEndTime} onChange={onFixedEndTimeChange} placeholder="--:--" />
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
            <p className="rounded-lg bg-[var(--color-surface-2)]/50 px-2.5 py-1.5 text-[11.5px] text-[var(--color-muted)]">
              La session reste ouverte jusqu&apos;à votre action.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
