"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateTemplateExpiration,
  type UpdateExpirationResult,
} from "../actions";
import type { ExpirationMode } from "@/lib/templates";
import { PendingSubmitButton } from "../../pending-submit-button";

const selectClass =
  "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-sm shadow-[var(--elev-1)] outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] focus:shadow-[var(--elev-2)]";

const inputClass = selectClass;

const submitClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[13px] font-medium shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,opacity] duration-200 hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] disabled:pointer-events-none disabled:opacity-65";

export type ExpirationSavedPayload = Extract<
  UpdateExpirationResult,
  { ok: true }
>;

export function ExpirationSettings({
  templateId,
  initialMode,
  initialDays,
  initialExpiresAt,
  onSaved,
}: {
  templateId: string;
  initialMode: ExpirationMode;
  initialDays: number | null;
  initialExpiresAt: string | null;
  onSaved?: (payload: ExpirationSavedPayload) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ExpirationMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const initialDate = initialExpiresAt
    ? initialExpiresAt.slice(0, 10)
    : "";

  async function handleAction(formData: FormData) {
    setError(null);
    const result = await updateTemplateExpiration(formData);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved?.(result);
    router.refresh();
  }

  return (
    <form action={handleAction} className="mt-4 flex flex-col gap-3.5">
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

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[color-mix(in_srgb,#b45309_28%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-surface))] px-3 py-2 text-[12.5px] text-[color-mix(in_srgb,#92400e_90%,var(--color-foreground))]"
        >
          {error}
        </p>
      ) : null}

      <div>
        <PendingSubmitButton
          className={submitClass}
          idle="Enregistrer l’expiration"
          pendingLabel="Enregistrement…"
        />
      </div>
    </form>
  );
}
