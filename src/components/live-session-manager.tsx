"use client";

import { useMemo } from "react";
import { motion, LayoutGroup } from "framer-motion";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { useLiveTime } from "@/hooks/use-live-time";
import { getSessionTimeInfo } from "@/lib/session-time";

/**
 * PAOVA V2 - Live Session Manager
 *
 * Gère le déplacement automatique des sessions entre les sections
 * quand leur phase change, avec des animations fluides.
 */

export type ClassifiedSessions = {
  ongoing: DashboardGroupRow[];
  todayUpcoming: DashboardGroupRow[];
  upcoming: DashboardGroupRow[];
  completed: DashboardGroupRow[];
};

type LiveSessionManagerProps = {
  groups: DashboardGroupRow[];
  children: (sessions: ClassifiedSessions) => React.ReactNode;
};

/**
 * Classifie les sessions en temps réel et les déplace automatiquement
 * entre les sections quand leur phase change.
 */
export function LiveSessionManager({ groups, children }: LiveSessionManagerProps) {
  const now = useLiveTime();

  const classified = useMemo(() => {
    const nowDate = new Date(now);
    
    // Définir les limites de "aujourd'hui" en heure locale
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const ongoing: DashboardGroupRow[] = [];
    const todayUpcoming: DashboardGroupRow[] = [];
    const upcoming: DashboardGroupRow[] = [];
    const completed: DashboardGroupRow[] = [];

    for (const group of groups) {
      if (group.status === "archived") {
        continue; // Skip archived
      }

      if (group.status === "closed") {
        completed.push(group);
        continue;
      }

      const timeInfo = getSessionTimeInfo(
        group.start_time,
        group.end_time,
        group.duration_minutes
      );

      // Session terminée par le temps
      if (timeInfo.isPast) {
        completed.push(group);
        continue;
      }

      // Session en cours
      if (timeInfo.isOngoing) {
        ongoing.push(group);
        continue;
      }

      // Session à venir
      if (timeInfo.isUpcoming && timeInfo.startTime) {
        const startDate = timeInfo.startTime;
        
        // Aujourd'hui mais pas encore commencée
        if (startDate >= todayStart && startDate < todayEnd) {
          todayUpcoming.push(group);
        } else {
          upcoming.push(group);
        }
        continue;
      }

      // Par défaut, session ouverte sans temps défini
      ongoing.push(group);
    }

    // Trier les sessions par urgence/temps
    ongoing.sort((a, b) => {
      const aTimeInfo = getSessionTimeInfo(a.start_time, a.end_time, a.duration_minutes);
      const bTimeInfo = getSessionTimeInfo(b.start_time, b.end_time, b.duration_minutes);

      const aEndMs = aTimeInfo.endTime ? aTimeInfo.endTime.getTime() : Infinity;
      const bEndMs = bTimeInfo.endTime ? bTimeInfo.endTime.getTime() : Infinity;

      if (aEndMs !== bEndMs) return aEndMs - bEndMs;

      // Si même urgence, trier par signatures manquantes
      const aPending = a.total - a.signed;
      const bPending = b.total - b.signed;
      return bPending - aPending;
    });

    todayUpcoming.sort((a, b) => {
      const aTime = a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.start_time ?? b.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    });

    upcoming.sort((a, b) => {
      const aTime = a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.start_time ?? b.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    });

    completed.sort((a, b) => {
      const aTime = a.end_time ?? a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.end_time ?? b.start_time ?? b.scheduled_at ?? "";
      return bTime.localeCompare(aTime); // Plus récent en premier
    });

    return { ongoing, todayUpcoming, upcoming, completed };
  }, [groups, now]);

  return <>{children(classified)}</>;
}

/**
 * Layout wrapper avec animations Framer Motion
 */
export function AnimatedSessionGrid({ 
  children, 
  layoutId 
}: { 
  children: React.ReactNode; 
  layoutId: string;
}) {
  return (
    <LayoutGroup id={layoutId}>
      <motion.div
        layout
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {children}
      </motion.div>
    </LayoutGroup>
  );
}

/**
 * Wrapper pour animer l'apparition/disparition des cartes
 */
export function AnimatedSessionCard({ 
  children, 
  sessionId 
}: { 
  children: React.ReactNode; 
  sessionId: string;
}) {
  return (
    <motion.div
      layout
      layoutId={`session-${sessionId}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }}
    >
      {children}
    </motion.div>
  );
}
