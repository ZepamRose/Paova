"use client";

import { useState } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { defaultExpressGroupName } from "@/lib/groups";
import { createExpressGroup } from "./actions";

type Choice = { id: string; title: string };

export function ExpressGroupForm({
  choices,
  preselectedId = "",
  action = createExpressGroup,
  submitLabel = "Lancer la session express",
  nameLabel = "Nom de la session",
  namePlaceholder,
}: {
  choices: Choice[];
  preselectedId?: string;
  action?: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  nameLabel?: string;
  namePlaceholder?: string;
}) {
  const locked = Boolean(
    preselectedId && choices.some((c) => c.id === preselectedId),
  );
  const [templateId, setTemplateId] = useState(
    locked ? preselectedId : (choices[0]?.id ?? ""),
  );
  const [name, setName] = useState(namePlaceholder || defaultExpressGroupName());

  const field =
    "h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)]">
      <input type="hidden" name="return_to" value="/dashboard/groupes" />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Décharge</span>
        {locked ? (
          <>
            <input type="hidden" name="template_id" value={templateId} />
            <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[14px]">
              {choices.find((c) => c.id === templateId)?.title ?? "Décharge"}
            </p>
          </>
        ) : (
          <select
            name="template_id"
            required
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className={field}
          >
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">
          {nameLabel}{" "}
          <span className="font-normal text-[var(--color-muted)]">
            (modifiable)
          </span>
        </span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className={field}
        />
      </label>

      <PendingSubmitButton
        className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[14px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] hover:-translate-y-px hover:brightness-[1.03] disabled:opacity-70"
        idle={submitLabel}
        pendingLabel="Création…"
      />

      <p className="text-[12.5px] leading-snug text-[var(--color-muted)]">
        Ensuite : affichez le QR à l&apos;accueil. Pas besoin d&apos;importer de
        liste.
      </p>
    </form>
  );
}
