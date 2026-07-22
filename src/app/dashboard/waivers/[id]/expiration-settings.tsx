"use client";

import { useState } from "react";
import { updateTemplateExpiration } from "../actions";
import type { ExpirationMode } from "@/lib/templates";

const selectClass =
  "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-sm shadow-[var(--elev-1)] outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] focus:shadow-[var(--elev-2)]";

const inputClass = selectClass;

export function ExpirationSettings({
  templateId,
  initialMode,
  initialDays,
  initialExpiresAt,
}: {
  templateId: string;
  initialMode: ExpirationMode;
  initialDays: number | null;
  initialExpiresAt: string | null;
}) {
  const [mode, setMode] = useState<ExpirationMode>(initialMode);
  const initialDate = initialExpiresAt
    ? initialExpiresAt.slice(0, 10)
    : "";

  return (
    <form action={updateTemplateExpiration} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="id" value={templateId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="expiration_mode" className="text-[13px] font-medium">
          Expiration
        </label>
        <select
          id="expiration_mode"
          name="expiration_mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as ExpirationMode)}
          className={selectClass}
        >
          <option value="none">Aucune expiration</option>
          <option value="relative_days">Après un nombre de jours</option>
          <option value="absolute_date">À une date précise</option>
        </select>
      </div>

      {mode === "relative_days" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiration_days" className="text-[13px] font-medium">
            Nombre de jours
          </label>
          <input
            id="expiration_days"
            name="expiration_days"
            type="number"
            min={1}
            max={3650}
            defaultValue={initialDays ?? 30}
            required
            className={inputClass}
          />
          <p className="text-[12px] text-[var(--color-muted)]">
            Le délai repart à chaque réactivation de la décharge.
          </p>
        </div>
      ) : null}

      {mode === "absolute_date" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expires_on" className="text-[13px] font-medium">
            Date d&apos;expiration
          </label>
          <input
            id="expires_on"
            name="expires_on"
            type="date"
            defaultValue={initialDate}
            required
            className={inputClass}
          />
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-4 text-sm font-medium shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)]"
        >
          Enregistrer l&apos;expiration
        </button>
      </div>
    </form>
  );
}
