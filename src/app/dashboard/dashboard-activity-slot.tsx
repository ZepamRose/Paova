import Link from "next/link";
import { AlertTriangle, Clock, PartyPopper } from "lucide-react";
import type {
  DashboardAttentionItem,
  DashboardAttentionKind,
} from "@/lib/dashboard/types";

const ICON: Record<DashboardAttentionKind, typeof AlertTriangle> = {
  waiver_expiring: AlertTriangle,
  group_near_complete: Clock,
  group_complete: PartyPopper,
};

const ICON_STYLE: Record<DashboardAttentionKind, string> = {
  waiver_expiring:
    "bg-[color-mix(in_srgb,#b45309_14%,var(--color-surface))] text-[color-mix(in_srgb,#92400e_88%,var(--color-foreground))]",
  group_near_complete:
    "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)]",
  group_complete:
    "bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface))] text-[var(--color-brand)]",
};

/**
 * Priority zone — only renders when something actually needs a decision.
 * Kept compact so it never competes with the business hero above.
 */
export function DashboardAttention({
  items,
}: {
  items: DashboardAttentionItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="À traiter">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
          À traiter maintenant
        </p>
        <p className="text-[11.5px] tabular-nums text-[var(--color-muted)]">
          {items.length}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const Icon = ICON[item.kind];
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] px-3 py-2.5 shadow-[var(--elev-1)] transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ICON_STYLE[item.kind]}`}
                >
                  <Icon size={14} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--color-foreground)]">
                    {item.title}
                  </span>
                  <span className="block truncate text-[11.5px] text-[var(--color-muted)]">
                    {item.meta}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-[var(--color-muted)]/55 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)]"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
