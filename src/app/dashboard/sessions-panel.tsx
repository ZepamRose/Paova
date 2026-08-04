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

type TabId = "today" | "upcoming" | "recent" | "stations";
type ViewMode = "cards" | "list";

const STORAGE_KEY = "paova-sessions-view-mode";

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "list" || v === "cards") return v;
  } catch { /* ignore */ }
  return "cards";
}

// ─── Tab Nav ─────────────────────────────────────────────────────────────────

function TabNav({ activeTab, onChange, counts }: {
  activeTab: TabId;
  onChange: (t: TabId) => void;
  counts: Record<TabId, number>;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "upcoming", label: "Demain et après" },
    { id: "recent", label: "Récentes" },
    { id: "stations", label: "Signature libre" },
  ];

  return (
    <nav className="flex items-center gap-0.5" role="tablist" aria-label="Onglets sessions">
      {tabs.map(({ id, label }) => {
        const active = activeTab === id;
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

function EmptyState({ tab }: { tab: TabId }) {
  const messages: Record<TabId, { title: string; sub: string }> = {
    today: { title: "Aucune session aujourd'hui", sub: "Créez une session pour commencer la journée." },
    upcoming: { title: "Aucune session à venir", sub: "Planifiez vos prochaines activités." },
    recent: { title: "Aucune session terminée", sub: "Les sessions passées apparaîtront ici." },
    stations: { title: "Aucune station active", sub: "Créez une station pour la signature libre en continu." },
  };
  const { title, sub } = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-muted)_7%,transparent)]">
        <Calendar size={20} strokeWidth={1.8} className="text-[var(--color-muted)]" />
      </div>
      <p className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">{sub}</p>
      {tab === "today" && (
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

function TabContent({ sessions, viewMode, isCompleted, tab, appUrl }: {
  sessions: DashboardGroupRow[];
  viewMode: ViewMode;
  isCompleted: boolean;
  tab: TabId;
  appUrl: string;
}) {
  if (sessions.length === 0) return <EmptyState tab={tab} />;

  // Stations : toujours en mode cards, pas de liste
  if (tab === "stations") {
    return (
      <AnimatedSessionGrid layoutId={tab}>
        {sessions.map((station) => (
          <AnimatedSessionCard key={station.id} sessionId={station.id}>
            <StationCard station={station} />
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
    <AnimatedSessionGrid layoutId={tab}>
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
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setViewMode(getStoredViewMode());
    setMounted(true);
  }, []);

  function handleViewMode(m: ViewMode) {
    setViewMode(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
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

        const counts: Record<TabId, number> = {
          today: todaySessions.length,
          upcoming: upcoming.length,
          recent: completed.length,
          stations: stations.length,
        };

        const currentSessions =
          activeTab === "today" ? todaySessions :
          activeTab === "upcoming" ? upcoming :
          activeTab === "recent" ? completed :
          stations;

        const isCurrentCompleted = activeTab === "recent";

        return (
          <div className="flex flex-col gap-3">
            {/* Toolbar: tabs + view toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_70%,transparent)] p-1">
                <TabNav activeTab={activeTab} onChange={setActiveTab} counts={counts} />
              </div>
              {mounted && <ViewToggle mode={viewMode} onChange={handleViewMode} />}
            </div>

            {/* Animated content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${viewMode}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <TabContent
                  sessions={currentSessions}
                  viewMode={viewMode}
                  isCompleted={isCurrentCompleted}
                  tab={activeTab}
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
