import {
  TEMPLATE_STATUS_LABELS,
  type TemplateStatus,
} from "@/lib/templates";

const STYLES: Record<TemplateStatus, string> = {
  open: "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_8%,transparent)]",
  inactive:
    "bg-[color-mix(in_srgb,var(--color-foreground)_6%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-foreground)_62%,var(--color-muted))] ring-1 ring-[color-mix(in_srgb,var(--color-border)_70%,transparent)]",
  expired:
    "bg-[color-mix(in_srgb,#b45309_12%,var(--color-surface))] text-[color-mix(in_srgb,#92400e_92%,var(--color-foreground))] ring-1 ring-[color-mix(in_srgb,#b45309_28%,transparent)] dark:bg-[color-mix(in_srgb,#fbbf24_12%,var(--color-surface))] dark:text-[color-mix(in_srgb,#fbbf24_88%,var(--color-muted))] dark:ring-[color-mix(in_srgb,#fbbf24_28%,transparent)]",
  archived:
    "bg-[color-mix(in_srgb,var(--color-surface-2)_88%,var(--color-surface))] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_70%,transparent)]",
};

function StatusIcon({ status }: { status: TemplateStatus }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "opacity-85",
  };

  switch (status) {
    case "open":
      return (
        <span
          className="relative inline-flex h-1.5 w-1.5 shrink-0 items-center justify-center"
          aria-hidden
        >
          <span className="absolute inset-0 rounded-full bg-[var(--color-brand)]" />
          <span className="animate-status-dot absolute inset-0 rounded-full bg-[var(--color-brand)] opacity-40" />
        </span>
      );
    case "inactive":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12h6" />
        </svg>
      );
    case "expired":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "archived":
      return (
        <svg {...common}>
          <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
          <path d="M3 5h18v3H3z" />
          <path d="M10 12h4" />
        </svg>
      );
  }
}

export function StatusBadge({
  status,
  className = "",
  showDot = true,
}: {
  status: TemplateStatus;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.01em] ${STYLES[status]} ${className}`}
    >
      {showDot ? <StatusIcon status={status} /> : null}
      {TEMPLATE_STATUS_LABELS[status]}
    </span>
  );
}

/** Secondary schedule note — informs without competing with StatusBadge. */
export function OutsideHoursBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium leading-none tracking-tight text-[var(--color-muted)] ${className}`}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="opacity-70"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      Hors horaires
    </span>
  );
}
