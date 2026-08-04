"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTemplateSignatureHours } from "../actions";
import {
  SIGNATURE_TIMEZONES,
  WEEKDAY_LABELS_FR,
  type SignatureHoursConfig,
} from "@/lib/templates";
import { PendingSubmitButton } from "../../pending-submit-button";
import { TimePickerField } from "@/components/ui/datetime-picker";

const selectClass =
  "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-sm shadow-[var(--elev-1)] outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] focus:shadow-[var(--elev-2)]";

const inputClass = selectClass;

const submitClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[13px] font-medium shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,opacity] duration-200 hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] disabled:pointer-events-none disabled:opacity-65";

export function SignatureHoursSettings({
  templateId,
  initial,
  onSaved,
}: {
  templateId: string;
  initial: SignatureHoursConfig;
  onSaved?: (config: SignatureHoursConfig) => void;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [days, setDays] = useState<number[]>(initial.days);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function handleAction(formData: FormData) {
    setError(null);
    const result = await updateTemplateSignatureHours(formData);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved?.(result.config);
    router.refresh();
  }

  return (
    <form action={handleAction} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="id" value={templateId} />
      <input type="hidden" name="days" value={days.join(",")} />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_30%,var(--color-background))] px-3.5 py-3">
        <input
          type="checkbox"
          name="enabled"
          value="1"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium tracking-tight">
            Activer les horaires automatiques
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-[var(--color-muted)]">
            En dehors de ces plages, le lien public n&apos;accepte plus de
            signatures — sans que vous ayez à ouvrir Paova. La décharge reste
            « ouverte » ; seuls les horaires bloquent temporairement.
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signature_timezone" className="text-[13px] font-medium">
              Fuseau horaire
            </label>
            <select
              id="signature_timezone"
              name="timezone"
              defaultValue={initial.timezone}
              className={selectClass}
              required
            >
              {SIGNATURE_TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
              {!SIGNATURE_TIMEZONES.some((tz) => tz.id === initial.timezone) ? (
                <option value={initial.timezone}>{initial.timezone}</option>
              ) : null}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signature_hours_start" className="text-[13px] font-medium">
                Ouverture
              </label>
              <TimePickerField
                name="start"
                defaultValue={initial.start ?? "09:00"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signature_hours_end" className="text-[13px] font-medium">
                Fermeture
              </label>
              <TimePickerField
                name="end"
                defaultValue={initial.end ?? "19:00"}
              />
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
            Si la fermeture est avant l&apos;ouverture (ex. 22h → 2h), la plage
            chevauche minuit.
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[13px] font-medium">Jours actifs</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS_FR.map((w) => {
                const on = days.includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    onClick={() => toggleDay(w.day)}
                    aria-pressed={on}
                    className={`inline-flex h-8 min-w-10 items-center justify-center rounded-lg border px-2 text-[12px] font-medium transition-[background-color,border-color,color] ${
                      on
                        ? "border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
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
          idle="Enregistrer les horaires"
          pendingLabel="Enregistrement…"
        />
      </div>
    </form>
  );
}
