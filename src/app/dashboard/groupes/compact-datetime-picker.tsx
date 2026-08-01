"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Time slots ───────────────────────────────────────────────────────────────

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

// ─── Calendar component ───────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function Calendar({ selected, onSelect }: { selected: Date | null; onSelect: (date: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  const today = new Date();

  return (
    <div className="w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] p-3 shadow-[var(--elev-1)]">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[13px] font-semibold text-[var(--color-foreground)]">
          {viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="flex h-7 items-center justify-center text-[11px] font-medium text-[var(--color-muted)]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-8" />;
          const isToday = isSameDay(day, today);
          const isSelected = selected && isSameDay(day, selected);
          const isPast = day < today && !isToday;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              disabled={isPast}
              className={[
                "flex h-8 items-center justify-center rounded-lg text-[13px] transition-colors",
                isSelected
                  ? "bg-[var(--color-brand)] font-semibold text-[var(--color-on-brand)]"
                  : isToday
                    ? "border border-[var(--color-brand)] font-medium text-[var(--color-brand)]"
                    : isPast
                      ? "text-[var(--color-muted)]/40"
                      : "font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompactDateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: Date | null;
  time: string;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string) => void;
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date && isSameDay(date, today);
  const isTomorrow = date && isSameDay(date, tomorrow);

  const dateLabel = !date
    ? "Date"
    : isToday
      ? "Aujourd'hui"
      : isTomorrow
        ? "Demain"
        : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  const timeLabel = time || "Heure";

  // Close on click outside
  useEffect(() => {
    if (!dateOpen && !timeOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (dateOpen && !dateRef.current?.contains(e.target as Node)) setDateOpen(false);
      if (timeOpen && !timeRef.current?.contains(e.target as Node)) setTimeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDateOpen(false);
        setTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateOpen, timeOpen]);

  // Scroll to selected time
  useEffect(() => {
    if (!timeOpen || !timeListRef.current || !time) return;
    const idx = TIME_SLOTS.indexOf(time);
    if (idx === -1) return;
    const itemHeight = 32;
    timeListRef.current.scrollTop = idx * itemHeight - 64;
  }, [timeOpen, time]);

  return (
    <div className="flex gap-2">
      {/* Date selector */}
      <div ref={dateRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => setDateOpen((v) => !v)}
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-[14px] transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none"
        >
          <CalendarIcon size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
          <span className={date ? "flex-1 text-left text-[var(--color-foreground)]" : "flex-1 text-left text-[var(--color-muted)]"}>
            {dateLabel}
          </span>
          <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-[var(--color-muted)]" />
        </button>

        <AnimatePresence>
          {dateOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -2, scale: 0.99 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
            >
              <button
                type="button"
                onClick={() => {
                  onDateChange(today);
                  setDateOpen(false);
                  setShowCalendar(false);
                }}
                className={[
                  "flex h-9 w-full items-center px-3 text-[13px] transition-colors",
                  isToday
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-medium text-[var(--color-brand)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                ].join(" ")}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => {
                  onDateChange(tomorrow);
                  setDateOpen(false);
                  setShowCalendar(false);
                }}
                className={[
                  "flex h-9 w-full items-center px-3 text-[13px] transition-colors",
                  isTomorrow
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-medium text-[var(--color-brand)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
                ].join(" ")}
              >
                Demain
              </button>
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="flex h-9 w-full items-center px-3 text-[13px] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)]"
              >
                Choisir une date…
              </button>

              <AnimatePresence>
                {showCalendar ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="overflow-hidden border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] p-2"
                  >
                    <Calendar
                      selected={date}
                      onSelect={(d) => {
                        onDateChange(d);
                        setDateOpen(false);
                        setShowCalendar(false);
                      }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Time selector */}
      <div ref={timeRef} className="relative w-[120px]">
        <button
          type="button"
          onClick={() => setTimeOpen((v) => !v)}
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-[14px] transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none"
        >
          <Clock size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
          <span className={time ? "flex-1 text-[var(--color-foreground)]" : "flex-1 text-[var(--color-muted)]"}>
            {timeLabel}
          </span>
        </button>

        <AnimatePresence>
          {timeOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -2, scale: 0.99 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[240px] overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
              ref={timeListRef}
            >
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    onTimeChange(slot);
                    setTimeOpen(false);
                  }}
                  className={[
                    "flex h-8 w-full items-center px-3 text-[13px] transition-colors",
                    slot === time
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
    </div>
  );
}
