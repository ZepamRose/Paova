"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRAND_FONTS, type BrandFontId } from "@/lib/brand-fonts";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Premium font picker — curated list only.
 * Loads Google Fonts for live sample rendering in the dashboard.
 */
export function FontPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: BrandFontId;
  onChange: (id: BrandFontId) => void;
}) {
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?${BRAND_FONTS.map(
      (f) => `family=${f.google}`,
    ).join("&")}&display=swap`;

    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-paova-brand-fonts="picker"]',
    );
    if (existing) {
      existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.paovaBrandFonts = "picker";
    document.head.appendChild(link);
  }, []);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label="Typographie de la marque"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {BRAND_FONTS.map((font) => {
          const selected = font.id === value;
          return (
            <button
              key={font.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(font.id)}
              className={`group flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99] ${
                selected
                  ? "border-[color-mix(in_srgb,var(--color-brand)_48%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_70%,var(--color-surface))] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_45%,var(--color-muted))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-1)]"
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
                    {font.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[var(--color-muted)]">
                    {font.blurb}
                  </span>
                </span>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color,transform] duration-[200ms] ${
                    selected
                      ? "scale-105 border-[var(--color-brand)] bg-[var(--color-brand)]"
                      : "border-[var(--color-border)] bg-transparent group-hover:border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]"
                  }`}
                  aria-hidden
                >
                  {selected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-on-brand)]" />
                  ) : null}
                </span>
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={selected ? `${font.id}-on` : font.id}
                  initial={reduced ? false : { opacity: 0.75, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="mt-0.5 text-[1.35rem] leading-none tracking-tight text-[var(--color-foreground)]/90"
                  style={{ fontFamily: font.family }}
                >
                  AaBbCc
                </motion.span>
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </div>
  );
}
