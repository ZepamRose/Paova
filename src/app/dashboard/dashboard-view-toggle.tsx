"use client";

import type { DashboardListView } from "@/lib/dashboard/types";

const motionCls = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function DashboardViewToggle({
  listView,
  onChange,
  activeCount,
  archivedCount,
}: {
  listView: DashboardListView;
  onChange: (next: DashboardListView) => void;
  activeCount: number;
  archivedCount: number;
}) {
  const showArchived = listView === "archived";

  const tabClass = (on: boolean) =>
    `min-h-11 rounded-lg px-3 py-1 text-[12px] transition-[color,background-color,box-shadow,transform] ${motionCls} sm:min-h-0 sm:rounded-md sm:px-2.5 ${
      on
        ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_3px_rgba(15,23,42,0.1),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
        : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] hover:text-[var(--color-foreground)]"
    }`;

  return (
    <div
      role="tablist"
      aria-label="Actives ou archivées"
      className="flex items-center gap-0.5 rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] p-0.5 ring-1 ring-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!showArchived}
        onClick={() => onChange("active")}
        className={tabClass(!showArchived)}
      >
        Actives
        {activeCount > 0 ? (
          <span className="ml-1 tabular-nums opacity-70">{activeCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={showArchived}
        onClick={() => onChange("archived")}
        className={tabClass(showArchived)}
      >
        Archivées
        {archivedCount > 0 ? (
          <span className="ml-1 tabular-nums opacity-70">{archivedCount}</span>
        ) : null}
      </button>
    </div>
  );
}
