import {
  TEMPLATE_STATUS_LABELS,
  type TemplateStatus,
} from "@/lib/templates";

const STYLES: Record<TemplateStatus, string> = {
  open: "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]",
  inactive:
    "bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-surface))] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_75%,transparent)]",
  expired:
    "bg-[color-mix(in_srgb,#b45309_12%,var(--color-surface))] text-[color-mix(in_srgb,#92400e_90%,var(--color-foreground))] ring-1 ring-[color-mix(in_srgb,#b45309_28%,transparent)] dark:bg-[color-mix(in_srgb,#fbbf24_10%,var(--color-surface))] dark:text-[color-mix(in_srgb,#fbbf24_85%,var(--color-muted))] dark:ring-[color-mix(in_srgb,#fbbf24_28%,transparent)]",
  archived:
    "bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-surface))] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_75%,transparent)]",
};

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium leading-4 tracking-[0.01em] ${STYLES[status]} ${className}`}
    >
      {showDot && status === "open" ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]"
          style={{
            boxShadow:
              "0 0 0 3px color-mix(in srgb, var(--color-brand) 22%, transparent)",
          }}
          aria-hidden
        />
      ) : null}
      {TEMPLATE_STATUS_LABELS[status]}
    </span>
  );
}
