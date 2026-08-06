"use client";

import { useState, useEffect, useMemo } from "react";
import { LayoutGrid, List, Calendar, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { LiveSessionManager, AnimatedSessionGrid, AnimatedSessionCard } from "@/components/live-session-manager";
import { SessionTimeline } from "./sessions-timeline";
import { SessionCard } from "./dashboard-sessions-view";
import { StationCard } from "./station-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "sessions" | "stations";
type TimeFilter = "today" | "upcoming" | "recent";
type ViewMode = "cards" | "list";

const STORAGE_KEY = "paova-sessions-view-mode";
const TYPE_STORAGE_KEY = "paova-activity-type";

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "list" || v === "cards") return v;
  } catch { /* ignore */ }
  return "cards";
}

function getStoredActivityType(): ActivityType {
  if (typeof window === "undefined") return "sessions";
  try {
    const v = localStorage.getItem(TYPE_STORAGE_KEY);
    if (v === "sessions" || v === "stations") return v;
  } catch { /* ignore */ }
  return "sessions";
}

// ─── Type Selector ────────────────────────────────────────────────────────────

function TypeSelector({ activeType, onChange, sessionCount, stationCount }: {
  activeType: ActivityType;
  onChange: (t: ActivityType) => void;
  sessionCount: number;
  stationCount: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-1">
      <button
        type="button"
        onClick={() => onChange("sessions")}
        className={
          "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 " +
          (activeType === "sessions"
            ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]")
        }
      >
        <Calendar size={14} strokeWidth={2} />
        <span>Sessions planifiées</span>
        {sessionCount > 0 && (
          <span className={
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums " +
            (activeType === "sessions"
              ? "bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              : "bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] text-[var(--color-muted)]")
          }>
            {sessionCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange("stations")}
        className={
          "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 " +
          (activeType === "stations"
            ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]")
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
        <span>Signatures libres</span>
        {stationCount > 0 && (
          <span className={
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums " +
            (activeType === "stations"
              ? "bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              : "bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] text-[var(--color-muted)]")
          }>
            {stationCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Time Filter Nav ─────────────────────────────────────────────────────────

function TimeFilterNav({ activeFilter, onChange, counts }: {
  activeFilter: TimeFilter;
  onChange: (t: TimeFilter) => void;
  counts: Record<TimeFilter, number>;
}) {
  const filters: { id: TimeFilter; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "upcoming", label: "À venir" },
    { id: "recent", label: "Terminées" },
  ];

  return (
    <nav className="flex items-center gap-0.5" role="tablist" aria-label="Filtres temporels">
      {filters.map(({ id, label }) => {
        const active = activeFilter === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(id)}
            className={
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-[color,background-color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)] " +
              (active
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-[0_1px_3px_rgba(0,0,0,0.07),0_0_0_0.5px_color-mix(in_srgb,var(--color-border)_55%,transparent)]"
                : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] hover:text-[var(--color-foreground)]")
            }
          >
            <span>{label}</span>
            {counts[id] > 0 && (
              <span className={
                "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums " +
                (active
                  ? "bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
                  : "bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] text-[var(--color-muted)]")
              }>
                {counts[id]}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── View Toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-0.5">
      {(["list", "cards"] as ViewMode[]).map((m) => {
        const Icon = m === "list" ? List : LayoutGrid;
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            title={m === "list" ? "Vue liste" : "Vue cartes"}
            aria-label={m === "list" ? "Vue liste" : "Vue cartes"}
            aria-pressed={active}
            className={
              "flex h-7 w-7 items-center justify-center rounded-md transition-[color,background-color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)] " +
              (active
                ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]")
            }
          >
            <Icon size={14} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ type, filter }: { type: ActivityType; filter: TimeFilter | null }) {
  const messages = {
    sessions: {
      today: { title: "Aucune session aujourd'hui", sub: "Créez une session pour commencer la journée." },
      upcoming: { title: "Aucune session à venir", sub: "Planifiez vos prochaines activités." },
      recent: { title: "Aucune session terminée", sub: "Les sessions passées apparaîtront ici." },
    },
    stations: {
      title: "Aucune signature libre active",
      sub: "Créez une station pour la signature libre en continu.",
    },
  };

  const message = type === "stations"
    ? messages.stations
    : messages.sessions[filter as TimeFilter];

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-muted)_7%,transparent)]">
        <Calendar size={20} strokeWidth={1.8} className="text-[var(--color-muted)]" />
      </div>
      <p className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">{message.title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">{message.sub}</p>
      {type === "sessions" && filter === "today" && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-new-session-modal"))}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-4 text-[12.5px] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,var(--elev-1)] transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden />
          Nouvelle activité
        </button>
      )}
    </div>
  );
}

// ─── Tab Content ──────────────────────────────────────────────────────────────

function TabContent({ sessions, viewMode, isCompleted, type, filter, appUrl }: {
  sessions: DashboardGroupRow[];
  viewMode: ViewMode;
  isCompleted: boolean;
  type: ActivityType;
  filter: TimeFilter | null;
  appUrl: string;
}) {
  if (sessions.length === 0) return <EmptyState type={type} filter={filter} />;

  // Stations : supporter les deux modes (liste et grille)
  if (type === "stations") {
    if (viewMode === "list") {
      return <SessionTimeline sessions={sessions} isCompleted={false} appUrl={appUrl} />;
    }
    return (
      <AnimatedSessionGrid layoutId="stations">
        {sessions.map((station) => (
          <AnimatedSessionCard key={station.id} sessionId={station.id}>
            <StationCard station={station} appUrl={appUrl} />
          </AnimatedSessionCard>
        ))}
      </AnimatedSessionGrid>
    );
  }

  if (viewMode === "list") {
    return <SessionTimeline sessions={sessions} isCompleted={isCompleted} appUrl={appUrl} />;
  }

  // Cards view
  const now = new Date();
  return (
    <AnimatedSessionGrid layoutId={filter || "sessions"}>
      {sessions.map((session) => {
        const cardVariant: "ongoing" | "upcoming" | "completed" = isCompleted
          ? "completed"
          : session.start_time && new Date(session.start_time) <= now
          ? "ongoing"
          : "upcoming";
        return (
          <AnimatedSessionCard key={session.id} sessionId={session.id}>
            <SessionCard session={session} variant={cardVariant} appUrl={appUrl} />
          </AnimatedSessionCard>
        );
      })}
    </AnimatedSessionGrid>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function SessionsPanel({ groups, appUrl }: {
  groups: DashboardGroupRow[];
  appUrl: string;
}) {
  const [activityType, setActivityType] = useState<ActivityType>("sessions");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setViewMode(getStoredViewMode());
    setActivityType(getStoredActivityType());
    setMounted(true);
  }, []);

  function handleViewMode(m: ViewMode) {
    setViewMode(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  }

  function handleActivityType(t: ActivityType) {
    setActivityType(t);
    try { localStorage.setItem(TYPE_STORAGE_KEY, t); } catch { /* ignore */ }
  }

  // Séparer les stations des sessions régulières
  const sessions = useMemo(() => groups.filter(g => g.kind !== "station"), [groups]);
  const stations = useMemo(() => groups.filter(g => g.kind === "station"), [groups]);

  return (
    <LiveSessionManager groups={sessions}>
      {(classified) => {
        const { ongoing, todayUpcoming, upcoming, completed } = classified;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const todaySessions = useMemo(() =>
          [...ongoing, ...todayUpcoming].sort((a, b) => {
            const at = a.start_time ?? a.scheduled_at ?? "";
            const bt = b.start_time ?? b.scheduled_at ?? "";
            return at.localeCompare(bt);
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [ongoing.map(g => g.id).join(","), todayUpcoming.map(g => g.id).join(",")]
        );

        const timeCounts: Record<TimeFilter, number> = {
          today: todaySessions.length,
          upcoming: upcoming.length,
          recent: completed.length,
        };

        const currentSessions = activityType === "stations"
          ? stations
          : timeFilter === "today"
          ? todaySessions
          : timeFilter === "upcoming"
          ? upcoming
          : completed;

        const isCurrentCompleted = activityType === "sessions" && timeFilter === "recent";
        const totalSessionCount = todaySessions.length + upcoming.length + completed.length;

        return (
          <div className="flex flex-col gap-4">
            {/* Niveau 1: Type d'activité */}
            <TypeSelector
              activeType={activityType}
              onChange={handleActivityType}
              sessionCount={totalSessionCount}
              stationCount={stations.length}
            />

            {/* Niveau 2: Filtres temporels + View toggle */}
            <div className="flex items-center justify-between gap-3">
              {activityType === "sessions" ? (
                <div className="min-w-0 rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_70%,transparent)] p-1">
                  <TimeFilterNav activeFilter={timeFilter} onChange={setTimeFilter} counts={timeCounts} />
                </div>
              ) : (
                <div />
              )}
              {mounted && <ViewToggle mode={viewMode} onChange={handleViewMode} />}
            </div>

            {/* Animated content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activityType}-${timeFilter}-${viewMode}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <TabContent
                  sessions={currentSessions}
                  viewMode={viewMode}
                  isCompleted={isCurrentCompleted}
                  type={activityType}
                  filter={activityType === "sessions" ? timeFilter : null}
                  appUrl={appUrl}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        );
      }}
    </LiveSessionManager>
  );
}
