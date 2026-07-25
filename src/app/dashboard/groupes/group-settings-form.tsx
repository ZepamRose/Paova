"use client";

import { PendingSubmitButton } from "../pending-submit-button";
import { updateGroupSettings } from "./actions";
import { closesOnInputValue } from "@/lib/groups/lifecycle";

export function GroupSettingsForm({
  groupId,
  name,
  closesAt,
  disabled,
}: {
  groupId: string;
  name: string;
  closesAt: string | null;
  disabled?: boolean;
}) {
  const field =
    "h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] disabled:opacity-60";

  return (
    <form action={updateGroupSettings} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="group_id" value={groupId} />
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium tracking-tight">
          Nom du groupe
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
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium tracking-tight">
          Date de clôture
        </span>
        <input
          name="closes_on"
          type="date"
          defaultValue={closesOnInputValue(closesAt)}
          disabled={disabled}
          className={`${field} max-w-xs`}
        />
        <span className="text-[11.5px] text-[var(--color-muted)]">
          Vide = pas de limite. Après cette date, signatures refusées.
        </span>
      </label>
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
