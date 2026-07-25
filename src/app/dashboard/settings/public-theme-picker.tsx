"use client";

import { Moon, Sun } from "lucide-react";
import type { PublicTheme } from "@/lib/branding";

const OPTIONS: {
  id: PublicTheme;
  label: string;
  hint: string;
  icon: typeof Sun;
}[] = [
  {
    id: "light",
    label: "Clair",
    hint: "Idéal en journée et sur borne",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Sombre",
    hint: "Ambiance plus discrète",
    icon: Moon,
  },
];

export function PublicThemePicker({
  name,
  value,
  onChange,
  compact = false,
}: {
  name: string;
  value: PublicTheme;
  onChange: (next: PublicTheme) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] font-medium tracking-tight text-[var(--color-muted)]">
          Thème pour vos clients
        </p>
        <input type="hidden" name={name} value={value} />
        <div
          className="inline-flex w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[var(--color-surface-2)] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
          role="radiogroup"
          aria-label="Mode d'affichage public"
        >
          {OPTIONS.map((option) => {
            const selected = value === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(option.id)}
                className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] transition-[background-color,color,box-shadow,font-weight] duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                  selected
                    ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
                    : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <Icon size={14} strokeWidth={1.85} aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-sm font-medium tracking-tight">
        Mode d&apos;affichage
      </legend>
      <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
        Appliqué uniquement à vos pages de signature et de remerciement.
      </p>
      <input type="hidden" name={name} value={value} />
      <div
        className="grid grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label="Mode d'affichage public"
      >
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;
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
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  option.id === "dark"
                    ? "bg-[#141b26] text-[#e5e7eb]"
                    : "bg-[#f5f6f8] text-[#0a0a0a]"
                } shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]`}
                aria-hidden
              >
                <Icon size={16} strokeWidth={1.85} />
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
