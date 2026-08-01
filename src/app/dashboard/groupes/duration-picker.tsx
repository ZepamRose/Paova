"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Timer } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1 h 30", value: 90 },
  { label: "2 h", value: 120 },
  { label: "3 h", value: 180 },
  { label: "Sans limite", value: null },
] as const;

export function DurationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayValue = DURATIONS.find((d) => d.value === value)?.label || "Durée";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none"
      >
        <Timer size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
        <span className={value !== null ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
          {displayValue}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.99 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
          >
            {DURATIONS.map((duration) => (
              <button
                key={duration.label}
                type="button"
                onClick={() => {
                  onChange(duration.value);
                  setOpen(false);
                }}
                className={[
                  "flex h-9 w-full items-center px-3 text-[13px] transition-colors",
                  duration.value === value
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-medium text-[var(--color-brand)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                ].join(" ")}
              >
                {duration.label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
