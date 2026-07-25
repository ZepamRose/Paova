"use client";

export function SettingsToggle({
  name,
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  dense = false,
}: {
  name: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Compact row for dense grids (Stripe/Linear-style). */
  dense?: boolean;
}) {
  if (dense) {
    return (
      <label
        className={`flex min-h-[2.5rem] cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-[background-color,opacity] duration-[160ms] ${
          disabled
            ? "cursor-not-allowed opacity-55"
            : checked
              ? "bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]"
              : "hover:bg-[color-mix(in_srgb,var(--color-surface-2)_80%,transparent)]"
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block text-[13px] tracking-tight ${
              checked
                ? "font-semibold text-[var(--color-foreground)]"
                : "font-medium text-[var(--color-foreground)]/80"
            }`}
          >
            {label}
          </span>
          {hint ? (
            <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--color-muted)]">
              {hint}
            </span>
          ) : null}
        </span>
        <input type="hidden" name={name} value={checked ? "1" : "0"} />
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-[background-color,box-shadow] duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:cursor-not-allowed ${
            checked
              ? "bg-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--color-muted)_32%,var(--color-surface-2))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
            aria-hidden
          />
        </button>
      </label>
    );
  }

  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border px-4 py-3.5 transition-[border-color,background-color,box-shadow,opacity] duration-[200ms] ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-background))]"
      } ${
        checked
          ? "border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))]"
          : "border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface))]"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium tracking-tight text-[var(--color-foreground)]">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
      <input type="hidden" name={name} value={checked ? "1" : "0"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-[background-color,box-shadow] duration-[200ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:cursor-not-allowed ${
          checked
            ? "bg-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_40%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--color-muted)_22%,var(--color-surface-2))]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
          aria-hidden
        />
      </button>
    </label>
  );
}
