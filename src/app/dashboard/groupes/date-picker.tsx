"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

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

export function DatePicker({ value, onChange }: { value: Date | null; onChange: (date: Date | null) => void }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isToday = value && isSameDay(value, today);
  const isTomorrow = value && isSameDay(value, tomorrow);
  const isCustom = value && !isToday && !isTomorrow;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { onChange(today); setShowCalendar(false); }}
          className={[
            "inline-flex h-9 items-center justify-center rounded-lg px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150",
            isToday
              ? "border border-[color-mix(in_srgb,var(--color-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              : "border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)]/75 hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] active:scale-[0.98]",
          ].join(" ")}
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          onClick={() => { onChange(tomorrow); setShowCalendar(false); }}
          className={[
            "inline-flex h-9 items-center justify-center rounded-lg px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150",
            isTomorrow
              ? "border border-[color-mix(in_srgb,var(--color-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              : "border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)]/75 hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] active:scale-[0.98]",
          ].join(" ")}
        >
          Demain
        </button>
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          className={[
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150",
            isCustom || showCalendar
              ? "border border-[color-mix(in_srgb,var(--color-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              : "border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)]/75 hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] active:scale-[0.98]",
          ].join(" ")}
        >
          <CalendarIcon size={13} strokeWidth={1.85} />
          {isCustom ? formatDateShort(value) : "Choisir…"}
        </button>
      </div>
      <AnimatePresence>
        {showCalendar ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            <Calendar selected={value} onSelect={(date) => { onChange(date); setShowCalendar(false); }} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
