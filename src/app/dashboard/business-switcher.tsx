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
  fullWidth = false,
}: {
  currentBusinessId: string;
  options: Option[];
  fullWidth?: boolean;
}) {
  if (options.length < 2) return null;

  return (
    <form action={switchActiveBusiness} className={fullWidth ? "w-full" : "min-w-0"}>
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
        className={`${fullWidth ? "h-11 w-full max-w-none px-3 text-[13px]" : "max-w-[11rem] px-2 py-1.5 text-[12px] sm:max-w-[14rem]"} truncate rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] font-medium text-[var(--color-foreground)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
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
