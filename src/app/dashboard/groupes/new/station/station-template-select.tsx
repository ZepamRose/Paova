"use client";

import { useState } from "react";
import { TemplateCombobox } from "../../template-combobox";

export function StationTemplateSelect({
  choices,
  preselected,
}: {
  choices: { id: string; title: string }[];
  preselected: { id: string; title: string } | null;
}) {
  const [selectedId, setSelectedId] = useState(preselected?.id ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="template_id" className="text-[13px] font-medium text-[var(--color-foreground)]">
        Décharge
      </label>
      <input type="hidden" name="template_id" value={selectedId} />
      <TemplateCombobox
        id="template_id"
        options={choices}
        value={selectedId}
        onChange={setSelectedId}
        placeholder="Choisir une décharge"
      />
      <span className="text-[11.5px] text-[var(--color-muted)]">
        Le formulaire que les visiteurs devront signer.
      </span>
    </div>
  );
}
