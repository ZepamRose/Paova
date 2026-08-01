"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Scroll to selected on open
  useEffect(() => {
    if (!open || !listRef.current || !value) return;
    const idx = TIME_SLOTS.indexOf(value);
    if (idx === -1) return;
    const itemHeight = 32;
    listRef.current.scrollTop = idx * itemHeight - 64;
  }, [open, value]);

  const displayValue = value || "Heure";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none"
      >
        <Clock size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
        <span className={value ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
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
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[240px] overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
            ref={listRef}
          >
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onChange(slot);
                  setOpen(false);
                }}
                className={[
                  "flex h-8 w-full items-center px-3 text-[13px] transition-colors",
                  slot === value
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-medium text-[var(--color-brand)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                ].join(" ")}
              >
                {slot}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
