"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ToggleOption<T> = {
  value: T;
  label: string;
};

export function CompactToggle<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex h-8 w-full items-stretch rounded-lg border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] font-medium transition-all duration-150",
            value === opt.value
              ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-sm"
              : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]/50 hover:text-[var(--color-foreground)]"
          )}
        >
          {value === opt.value && <Check size={12} strokeWidth={2.5} aria-hidden />}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
