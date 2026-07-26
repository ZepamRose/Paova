"use client";

import { switchActiveBusiness } from "./switch-business-action";

type Option = {
  businessId: string;
  name: string;
  role: string;
};

/**
 * Compact tenant switcher shown when the user belongs to more than one business.
 */
export function BusinessSwitcher({
  currentBusinessId,
  options,
}: {
  currentBusinessId: string;
  options: Option[];
}) {
  if (options.length < 2) return null;

  return (
    <form action={switchActiveBusiness} className="min-w-0">
      <label className="sr-only" htmlFor="paova-business-switcher">
        Établissement actif
      </label>
      <select
        id="paova-business-switcher"
        name="business_id"
        defaultValue={currentBusinessId}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
        className="max-w-[11rem] truncate rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] px-2 py-1.5 text-[12px] font-medium text-[var(--color-foreground)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] sm:max-w-[14rem]"
      >
        {options.map((opt) => (
          <option key={opt.businessId} value={opt.businessId}>
            {opt.name}
          </option>
        ))}
      </select>
    </form>
  );
}
