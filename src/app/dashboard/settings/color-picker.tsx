"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const RECENT_KEY = "paova-brand-colors-recent";

const SAVED_COLORS = [
  "#5e926c",
  "#111827",
  "#1d4ed8",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#334155",
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return { h: 140, s: 28, l: 47 };
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "");
  return {
    r: parseInt(raw.slice(0, 2), 16) || 0,
    g: parseInt(raw.slice(2, 4), 16) || 0,
    b: parseInt(raw.slice(4, 6), 16) || 0,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function normalizeHex(value: string): string | null {
  let v = value.trim();
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    v = `#${r}${r}${g}${g}${b}${b}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c))
      .slice(0, 8);
  } catch {
    return [];
  }
}

function pushRecent(hex: string) {
  try {
    const next = [hex, ...loadRecent().filter((c) => c !== hex)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type ColorPickerProps = {
  id?: string;
  name: string;
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  /** Dense trigger for horizontal settings rows. */
  compact?: boolean;
};

export function ColorPicker({
  id,
  name,
  value,
  onChange,
  label = "Couleur principale",
  compact = false,
}: ColorPickerProps) {
  const reduced = useReducedMotion() ?? false;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const initial = hexToHsl(value || "#5e926c");
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [l, setL] = useState(initial.l);
  const [hexInput, setHexInput] = useState((value || "#5e926c").toLowerCase());
  const [rgb, setRgb] = useState(() => hexToRgb(value || "#5e926c"));

  const hex = hslToHex(h, s, l);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const next = normalizeHex(value);
    if (!next) return;
    const hsl = hexToHsl(next);
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
    setHexInput(next);
    setRgb(hexToRgb(next));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        pushRecent(hex);
        setRecent(loadRecent());
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        pushRecent(hex);
        setRecent(loadRecent());
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, hex]);

  function applyHex(next: string) {
    const hsl = hexToHsl(next);
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
    setHexInput(next);
    setRgb(hexToRgb(next));
    onChange(next);
  }

  function commit(nextH: number, nextS: number, nextL: number) {
    const next = hslToHex(nextH, nextS, nextL);
    setHexInput(next);
    setRgb(hexToRgb(next));
    onChange(next);
  }

  function onSatPointer(clientX: number, clientY: number) {
    const el = satRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextS = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const nextL = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 8, 92);
    setS(nextS);
    setL(nextL);
    commit(h, nextS, nextL);
  }

  const inputClass =
    "rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-2 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--color-brand)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_14%,transparent)]";

  return (
    <div ref={rootRef} className={`relative ${compact ? "min-w-0 flex-1" : ""}`}>
      <input type="hidden" name={name} value={hex} />

      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "group flex w-full items-center gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_70%,var(--color-surface))] px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow] duration-[160ms] hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            : "group flex w-full items-center gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[var(--color-background)] p-3 text-left shadow-[var(--elev-1)] transition-[border-color,box-shadow,transform,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] sm:p-3.5"
        }
      >
        <span
          className={
            compact
              ? "h-8 w-8 shrink-0 rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] dark:ring-white/10"
              : "h-14 w-14 shrink-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] transition-transform duration-[180ms] group-hover:scale-[1.02] dark:ring-white/10 sm:h-16 sm:w-16"
          }
          style={{ backgroundColor: hex }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={
              compact
                ? "block text-[11px] font-medium tracking-tight text-[var(--color-muted)]"
                : "block text-[12px] font-medium tracking-tight text-[var(--color-muted)]"
            }
          >
            {label}
          </span>
          <span
            className={
              compact
                ? "mt-0.5 block font-mono text-[13px] font-semibold uppercase tracking-[-0.02em] text-[var(--color-foreground)]"
                : "mt-1 block font-mono text-[1.0625rem] font-semibold uppercase tracking-[-0.02em] text-[var(--color-foreground)]"
            }
          >
            {hex}
          </span>
          {compact ? null : (
            <span className="mt-1 block font-mono text-[11px] text-[var(--color-muted)]/65">
              RGB {rgb.r}, {rgb.g}, {rgb.b}
            </span>
          )}
        </span>
        {compact ? null : (
          <span className="inline-flex h-9 shrink-0 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[color,border-color,background-color] duration-[180ms] group-hover:border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] group-hover:text-[var(--color-brand)]">
            Modifier
          </span>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Sélecteur de couleur"
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute left-0 right-0 z-40 mt-2.5 origin-top rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-3)] sm:left-0 sm:right-auto sm:w-[340px] sm:p-5"
          >
            <div
              ref={satRef}
              className="relative h-44 w-full cursor-crosshair touch-none overflow-hidden rounded-xl ring-1 ring-black/[0.06] dark:ring-white/10"
              style={{
                backgroundColor: `hsl(${h} 100% 50%)`,
                backgroundImage:
                  "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onSatPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                onSatPointer(e.clientX, e.clientY);
              }}
            >
              <span
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.28)]"
                style={{
                  left: `${s}%`,
                  top: `${100 - l}%`,
                  backgroundColor: hex,
                }}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/70">
                  Teinte
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={h}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setH(next);
                    commit(next, s, l);
                  }}
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                  }}
                  aria-label="Teinte"
                />
              </label>

              <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]/70">
                    Hex
                  </span>
                  <input
                    type="text"
                    value={hexInput}
                    spellCheck={false}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setHexInput(raw);
                      const next = normalizeHex(raw);
                      if (next) applyHex(next);
                    }}
                    onBlur={() => setHexInput(hex)}
                    className={`${inputClass} uppercase`}
                  />
                </label>
                {(["r", "g", "b"] as const).map((channel) => (
                  <label key={channel} className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]/70">
                      {channel}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb[channel]}
                      onChange={(e) => {
                        const nextRgb = {
                          ...rgb,
                          [channel]: clamp(Number(e.target.value) || 0, 0, 255),
                        };
                        setRgb(nextRgb);
                        applyHex(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
                      }}
                      className={inputClass}
                      aria-label={channel.toUpperCase()}
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/70">
                  Couleurs enregistrées
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAVED_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Choisir ${c}`}
                      onClick={() => applyHex(c)}
                      className={`h-7 w-7 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                        hex === c
                          ? "ring-2 ring-[var(--color-foreground)] ring-offset-2 ring-offset-[var(--color-surface)]"
                          : "ring-1 ring-black/10 dark:ring-white/15"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {recent.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/70">
                    Récemment utilisées
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Choisir ${c}`}
                        onClick={() => applyHex(c)}
                        className={`h-7 w-7 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                          hex === c
                            ? "ring-2 ring-[var(--color-foreground)] ring-offset-2 ring-offset-[var(--color-surface)]"
                            : "ring-1 ring-black/10 dark:ring-white/15"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
