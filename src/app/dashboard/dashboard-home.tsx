"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type {
  DashboardAttentionItem,
  DashboardGroupRow,
  DashboardListView,
} from "@/lib/dashboard/types";
import { DashboardAttention } from "./dashboard-activity-slot";
import { DashboardViewToggle } from "./dashboard-view-toggle";
import {
  DashboardWaiversSection,
  type DashboardWaiverRow,
} from "./dashboard-waivers-section";
import { DashboardGroupsSection } from "./dashboard-groups-section";
import { DashboardEntrance } from "./dashboard-entrance";

function SignaturesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function matchesQuery(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

/**
 * Client shell below the business hero. Search + active/archived toggle
 * live in one toolbar; lists stay as two clear sections.
 */
export function DashboardHome({
  attentionItems,
  active,
  archived,
  groups,
  archivedGroups,
  initialView,
  appUrl,
  signatureCountByTemplate,
  lastSignedByTemplate,
  canManageGroups,
}: {
  attentionItems: DashboardAttentionItem[];
  active: DashboardWaiverRow[];
  archived: DashboardWaiverRow[];
  groups: DashboardGroupRow[];
  archivedGroups: DashboardGroupRow[];
  initialView: DashboardListView;
  appUrl: string;
  signatureCountByTemplate: Record<string, number>;
  lastSignedByTemplate: Record<string, string>;
  canManageGroups: boolean;
}) {
  const [listView, setListView] = useState<DashboardListView>(initialView);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setListView(initialView);
    setQuery("");
  }, [initialView]);

  function changeListView(next: DashboardListView) {
    if (next === listView) return;
    setListView(next);
    setQuery("");
    const url = next === "archived" ? "/dashboard?view=archived" : "/dashboard";
    window.history.replaceState(null, "", url);
  }

  const showArchived = listView === "archived";
  const q = query.trim().toLowerCase();

  const filteredActive = useMemo(
    () => active.filter((t) => matchesQuery(t.title, q)),
    [active, q],
  );
  const filteredArchived = useMemo(
    () => archived.filter((t) => matchesQuery(t.title, q)),
    [archived, q],
  );
  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          matchesQuery(g.name, q) || matchesQuery(g.template_title, q),
      ),
    [groups, q],
  );
  const filteredArchivedGroups = useMemo(
    () =>
      archivedGroups.filter(
        (g) =>
          matchesQuery(g.name, q) || matchesQuery(g.template_title, q),
      ),
    [archivedGroups, q],
  );

  const totalInView = showArchived
    ? archived.length + archivedGroups.length
    : active.length + groups.length;
  const showSearch = totalInView >= 3 || q.length > 0;

  const canCreateGroup = active.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {!showArchived && !q ? (
        <DashboardAttention items={attentionItems} />
      ) : null}

      <DashboardEntrance
        step={2}
        className="flex flex-col gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_22%,var(--color-background))] p-2.5 sm:p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DashboardViewToggle
            listView={listView}
            onChange={changeListView}
            activeCount={active.length + groups.length}
            archivedCount={archived.length + archivedGroups.length}
          />
          <Link
            href="/dashboard/signatures"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-3.5 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <SignaturesIcon className="text-[var(--color-brand)]" />
            Toutes les signatures
          </Link>
        </div>

        {showSearch ? (
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                showArchived
                  ? "Rechercher dans les archives…"
                  : "Rechercher une décharge ou un groupe…"
              }
              className="h-[42px] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-[13.5px] text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-muted)]/70 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
              aria-label="Rechercher"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </DashboardEntrance>

      <DashboardEntrance step={3} className="flex flex-col">
        <DashboardWaiversSection
          active={filteredActive}
          archived={filteredArchived}
          listView={listView}
          appUrl={appUrl}
          signatureCountByTemplate={signatureCountByTemplate}
          lastSignedByTemplate={lastSignedByTemplate}
          searchActive={Boolean(q)}
        />
      </DashboardEntrance>

      <div
        aria-hidden
        className="my-2 flex items-center gap-3 sm:my-3"
      >
        <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
        <span className="h-1 w-1 rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,var(--color-muted))]" />
        <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
      </div>

      <DashboardEntrance step={4} className="flex flex-col">
        <DashboardGroupsSection
          groups={filteredGroups}
          archivedGroups={filteredArchivedGroups}
          listView={listView}
          searchActive={Boolean(q)}
          appUrl={appUrl}
          canCreateGroup={canCreateGroup}
          canManageGroups={canManageGroups}
        />
      </DashboardEntrance>
    </div>
  );
}
