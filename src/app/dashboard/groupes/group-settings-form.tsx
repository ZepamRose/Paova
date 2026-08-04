"use client";

import { useState } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { updateGroupSettings } from "./actions";
import { closesOnInputValue } from "@/lib/groups/lifecycle";
import {
  DatePickerField,
  DateTimePickerField,
  parseDateString,
} from "@/components/ui/datetime-picker";

export function GroupSettingsForm({
  groupId,
  name,
  closesAt,
  startTime,
  endTime,
  durationMinutes,
  disabled,
}: {
  groupId: string;
  name: string;
  closesAt: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  disabled?: boolean;
}) {
  const field =
    "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] disabled:opacity-60";

  return (
    <form action={updateGroupSettings} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="group_id" value={groupId} />
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium tracking-tight">
          Nom de la session
        </span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={name}
          disabled={disabled}
          className={field}
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-[12px] font-medium tracking-tight">
          Date de clôture
        </span>
        <DatePickerField
          name="closes_on"
          defaultValue={closesOnInputValue(closesAt)}
          allowPast={true}
          placeholder="Pas de limite"
        />
        <span className="text-[11.5px] text-[var(--color-muted)]">
          Vide = pas de limite. Après cette date, signatures refusées.
        </span>
      </div>

      {/* V2: Session Time Fields */}
      <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] pt-3">
        <div>
          <h3 className="text-[12px] font-medium tracking-tight">
            Horaires de session{" "}
            <span className="font-normal text-[var(--color-muted)]">
              (facultatif)
            </span>
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
            Précisez les heures de début et fin pour un meilleur suivi
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium tracking-tight">
              Heure de début
            </span>
            <DateTimePickerField
              name="start_time"
              defaultValue={startTime}
              allowPast={true}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium tracking-tight">
              Heure de fin
            </span>
            <DateTimePickerField
              name="end_time"
              defaultValue={endTime}
              allowPast={true}
            />
          </div>

          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[12px] font-medium tracking-tight">
              Durée (minutes)
            </span>
            <input
              name="duration_minutes"
              type="number"
              min="1"
              step="1"
              placeholder="Ex. 90"
              defaultValue={durationMinutes ?? ""}
              disabled={disabled}
              className={field}
            />
          </label>
        </div>
      </div>

      {!disabled ? (
        <div>
          <PendingSubmitButton
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3.5 text-[13px] font-medium text-[var(--color-foreground)]/82 shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-[var(--color-surface-2)] disabled:pointer-events-none disabled:opacity-70"
            idle="Enregistrer"
            pendingLabel="Enregistrement…"
          />
        </div>
      ) : null}
    </form>
  );
}
