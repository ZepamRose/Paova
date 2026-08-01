"use client";

import { Check } from "lucide-react";
import { TemplateCombobox } from "./template-combobox";

type TemplateChoice = {
  id: string;
  title: string;
  fieldLabels?: string[];
};

export function SmartWaiverSelector({
  choices,
  value,
  onChange,
}: {
  choices: TemplateChoice[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = choices.find((c) => c.id === value);

  // Si une seule décharge : affichage simple
  if (choices.length === 1) {
    const waiver = choices[0];
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] px-3.5 py-2.5">
        <Check
          size={16}
          strokeWidth={2.2}
          className="mt-0.5 shrink-0 text-[var(--color-brand)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--color-foreground)]">
            {waiver.title}
          </p>
          {waiver.fieldLabels && waiver.fieldLabels.length > 0 ? (
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">
              {waiver.fieldLabels.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Plusieurs décharges : sélecteur complet
  return (
    <div className="flex flex-col gap-2">
      <TemplateCombobox
        id="template_id"
        options={choices}
        value={value}
        onChange={onChange}
      />
      {selected && selected.fieldLabels && selected.fieldLabels.length > 0 ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          {selected.fieldLabels.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
