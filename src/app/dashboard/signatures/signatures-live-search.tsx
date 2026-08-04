"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileText,
  Search,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLiveSubmissionsRefresh } from "@/lib/use-live-submissions-refresh";
import { GROUP_FILTER_ANY, GROUP_FILTER_NONE } from "@/lib/search";
import { GroupIcon } from "@/components/groups/group-icon";
import { ExportCsvButton } from "../waivers/[id]/export-csv-button";
import { DateField } from "./date-field";
import { GroupCombobox } from "./group-combobox";
import {
  SignaturesResults,
  type SignatureResultRow,
} from "./signatures-results";

const EASE = [0.22, 1, 0.36, 1] as const;

const inputClass =
  "h-9 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--color-border)_42%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-foreground)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-foreground)_5%,transparent),var(--elev-1)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--color-muted)]/72 hover:border-[color-mix(in_srgb,var(--color-border)_30%,var(--color-muted))] focus:border-[color-mix(in_srgb,var(--color-brand)_42%,var(--color-border))] focus:bg-[var(--color-surface)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_12%,transparent),var(--elev-1)]";

const segmentTrack =
  "inline-flex rounded-[10px] border border-[color-mix(in_srgb,var(--color-border)_42%,var(--color-foreground))] bg-[var(--color-surface-2)] p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.045)]";

function segmentBtn(selected: boolean) {
  return `rounded-[8px] px-2 py-[5px] text-[12px] transition-[background-color,color,box-shadow,transform] duration-150 ${
    selected
      ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.07),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_7%,transparent)]"
      : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] hover:text-[var(--color-foreground)]"
  }`;
}

const DEBOUNCE_MS = 280;
const PAGE_SIZE = 20;

type TemplateOption = { id: string; title: string };
type GroupOption = {
  id: string;
  name: string;
  templateId: string | null;
  status?: string;
};

export type SortId = "date_desc" | "date_asc" | "name_asc" | "name_desc";

type Filters = {
  q: string;
  template: string | null;
  group: string;
  from: string;
  to: string;
  status: string;
};

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "date_desc", label: "Plus récentes" },
  { id: "date_asc", label: "Plus anciennes" },
  { id: "name_asc", label: "A → Z" },
  { id: "name_desc", label: "Z → A" },
];

type GroupScope = "all" | "groups" | "individual";

const GROUP_SCOPE_OPTIONS: { id: GroupScope; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "groups", label: "Groupes" },
  { id: "individual", label: "Individuelles" },
];

function groupScopeFromValue(value: string): GroupScope {
  if (value === GROUP_FILTER_NONE) return "individual";
  if (value) return "groups";
  return "all";
}

type Overview = {
  totalSignatures: number;
  totalTemplates: number;
  totalGroups: number;
  lastSignedAt: string | null;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function groupOfLockedTemplateLabel(
  group: GroupOption,
  templates: TemplateOption[],
): string {
  return (
    templates.find((t) => t.id === group.templateId)?.title ?? "cette décharge"
  );
}

function isSortId(value: string | null | undefined): value is SortId {
  return (
    value === "date_desc" ||
    value === "date_asc" ||
    value === "name_asc" ||
    value === "name_desc"
  );
}

function buildQuery(
  filters: Filters,
  sort: SortId,
  page: number,
  scope: PeriodScope,
) {
  const qs = new URLSearchParams();
  if (filters.q.trim()) qs.set("q", filters.q.trim());
  if (filters.template) qs.set("template", filters.template);
  if (filters.group) qs.set("group", filters.group);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.status && filters.status !== "signed") {
    qs.set("status", filters.status);
  }
  if (sort !== "date_desc") qs.set("sort", sort);
  if (scope !== "all") qs.set("scope", scope);
  if (page > 1) qs.set("page", String(page));
  return qs;
}

function buildExportHref(filters: Filters, scope: PeriodScope) {
  const qs = new URLSearchParams();
  if (filters.q.trim()) qs.set("q", filters.q.trim());
  if (filters.template) qs.set("template", filters.template);
  if (filters.group) qs.set("group", filters.group);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  qs.set("status", filters.status || "signed");
  if (scope !== "all") qs.set("scope", scope);
  const s = qs.toString();
  return `/dashboard/signatures/export${s ? `?${s}` : ""}`;
}

function buildExportLabel(
  count: number,
  groupScope: GroupScope,
  lockedGroup: GroupOption | null,
): string {
  const noun = count === 1 ? "signature" : "signatures";
  if (lockedGroup) {
    return `Exporter ${count} ${noun} · ${lockedGroup.name}`;
  }
  if (groupScope === "groups") {
    return `Exporter ${count} ${noun} · tous les groupes`;
  }
  if (groupScope === "individual") {
    return `Exporter ${count} ${noun} · hors groupe`;
  }
  return `Exporter ${count} ${noun}`;
}

function sortRows(rows: SignatureResultRow[], sort: SortId) {
  const next = [...rows];
  next.sort((a, b) => {
    if (sort === "date_desc" || sort === "date_asc") {
      const ta = new Date(a.signedAt).getTime();
      const tb = new Date(b.signedAt).getTime();
      return sort === "date_desc" ? tb - ta : ta - tb;
    }
    const na = a.signerName.trim().toLocaleLowerCase("fr");
    const nb = b.signerName.trim().toLocaleLowerCase("fr");
    const cmp = na.localeCompare(nb, "fr", { sensitivity: "base" });
    return sort === "name_asc" ? cmp : -cmp;
  });
  return next;
}

function countActiveFilters(filters: Filters) {
  let n = 0;
  if (filters.q.trim()) n += 1;
  if (filters.template) n += 1;
  if (filters.group) n += 1;
  if (filters.from) n += 1;
  if (filters.to) n += 1;
  if (filters.status && filters.status !== "signed") n += 1;
  return n;
}

function countSecondaryFilters(filters: Filters) {
  let n = 0;
  if (filters.template) n += 1;
  if (filters.from) n += 1;
  if (filters.to) n += 1;
  return n;
}

function hasSecondaryFilters(filters: Filters) {
  return Boolean(filters.template || filters.from || filters.to);
}

type PeriodScope = "all" | "today" | "week";

function getDayBounds() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekOffset = (now.getDay() + 6) % 7;
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - weekOffset);
  return { startToday, startWeek };
}

function computeStats(rows: SignatureResultRow[]) {
  const { startToday, startWeek } = getDayBounds();

  let today = 0;
  let week = 0;

  for (const row of rows) {
    const signed = new Date(row.signedAt);
    if (signed >= startToday) today += 1;
    if (signed >= startWeek) week += 1;
  }

  return { total: rows.length, today, week };
}

function applyQuickFilters(rows: SignatureResultRow[], scope: PeriodScope) {
  if (scope === "all") return rows;
  const { startToday, startWeek } = getDayBounds();
  const since = scope === "today" ? startToday : startWeek;
  return rows.filter((row) => new Date(row.signedAt) >= since);
}

function isPeriodScope(value: string | null | undefined): value is PeriodScope {
  return value === "all" || value === "today" || value === "week";
}

function PageNumbers({
  totalPages,
  current,
  onChange,
  compact = false,
}: {
  totalPages: number;
  current: number;
  onChange: (page: number) => void;
  compact?: boolean;
}) {
  const items: Array<number | "ellipsis"> = [];
  for (let n = 1; n <= totalPages; n += 1) {
    const show =
      totalPages <= 7 ||
      n === 1 ||
      n === totalPages ||
      Math.abs(n - current) <= 1;
    if (show) {
      items.push(n);
      continue;
    }
    const prev = items[items.length - 1];
    if (prev !== "ellipsis") items.push("ellipsis");
  }

  return (
    <nav
      className={`inline-flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-foreground))] bg-[var(--color-surface-2)]/70 p-0.5 ${
        compact ? "" : "shadow-[inset_0_1px_1px_rgba(15,23,42,0.03)]"
      }`}
      aria-label="Pagination"
    >
      {items.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`e-${index}`}
              className="px-1.5 text-[11px] text-[var(--color-muted)]"
              aria-hidden
            >
              …
            </span>
          );
        }
        const selected = item === current;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-full text-[12px] tabular-nums transition-[background-color,box-shadow,color,transform] duration-150 ${
              compact ? "h-6 min-w-6 px-1.5" : "h-7 min-w-7 px-2"
            } ${
              selected
                ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
                : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {item}
          </button>
        );
      })}
    </nav>
  );
}

function StatChip({
  label,
  value,
  active,
  onClick,
  title,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${value} ${title ?? label}`}
      title={title ?? label}
      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 py-1.5 text-center transition-[background-color,box-shadow,transform] duration-150 sm:px-2.5 ${
        active
          ? "bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_color-mix(in_srgb,var(--color-brand)_38%,var(--color-border))]"
          : "hover:bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)]"
      }`}
    >
      <span
        className={`text-[12px] font-semibold leading-none tabular-nums tracking-tight sm:text-[12.5px] ${
          active
            ? "text-[var(--color-foreground)]"
            : "text-[var(--color-foreground)]/80"
        }`}
      >
        {value}
      </span>
      <span
        className={`truncate text-[10.5px] leading-none sm:text-[11px] ${
          active ? "font-semibold text-[var(--color-brand)]" : "text-[var(--color-muted)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function OverviewChip({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_38%,var(--color-foreground))] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] leading-none text-[var(--color-foreground)]/85 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <span className="text-[var(--color-muted)]" aria-hidden>
        {icon}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="font-medium text-[var(--color-muted)]">{label}</span>
    </span>
  );
}

export function SignaturesLiveSearch({
  templates,
  groups = [],
  overview,
  initialFilters,
  initialSort = "date_desc",
  initialPage = 1,
  initialScope = "all",
  initialRows,
  initialError,
  allowExport = true,
  allowErase = false,
}: {
  templates: TemplateOption[];
  groups?: GroupOption[];
  overview?: Overview;
  initialFilters: Filters;
  initialSort?: SortId;
  initialPage?: number;
  initialScope?: PeriodScope;
  initialRows: SignatureResultRow[];
  initialError: string | null;
  /** False for employees — bulk CSV export is owner/admin only. */
  allowExport?: boolean;
  /** False for employees — GDPR erasure is owner/admin only. */
  allowErase?: boolean;
}) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [relativeNow, setRelativeNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setRelativeNow((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sort, setSort] = useState<SortId>(
    isSortId(initialSort) ? initialSort : "date_desc",
  );
  const [scope, setScope] = useState<PeriodScope>(
    isPeriodScope(initialScope) ? initialScope : "all",
  );
  const [page, setPage] = useState(Math.max(1, initialPage));
  const resultsTopRef = useRef<HTMLElement>(null);
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() =>
    hasSecondaryFilters(initialFilters),
  );
  const requestId = useRef(0);
  const isFirstEffect = useRef(true);
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const stats = useMemo(() => computeStats(sortedRows), [sortedRows]);
  const scopedRows = useMemo(
    () => applyQuickFilters(sortedRows, scope),
    [sortedRows, scope],
  );
  const totalPages = Math.max(1, Math.ceil(scopedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return scopedRows.slice(start, start + PAGE_SIZE);
  }, [scopedRows, safePage]);
  const showPagination = !error && scopedRows.length > PAGE_SIZE;
  const activeFilterCount = countActiveFilters(filters);
  const secondaryCount = countSecondaryFilters(filters);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const fetchResults = (
    nextFilters: Filters,
    opts?: { resetPage?: boolean; silent?: boolean },
  ) => {
    const id = ++requestId.current;
    void (async () => {
      if (!opts?.silent) setBusy(true);
      if (opts?.resetPage !== false) setPage(1);
      const fetchQs = new URLSearchParams();
      if (nextFilters.q.trim()) fetchQs.set("q", nextFilters.q.trim());
      if (nextFilters.template) fetchQs.set("template", nextFilters.template);
      if (nextFilters.group) fetchQs.set("group", nextFilters.group);
      if (nextFilters.from) fetchQs.set("from", nextFilters.from);
      if (nextFilters.to) fetchQs.set("to", nextFilters.to);
      fetchQs.set("status", nextFilters.status || "signed");

      try {
        const res = await fetch(
          `/dashboard/signatures/search?${fetchQs.toString()}`,
        );
        const data = (await res.json()) as {
          results?: SignatureResultRow[];
          error?: string;
        };
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(data.error ?? "Recherche indisponible.");
          setRows([]);
        } else {
          setError(null);
          setRows(data.results ?? []);
        }
      } catch {
        if (id !== requestId.current) return;
        setError("Recherche indisponible.");
        setRows([]);
      } finally {
        if (id === requestId.current && !opts?.silent) setBusy(false);
      }
    })();
  };

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useLiveSubmissionsRefresh({
    templateId: filters.template || null,
    onRefresh: () =>
      fetchResults(filtersRef.current, { resetPage: false, silent: true }),
  });

  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      fetchResults(filters);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const qs = buildQuery(filters, sort, safePage, scope);
    const next = qs.toString();
    router.replace(
      next ? `/dashboard/signatures?${next}` : "/dashboard/signatures",
      { scroll: false },
    );
  }, [filters, sort, safePage, scope, router]);

  function patch(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }

  const groupScope = groupScopeFromValue(filters.group);

  function setGroupScope(next: GroupScope) {
    if (next === "all") return patch({ group: "" });
    if (next === "individual") return patch({ group: GROUP_FILTER_NONE });
    const alreadyGroups = groupScope === "groups";
    patch({ group: alreadyGroups ? filters.group : GROUP_FILTER_ANY });
  }

  // A specific group (not "tous les groupes") already implies exactly one
  // waiver — the "Décharge" filter becomes redundant/contradictory, so it's
  // locked to that group's waiver instead of letting it produce empty results.
  const lockedGroup =
    groupScope === "groups" &&
    filters.group !== GROUP_FILTER_ANY &&
    filters.group !== GROUP_FILTER_NONE
      ? groups.find((g) => g.id === filters.group) ?? null
      : null;

  const lockedTemplateRef = useRef<string | null>(null);

  useEffect(() => {
    if (lockedGroup) {
      if (filters.template !== lockedGroup.templateId) {
        setFilters((prev) => ({ ...prev, template: lockedGroup.templateId }));
      }
      lockedTemplateRef.current = lockedGroup.templateId;
      return;
    }
    // Just left a locked group — clear the décharge filter it forced,
    // instead of leaving it stuck on that group's waiver.
    const lockedId = lockedTemplateRef.current;
    if (lockedId) {
      lockedTemplateRef.current = null;
      setFilters((prev) =>
        prev.template === lockedId ? { ...prev, template: "" } : prev,
      );
    }
  }, [lockedGroup, filters.template]);

  function setPeriodScope(next: PeriodScope) {
    setScope(next);
    setPage(1);
  }

  function clearQuickFilters() {
    setScope("all");
    setPage(1);
  }

  function goToPage(next: number) {
    const clamped = Math.min(totalPages, Math.max(1, next));
    setPage(clamped);
    resultsTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetFilters() {
    setFilters({
      q: "",
      template: "",
      group: "",
      from: "",
      to: "",
      status: "signed",
    });
    setSort("date_desc");
    setScope("all");
    setPage(1);
  }

  const rangeStart =
    scopedRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, scopedRows.length);
  const lastSignedLabel = useMemo(() => {
    if (!overview?.lastSignedAt) return null;
    return formatRelativeTime(overview.lastSignedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview?.lastSignedAt, relativeNow]);
  const canExport = allowExport && !error && scopedRows.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-3.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
          Recherche
        </p>
        <h1 className="mt-0.5 text-[1.55rem] font-semibold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-[1.7rem]">
          Signatures
        </h1>
        {overview ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <OverviewChip
              icon={<FileCheck2 size={12} strokeWidth={2} />}
              value={overview.totalSignatures}
              label={`signature${overview.totalSignatures === 1 ? "" : "s"}`}
            />
            <OverviewChip
              icon={<FileText size={12} strokeWidth={2} />}
              value={overview.totalTemplates}
              label={`décharge${overview.totalTemplates === 1 ? "" : "s"}`}
            />
            {overview.totalGroups > 0 ? (
              <OverviewChip
                icon={<GroupIcon size={12} />}
                value={overview.totalGroups}
                label={`groupe${overview.totalGroups === 1 ? "" : "s"}`}
              />
            ) : null}
            {lastSignedLabel ? (
              <span className="text-[11.5px] text-[var(--color-muted)]">
                dernière signature {lastSignedLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="relative z-20 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_34%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-2)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-foreground)_14%,transparent)] to-transparent"
          aria-hidden
        />
        <div className="p-3.5 sm:p-4">
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.85}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Signataire, enfant, email, téléphone, PV-…"
              className={`${inputClass} h-10 bg-[var(--color-surface-2)]/55 pl-10 text-[13.5px]`}
              autoComplete="off"
              aria-label="Rechercher"
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium tracking-wide text-[var(--color-muted)]">
                Groupe
              </p>
              <div
                className={`${segmentTrack} w-full`}
                role="radiogroup"
                aria-label="Filtrer par groupe"
              >
                {GROUP_SCOPE_OPTIONS.map((option) => {
                  const selected = groupScope === option.id;
                  const disabled =
                    option.id === "groups" && groups.length === 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      title={disabled ? "Aucune session créée" : undefined}
                      onClick={() => setGroupScope(option.id)}
                      className={`flex-1 ${segmentBtn(selected)} ${
                        disabled ? "pointer-events-none opacity-35" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="sort"
                className="text-[11px] font-medium tracking-wide text-[var(--color-muted)]"
              >
                Trier par
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortId);
                  setPage(1);
                }}
                className={`${inputClass} bg-[var(--color-surface-2)]/45`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {groupScope === "groups" && groups.length > 0 ? (
              <div className="sm:col-span-2 [animation:sig-fade_180ms_ease-out]">
                <label htmlFor="group-specific" className="sr-only">
                  Quel groupe
                </label>
                <GroupCombobox
                  id="group-specific"
                  groups={groups}
                  value={
                    filters.group === GROUP_FILTER_NONE
                      ? GROUP_FILTER_ANY
                      : filters.group
                  }
                  onChange={(next) => patch({ group: next })}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)]"
            >
              <ChevronDown
                size={14}
                strokeWidth={1.9}
                className={`transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
              Filtres avancés
              {secondaryCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface-2)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--color-foreground)]">
                  {secondaryCount}
                </span>
              ) : null}
            </button>

            <div className="flex items-center gap-1.5">
              {allowExport ? (
                <>
                  <ExportCsvButton
                    href={buildExportHref(filters, scope)}
                    label={buildExportLabel(
                      scopedRows.length,
                      groupScope,
                      lockedGroup,
                    )}
                    title={
                      lockedGroup
                        ? `Exporte uniquement les signatures de la session « ${lockedGroup.name} »`
                        : "Exporte exactement les signatures actuellement affichées, selon les filtres en cours"
                    }
                    disabled={!canExport}
                    className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-[color-mix(in_srgb,var(--color-border)_42%,var(--color-foreground))] bg-[var(--color-surface-2)]/70 px-2.5 text-[12.5px] font-medium text-[var(--color-foreground)]/85 shadow-[var(--elev-1)] transition-[transform,background-color,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
                  />
                  <span
                    className="h-3.5 w-px bg-[var(--color-border)]"
                    aria-hidden
                  />
                </>
              ) : null}
              <button
                type="button"
                onClick={resetFilters}
                disabled={
                  activeFilterCount === 0 &&
                  sort === "date_desc" &&
                  scope === "all"
                }
                className="rounded-lg px-1.5 py-1 text-[12.5px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-35"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen ? (
              <motion.div
                key="advanced-filters"
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 border-t border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] pt-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="template"
                      className="text-[11px] font-medium tracking-wide text-[var(--color-muted)]"
                    >
                      Décharge
                    </label>
                    <select
                      id="template"
                      value={lockedGroup ? (lockedGroup.templateId ?? "") : (filters.template ?? "")}
                      onChange={(e) => patch({ template: e.target.value })}
                      disabled={Boolean(lockedGroup)}
                      title={
                        lockedGroup
                          ? "Ce groupe est déjà lié à une seule décharge."
                          : undefined
                      }
                      className={`${inputClass} bg-[var(--color-surface-2)]/45 ${
                        lockedGroup ? "cursor-not-allowed opacity-70" : ""
                      }`}
                    >
                      <option value="">Toutes</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    {lockedGroup ? (
                      <p className="text-[10.5px] leading-snug text-[var(--color-muted)]">
                        Verrouillée — «{" "}
                        {groupOfLockedTemplateLabel(lockedGroup, templates)} » est
                        la seule décharge de ce groupe.
                      </p>
                    ) : null}
                  </div>

                  <DateField
                    id="from"
                    label="Du"
                    value={filters.from}
                    onChange={(from) => patch({ from })}
                    max={filters.to || undefined}
                  />

                  <DateField
                    id="to"
                    label="Au"
                    value={filters.to}
                    onChange={(to) => patch({ to })}
                    min={filters.from || undefined}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      {!error && sortedRows.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="px-0.5 text-[11px] font-medium tracking-wide text-[var(--color-muted)]">
            Filtrer par période
          </p>
          <div
            className={`${segmentTrack} flex w-full items-stretch gap-0.5 p-1`}
            role="radiogroup"
            aria-label="Filtrer par période"
          >
            <StatChip
              label="Au total"
              value={stats.total}
              active={scope === "all"}
              onClick={() => setPeriodScope("all")}
            />
            <StatChip
              label="Aujourd’hui"
              value={stats.today}
              active={scope === "today"}
              onClick={() => setPeriodScope("today")}
            />
            <StatChip
              label="Cette semaine"
              value={stats.week}
              active={scope === "week"}
              onClick={() => setPeriodScope("week")}
            />
          </div>
        </div>
      ) : null}

      <section
        ref={resultsTopRef}
        className={`flex flex-col gap-1.5 scroll-mt-4 transition-opacity duration-200 ${busy ? "opacity-55" : "opacity-100"}`}
        aria-busy={busy}
      >
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[12px] font-medium tabular-nums tracking-tight text-[var(--color-muted)]">
            {error
              ? error
              : scopedRows.length === 0
                ? "Aucun résultat"
                : (
                    <>
                      <span className="text-[var(--color-foreground)]">
                        {rangeStart}–{rangeEnd}
                      </span>
                      <span className="mx-1 text-[var(--color-border)]">/</span>
                      <span>{scopedRows.length}</span>
                    </>
                  )}
          </p>
          {showPagination ? (
            <PageNumbers
              totalPages={totalPages}
              current={safePage}
              onChange={goToPage}
              compact
            />
          ) : null}
        </div>

        {!error && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_55%,transparent)] px-6 py-10 text-center">
            <p className="text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
              Aucune signature trouvée
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-[var(--color-muted)]">
              Essayez un autre terme, élargissez les dates, ou réinitialisez les
              filtres.
            </p>
          </div>
        ) : null}

        {!error && rows.length > 0 && scopedRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-5 py-8 text-center">
            <p className="text-[13.5px] font-medium tracking-tight text-[var(--color-foreground)]">
              Aucune signature pour ce raccourci
            </p>
            <button
              type="button"
              onClick={clearQuickFilters}
              className="mt-2 text-[12.5px] font-medium text-[var(--color-brand)] transition-colors hover:text-[var(--color-foreground)]"
            >
              Afficher tout
            </button>
          </div>
        ) : null}

        {!error && pageRows.length > 0 ? (
          <div
            key={`${safePage}-${sort}-${scope}`}
            className="[animation:sig-fade_200ms_ease-out]"
          >
            <SignaturesResults
              rows={pageRows}
              groups={groups}
              canErase={allowErase}
            />
          </div>
        ) : null}

        {showPagination ? (
          <nav
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,var(--color-foreground))] bg-[var(--color-surface)] px-2 py-1.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-foreground)_4%,transparent),var(--elev-1)]"
            aria-label="Pagination bas"
          >
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-[var(--color-foreground)] transition-[background-color,opacity,color] duration-150 hover:bg-[var(--color-surface-2)] disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft size={14} strokeWidth={1.9} aria-hidden />
              Précédent
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11.5px] tabular-nums text-[var(--color-muted)] sm:inline">
                Page {safePage} / {totalPages}
              </span>
              <PageNumbers
                totalPages={totalPages}
                current={safePage}
                onChange={goToPage}
              />
            </div>

            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-[var(--color-foreground)] transition-[background-color,opacity,color] duration-150 hover:bg-[var(--color-surface-2)] disabled:pointer-events-none disabled:opacity-35"
            >
              Suivant
              <ChevronRight size={14} strokeWidth={1.9} aria-hidden />
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
