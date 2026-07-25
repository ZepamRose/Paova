"use client";

import type { BrandButtonRadius } from "@/lib/branding";

const OPTIONS: {
  id: BrandButtonRadius;
  label: string;
  hint: string;
  previewClass: string;
}[] = [
  {
    id: "soft",
    label: "Coins arrondis",
    hint: "Boutons plus doux",
    previewClass: "rounded-xl",
  },
  {
    id: "square",
    label: "Coins carrés",
    hint: "Boutons plus nets",
    previewClass: "rounded-md",
  },
];

export function ButtonRadiusPicker({
  name,
  value,
  onChange,
  color,
}: {
  name: string;
  value: BrandButtonRadius;
  onChange: (next: BrandButtonRadius) => void;
  color: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-sm font-medium tracking-tight">
        Style des boutons
      </legend>
      <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
        Forme des boutons sur vos pages publiques.
      </p>
      <input type="hidden" name={name} value={value} />
      <div
        className="grid grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label="Style des boutons"
      >
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={`flex flex-col items-start gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,box-shadow,background-color,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99] ${
                selected
                  ? "border-[color-mix(in_srgb,var(--color-brand)_48%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-background)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:shadow-[var(--elev-1)]"
              }`}
            >
              <span
                className={`inline-flex h-8 w-full max-w-[7.5rem] items-center justify-center ${option.previewClass} text-[12px] font-semibold text-white shadow-[0_4px_12px_-6px_rgba(0,0,0,0.28)] transition-transform duration-[200ms] group-hover:scale-[1.02]`}
                style={{ backgroundColor: color }}
                aria-hidden
              >
                Signer
              </span>
              <span>
                <span className="block text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-[var(--color-muted)]">
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
