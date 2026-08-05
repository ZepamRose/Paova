"use client";

import { Check } from "lucide-react";
import { TemplateCombobox } from "./template-combobox";
import { cn } from "@/lib/utils";

type TemplateChoice = {
  id: string;
  title: string;
  fieldLabels?: string[];
};

export function SmartWaiverSelector({
  choices,
  value,
  onChange,
  compact = false,
}: {
  choices: TemplateChoice[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const selected = choices.find((c) => c.id === value);

  // Si une seule décharge : affichage simple
  if (choices.length === 1) {
    const waiver = choices[0];
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border",
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
          "border-[color-mix(in_srgb,var(--color-brand)_15%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_3%,var(--color-surface))]"
        )}
      >
        <Check
          size={compact ? 12 : 13}
          strokeWidth={2.5}
          className="mt-0.5 shrink-0 text-[var(--color-brand)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", compact ? "text-[12px]" : "text-[12.5px]")}>
            {waiver.title}
          </p>
          {waiver.fieldLabels && waiver.fieldLabels.length > 0 ? (
            <p className={cn("mt-0.5 truncate text-[var(--color-muted)]", compact ? "text-[10.5px]" : "text-[11px]")}>
              {waiver.fieldLabels.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Plusieurs décharges : sélecteur complet
  return (
    <div className="flex flex-col gap-1.5">
      <TemplateCombobox
        id="template_id"
        options={choices}
        value={value}
        onChange={onChange}
      />
      {selected && selected.fieldLabels && selected.fieldLabels.length > 0 ? (
        <p className={cn("text-[var(--color-muted)]", compact ? "text-[10.5px]" : "text-[11px]")}>
          {selected.fieldLabels.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
