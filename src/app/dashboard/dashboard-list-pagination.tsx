"use client";

/**
 * Client-side list pager for dashboard sections.
 * Keeps the user on /dashboard — no route change, no full reload.
 */
export const DASHBOARD_PAGE_SIZE = 7;

export function DashboardListPagination({
  page,
  totalPages,
  totalItems,
  pageSize = DASHBOARD_PAGE_SIZE,
  onChange,
  label,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onChange: (page: number) => void;
  /** e.g. "décharges" / "groupes" for aria */
  label: string;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-0.5"
      role="navigation"
      aria-label={`Pagination des ${label}`}
    >
      <p className="text-[12px] tabular-nums text-[var(--color-muted)]">
        {from}–{to}
        <span className="text-[var(--color-muted)]/50"> · </span>
        {totalItems} {label}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
          className="inline-flex h-7 items-center rounded-md px-2 text-[12.5px] font-medium text-[var(--color-muted)] transition-[color,background-color,opacity] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          Préc.
        </button>

        <p
          className="min-w-[3.25rem] text-center text-[12.5px] font-medium tabular-nums tracking-tight text-[var(--color-foreground)]/80"
          aria-current="page"
          aria-label={`Page ${page} sur ${totalPages}`}
        >
          {page}
          <span className="mx-1 font-normal text-[var(--color-muted)]/45">
            /
          </span>
          {totalPages}
        </p>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
          className="inline-flex h-7 items-center rounded-md px-2 text-[12.5px] font-medium text-[var(--color-muted)] transition-[color,background-color,opacity] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          Suiv.
        </button>
      </div>
    </div>
  );
}
