"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  WAIVER_DETAIL_TABS,
  waiverDetailTabHref,
  type WaiverDetailTabId,
} from "./waiver-detail-tab-ids";

export type { WaiverDetailTabId } from "./waiver-detail-tab-ids";
export { isWaiverDetailTab } from "./waiver-detail-tab-ids";

export function WaiverDetailTabs({
  templateId,
  initialTab,
  counts,
  panels,
}: {
  templateId: string;
  initialTab: WaiverDetailTabId;
  counts?: Partial<Record<WaiverDetailTabId, number>>;
  panels: Record<WaiverDetailTabId, ReactNode>;
}) {
  const [active, setActive] = useState<WaiverDetailTabId>(initialTab);

  useEffect(() => {
    setActive(initialTab);
  }, [initialTab]);

  function switchTab(next: WaiverDetailTabId) {
    if (next === active) return;
    setActive(next);
    window.history.replaceState(null, "", waiverDetailTabHref(templateId, next));
  }

  return (
    <div className="flex flex-col gap-5">
      <nav
        aria-label="Sections de la décharge"
        className="-mx-1 overflow-x-auto px-1"
      >
        <ul
          role="tablist"
          className="flex min-w-max gap-1 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface-2)] p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {WAIVER_DETAIL_TABS.map((tab) => {
            const selected = tab.id === active;
            const count = counts?.[tab.id];

            return (
              <li key={tab.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  id={`waiver-tab-${tab.id}`}
                  aria-controls={`waiver-panel-${tab.id}`}
                  onClick={() => switchTab(tab.id)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] tracking-tight transition-[background-color,color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    selected
                      ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_3px_rgba(15,23,42,0.1),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_12%,transparent)]"
                      : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {tab.label}
                  {typeof count === "number" ? (
                    <span
                      className={`tabular-nums text-[11px] ${
                        selected
                          ? "text-[var(--color-brand)]"
                          : "opacity-70"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        key={active}
        id={`waiver-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`waiver-tab-${active}`}
        className="animate-tab-panel"
      >
        {panels[active]}
      </div>
    </div>
  );
}
