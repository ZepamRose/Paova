"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const POPOVER_MARGIN = 8;
const POPOVER_WIDTH = 280;

type Placement = "top" | "bottom";

type PopoverPos = {
  top: number;
  left: number;
  width: number;
  placement: Placement;
};

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m! - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatDisplay(value: string) {
  const date = parseYmd(value);
  if (!date) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(date: Date) {
  const raw = date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildMonthCells(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - offset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Choisir une date",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const selected = useMemo(() => (value ? parseYmd(value) : null), [value]);
  const [view, setView] = useState(() => selected ?? startOfDay(new Date()));
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => (min ? parseYmd(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseYmd(max) : null), [max]);
  const cells = useMemo(() => buildMonthCells(view), [view]);
  const display = formatDisplay(value);

  useEffect(() => {
    if (!open) return;
    setView(selected ?? startOfDay(new Date()));
  }, [open, selected]);

  // Position the popover relative to the viewport (portal), so it can
  // never be clipped by an ancestor's overflow, and flips above the
  // trigger when there isn't enough room below.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function computePos(): PopoverPos {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      const width = Math.min(
        POPOVER_WIDTH,
        window.innerWidth - POPOVER_MARGIN * 2,
      );
      if (!rect) return { top: 0, left: 0, width, placement: "bottom" };

      let left = rect.left;
      left = Math.min(left, window.innerWidth - width - POPOVER_MARGIN);
      left = Math.max(POPOVER_MARGIN, left);

      const height = popoverRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: Placement =
        height > 0 &&
        spaceBelow < height + POPOVER_MARGIN &&
        rect.top > height + POPOVER_MARGIN
          ? "top"
          : "bottom";
      const top =
        placement === "bottom"
          ? rect.bottom + POPOVER_MARGIN
          : Math.max(POPOVER_MARGIN, rect.top - height - POPOVER_MARGIN);

      return { top, left, width, placement };
    }

    setPos((prev) => prev ?? computePos());
    const raf = window.requestAnimationFrame(() => setPos(computePos()));

    function reposition() {
      setPos(computePos());
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function isDisabled(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function pick(date: Date) {
    if (isDisabled(date)) return;
    onChange(toYmd(date));
    setOpen(false);
  }

  function clear() {
    onChange("");
    setOpen(false);
  }

  function goToday() {
    if (isDisabled(today)) {
      setView(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }
    pick(today);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    }
  }

  const panel =
    open && pos ? (
      <motion.div
        ref={popoverRef}
        id={panelId}
        role="dialog"
        aria-label={`Calendrier — ${label}`}
        initial={
          reduced
            ? false
            : { opacity: 0, y: pos.placement === "bottom" ? 6 : -6, scale: 0.98 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: pos.placement === "bottom" ? 4 : -4, scale: 0.98 }
        }
        transition={{ duration: 0.16, ease: EASE }}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
        }}
        className="z-[999] origin-top rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,var(--color-foreground))] bg-[var(--color-surface)] p-3 shadow-[var(--elev-3)]"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-foreground)_12%,transparent)] to-transparent"
          aria-hidden
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setView((v) => addMonths(v, -1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} strokeWidth={1.9} aria-hidden />
          </button>
          <p className="text-[13.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {monthLabel(view)}
          </p>
          <button
            type="button"
            onClick={() => setView((v) => addMonths(v, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((day, i) => (
            <span
              key={`${day}-${i}`}
              className="flex h-7 items-center justify-center text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]"
            >
              {day}
            </span>
          ))}

          {cells.map((date) => {
            const inMonth = date.getMonth() === view.getMonth();
            const isSelected = selected ? sameDay(date, selected) : false;
            const isToday = sameDay(date, today);
            const disabled = isDisabled(date);

            return (
              <button
                key={toYmd(date)}
                type="button"
                disabled={disabled}
                onClick={() => pick(date)}
                aria-label={date.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                aria-pressed={isSelected}
                className={`relative flex h-8 items-center justify-center rounded-lg text-[12.5px] tabular-nums transition-[background-color,color,box-shadow] duration-150 ${
                  isSelected
                    ? "bg-[var(--color-brand)] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                    : disabled
                      ? "cursor-not-allowed text-[var(--color-muted)]/30"
                      : inMonth
                        ? "font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                        : "text-[var(--color-muted)]/65 hover:bg-[var(--color-surface-2)]/70 hover:text-[var(--color-muted)]"
                } ${
                  isToday && !isSelected
                    ? "ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-brand)_45%,var(--color-border))]"
                    : ""
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] pt-2.5">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-[var(--color-brand)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]"
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!value}
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-35"
          >
            Effacer
          </button>
        </div>
      </motion.div>
    ) : null;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-[var(--color-muted)]">
        {label}
      </span>

      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKeyDown}
          className={`group flex h-9 w-full items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface-2)]/45 text-left shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-foreground)_5%,transparent),var(--elev-1)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_45%,var(--color-muted))] focus-visible:border-[color-mix(in_srgb,var(--color-brand)_42%,var(--color-border))] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_12%,transparent),var(--elev-1)] ${
            value ? "pl-2.5 pr-9" : "px-2.5"
          }`}
        >
          <CalendarDays
            size={14}
            strokeWidth={1.85}
            className="shrink-0 text-[var(--color-muted)] transition-colors duration-150 group-hover:text-[var(--color-foreground)]"
            aria-hidden
          />
          <span
            className={`min-w-0 flex-1 truncate text-[13px] ${
              display
                ? "font-medium text-[var(--color-foreground)]"
                : "text-[var(--color-muted)]/85"
            }`}
          >
            {display ?? placeholder}
          </span>
        </button>

        {value ? (
          <button
            type="button"
            aria-label="Effacer la date"
            onClick={clear}
            className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
          >
            <X size={13} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {typeof document !== "undefined"
        ? createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)
        : null}
    </div>
  );
}
