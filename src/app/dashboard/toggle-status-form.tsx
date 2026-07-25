"use client";

import { toggleTemplateActive } from "./waivers/actions";
import { PendingSubmitButton } from "./pending-submit-button";

export function ToggleStatusForm({
  id,
  label,
  pendingLabel,
  className,
  returnTo,
}: {
  id: string;
  label: string;
  pendingLabel: string;
  className?: string;
  /** After restore from dashboard archived list, go back to active list. */
  returnTo?: "dashboard";
}) {
  return (
    <form action={toggleTemplateActive}>
      <input type="hidden" name="id" value={id} />
      {returnTo ? (
        <input type="hidden" name="return_to" value={returnTo} />
      ) : null}
      <PendingSubmitButton
        className={className}
        idle={label}
        pendingLabel={pendingLabel}
      >
        <span className="whitespace-nowrap">{label}</span>
      </PendingSubmitButton>
    </form>
  );
}
