"use client";

import { useEffect } from "react";
import { BRAND_FONTS, type BrandFontId } from "@/lib/brand-fonts";

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
              className={`group flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                selected
                  ? "border-[color-mix(in_srgb,var(--color-brand)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_70%,var(--color-surface))] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-1)]"
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
                  {font.label}
                </span>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-[160ms] ${
                    selected
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]"
                      : "border-[var(--color-border)] bg-transparent"
                  }`}
                  aria-hidden
                >
                  {selected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-on-brand)]" />
                  ) : null}
                </span>
              </span>
              <span
                className="text-[1.35rem] leading-none tracking-tight text-[var(--color-foreground)]/90"
                style={{ fontFamily: font.family }}
              >
                AaBbCc
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
