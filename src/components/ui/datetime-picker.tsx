"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Time slots (00:00 → 23:45, step 15 min) ──────────────────────────────────

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

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Build a local-date Date from a YYYY-MM-DD string (avoids UTC shift). */
export function parseDateString(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date to YYYY-MM-DD using local time. */
export function formatDateString(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse "YYYY-MM-DDTHH:MM" or ISO string into { date, time }. */
export function parseDateTimeLocal(s: string | null | undefined): { date: Date | null; time: string } {
  if (!s) return { date: null, time: "" };
  // Handle full ISO (e.g. from DB)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
  const [datePart, timePart] = s.split("T");
  return { date: parseDateString(datePart), time: timePart?.slice(0, 5) ?? "" };
}

/** Format { date, time } to a datetime-local string "YYYY-MM-DDTHH:MM". */
export function formatDateTimeLocal(date: Date | null, time: string): string {
  if (!date || !time) return "";
  return `${formatDateString(date)}T${time}`;
}

// ─── CalendarGrid ──────────────────────────────────────────────────────────────

function CalendarGrid({
  selected,
  onSelect,
  allowPast = false,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  allowPast?: boolean;
}) {
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const startDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-full p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[13px] font-semibold capitalize text-[var(--color-foreground)]">
          {viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          aria-label="Mois suivant"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="flex h-7 items-center justify-center text-[11px] font-medium text-[var(--color-muted)]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="h-8" />;
          const isToday = isSameDay(day, today);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isPast = !allowPast && day < today && !isToday;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              disabled={isPast}
              aria-pressed={isSelected}
              className={[
                "flex h-8 w-full items-center justify-center rounded-lg text-[13px] transition-colors duration-100",
                isSelected
                  ? "bg-[var(--color-brand)] font-semibold text-[var(--color-on-brand)]"
                  : isToday
                    ? "border border-[var(--color-brand)] font-semibold text-[var(--color-brand)]"
                    : isPast
                      ? "cursor-default text-[var(--color-muted)]/35"
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

// ─── TimePicker ────────────────────────────────────────────────────────────────

export function TimePicker({
  value,
  onChange,
  placeholder = "Heure",
  size = "default",
}: {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || !value) return;
    const idx = TIME_SLOTS.indexOf(value);
    if (idx !== -1) listRef.current.scrollTop = idx * 32 - 64;
  }, [open, value]);

  const isSm = size === "sm";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={[
          "flex w-full items-center gap-2 rounded-xl border bg-[var(--color-surface)] transition-[border-color,box-shadow] duration-150",
          "border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))]",
          "hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))]",
          "focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none",
          isSm ? "h-8 px-2.5 text-[12.5px]" : "h-11 px-3.5 text-[14px]",
        ].join(" ")}
      >
        <Clock size={isSm ? 12 : 14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
        <span className={["flex-1 text-left", value ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"].join(" ")}>
          {value || placeholder}
        </span>
        <ChevronDown size={isSm ? 11 : 13} strokeWidth={2} className="shrink-0 text-[var(--color-muted)]" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.99 }}
            transition={{ duration: 0.14, ease: EASE }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[240px] overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]"
            ref={listRef}
          >
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                role="option"
                aria-selected={slot === value}
                onClick={() => { onChange(slot); setOpen(false); }}
                className={[
                  "flex h-8 w-full items-center px-3 text-[13px] transition-colors duration-75",
                  slot === value
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-semibold text-[var(--color-brand)]"
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

// ─── DatePicker ────────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  allowPast = false,
  placeholder = "Choisir une date…",
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  allowPast?: boolean;
  placeholder?: string;
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = value ? isSameDay(value, today) : false;
  const isTomorrow = value ? isSameDay(value, tomorrow) : false;
  const isCustom = value ? (!isToday && !isTomorrow) : false;

  function btnClass(active: boolean) {
    return [
      "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]",
      active
        ? "border border-[color-mix(in_srgb,var(--color-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
        : "border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)]/75 hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)]",
    ].join(" ");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { onChange(today); setShowCalendar(false); }} className={btnClass(isToday)}>
          Aujourd&apos;hui
        </button>
        <button type="button" onClick={() => { onChange(tomorrow); setShowCalendar(false); }} className={btnClass(isTomorrow)}>
          Demain
        </button>
        <button type="button" onClick={() => setShowCalendar((v) => !v)} className={btnClass(isCustom || showCalendar)}>
          <CalendarIcon size={13} strokeWidth={1.85} />
          {isCustom && value
            ? value.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
            : placeholder}
        </button>
      </div>
      <AnimatePresence>
        {showCalendar ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-1)]"
          >
            <CalendarGrid
              selected={value}
              allowPast={allowPast}
              onSelect={(d) => { onChange(d); setShowCalendar(false); }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── CompactDateTimePicker ─────────────────────────────────────────────────────

export function CompactDateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  allowPast = false,
}: {
  date: Date | null;
  time: string;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string) => void;
  allowPast?: boolean;
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

  const isToday = date ? isSameDay(date, today) : false;
  const isTomorrow = date ? isSameDay(date, tomorrow) : false;

  const dateLabel = !date
    ? "Date"
    : isToday ? "Aujourd'hui"
    : isTomorrow ? "Demain"
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  useEffect(() => {
    if (!dateOpen && !timeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dateOpen && !dateRef.current?.contains(e.target as Node)) setDateOpen(false);
      if (timeOpen && !timeRef.current?.contains(e.target as Node)) setTimeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDateOpen(false); setTimeOpen(false); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateOpen, timeOpen]);

  useEffect(() => {
    if (!timeOpen || !timeListRef.current || !time) return;
    const idx = TIME_SLOTS.indexOf(time);
    if (idx !== -1) timeListRef.current.scrollTop = idx * 32 - 64;
  }, [timeOpen, time]);

  const triggerCls =
    "flex h-11 w-full items-center gap-2 rounded-xl border bg-[var(--color-surface)] px-3 text-[14px] transition-[border-color,box-shadow] duration-150 border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] focus:outline-none";

  const dropdownCls =
    "absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]";

  const dropAnim = {
    initial: { opacity: 0, y: -4, scale: 0.98 as number },
    animate: { opacity: 1, y: 0, scale: 1 as number },
    exit: { opacity: 0, y: -2, scale: 0.99 as number },
    transition: { duration: 0.14, ease: EASE },
  };

  const itemCls = "flex h-9 w-full items-center px-3 text-[13px] transition-colors duration-75";
  const itemActive = "bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] font-semibold text-[var(--color-brand)]";
  const itemDefault = "text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]";

  return (
    <div className="flex gap-2">
      {/* Date */}
      <div ref={dateRef} className="relative flex-1">
        <button type="button" onClick={() => setDateOpen((v) => !v)} className={triggerCls} aria-expanded={dateOpen}>
          <CalendarIcon size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
          <span className={["flex-1 text-left", date ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"].join(" ")}>
            {dateLabel}
          </span>
          <ChevronDown size={13} strokeWidth={2} className="shrink-0 text-[var(--color-muted)]" />
        </button>

        <AnimatePresence>
          {dateOpen ? (
            <motion.div {...dropAnim} className={dropdownCls}>
              <button type="button" onClick={() => { onDateChange(today); setDateOpen(false); setShowCalendar(false); }}
                className={[itemCls, isToday ? itemActive : itemDefault].join(" ")}>
                Aujourd&apos;hui
              </button>
              <button type="button" onClick={() => { onDateChange(tomorrow); setDateOpen(false); setShowCalendar(false); }}
                className={[itemCls, isTomorrow ? itemActive : itemDefault].join(" ")}>
                Demain
              </button>
              <button type="button" onClick={() => setShowCalendar((v) => !v)}
                className={[itemCls, itemDefault].join(" ")}>
                <CalendarIcon size={13} strokeWidth={1.85} className="mr-2 text-[var(--color-muted)]" />
                Choisir une date…
              </button>
              <AnimatePresence>
                {showCalendar ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="overflow-hidden border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)]"
                  >
                    <CalendarGrid
                      selected={date}
                      allowPast={allowPast}
                      onSelect={(d) => { onDateChange(d); setDateOpen(false); setShowCalendar(false); }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Time */}
      <div ref={timeRef} className="relative w-[120px]">
        <button type="button" onClick={() => setTimeOpen((v) => !v)} className={triggerCls} aria-expanded={timeOpen}>
          <Clock size={14} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" />
          <span className={["flex-1 text-[13px]", time ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"].join(" ")}>
            {time || "Heure"}
          </span>
        </button>

        <AnimatePresence>
          {timeOpen ? (
            <motion.div
              role="listbox"
              {...dropAnim}
              className={[dropdownCls, "max-h-[240px] overflow-y-auto"].join(" ")}
              ref={timeListRef}
            >
              {TIME_SLOTS.map((slot) => (
                <button key={slot} type="button" role="option" aria-selected={slot === time}
                  onClick={() => { onTimeChange(slot); setTimeOpen(false); }}
                  className={[
                    "flex h-8 w-full items-center px-3 text-[13px] transition-colors duration-75",
                    slot === time ? itemActive : itemDefault,
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

// ─── Form-compatible field wrappers ───────────────────────────────────────────

/** DatePickerField: renders DatePicker + hidden input named `name` (YYYY-MM-DD). */
export function DatePickerField({
  name,
  defaultValue,
  allowPast = false,
  placeholder,
}: {
  name: string;
  defaultValue?: string | null;
  allowPast?: boolean;
  placeholder?: string;
}) {
  const [date, setDate] = useState<Date | null>(() => parseDateString(defaultValue));
  return (
    <>
      <DatePicker value={date} onChange={setDate} allowPast={allowPast} placeholder={placeholder} />
      <input type="hidden" name={name} value={formatDateString(date)} />
    </>
  );
}

/** TimePickerField: renders TimePicker + hidden input named `name` (HH:MM). */
export function TimePickerField({
  name,
  defaultValue = "",
  placeholder,
  size,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  size?: "default" | "sm";
}) {
  const [time, setTime] = useState(defaultValue);
  return (
    <>
      <TimePicker value={time} onChange={setTime} placeholder={placeholder} size={size} />
      <input type="hidden" name={name} value={time} />
    </>
  );
}

/** DateTimePickerField: renders CompactDateTimePicker + hidden input named `name` (ISO string). */
export function DateTimePickerField({
  name,
  defaultValue,
  allowPast = false,
}: {
  name: string;
  defaultValue?: string | null;
  allowPast?: boolean;
}) {
  const parsed = parseDateTimeLocal(defaultValue);
  const [date, setDate] = useState<Date | null>(parsed.date);
  const [time, setTime] = useState(parsed.time);

  const isoValue = (() => {
    if (!date || !time) return "";
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  })();

  return (
    <>
      <CompactDateTimePicker
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
        allowPast={allowPast}
      />
      <input type="hidden" name={name} value={isoValue} />
    </>
  );
}
