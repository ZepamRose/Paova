"use client";

import { useState, useEffect } from "react";

/**
 * PAOVA V2 - Live Time Hooks
 * 
 * Architecture centralisée pour gérer tous les compteurs temps réel.
 * Une seule source de temps, des hooks partagés, zéro fuite mémoire.
 */

// ─── Global Time Source ──────────────────────────────────────────────────────

let globalNow = Date.now();
const globalListeners = new Set<() => void>();
let globalInterval: NodeJS.Timeout | null = null;

function startGlobalClock() {
  if (globalInterval) return;
  
  globalInterval = setInterval(() => {
    globalNow = Date.now();
    globalListeners.forEach(listener => listener());
  }, 1000);
}

function stopGlobalClock() {
  if (globalListeners.size === 0 && globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
}

// ─── useLiveTime Hook ────────────────────────────────────────────────────────

/**
 * Hook pour obtenir l'heure actuelle mise à jour chaque seconde.
 * Utilise une source de temps globale partagée entre tous les composants.
 */
export function useLiveTime(): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const updateNow = () => setNow(globalNow);
    
    globalListeners.add(updateNow);
    startGlobalClock();

    // Sync immédiat
    setNow(globalNow);

    return () => {
      globalListeners.delete(updateNow);
      stopGlobalClock();
    };
  }, []);

  return now;
}

// ─── Countdown State ─────────────────────────────────────────────────────────

export type CountdownPhase = 
  | "future"      // Plus de 15 minutes
  | "approaching" // 15-5 minutes
  | "soon"        // 5-1 minute
  | "imminent"    // Dernière minute
  | "active"      // En cours
  | "ending"      // Moins de 10 min avant la fin
  | "done";       // Terminé

export type CountdownState = {
  phase: CountdownPhase;
  remainingMs: number;
  remainingText: string;
  color: string;
  animate: boolean;
};

// ─── useLiveCountdown Hook ───────────────────────────────────────────────────

export type CountdownConfig = {
  startTime: Date | null;
  endTime: Date | null;
  format?: "short" | "full"; // "4:59" vs "Débute dans 4:59"
};

/**
 * Hook pour afficher un countdown en temps réel avec les bonnes couleurs
 * et les transitions de phase automatiques.
 * Utilise le formatage intelligent pour un affichage premium.
 */
export function useLiveCountdown(config: CountdownConfig): CountdownState {
  const now = useLiveTime();
  const { startTime, endTime, format = "full" } = config;

  if (!startTime) {
    return {
      phase: "future",
      remainingMs: 0,
      remainingText: "",
      color: "var(--color-muted)",
      animate: false,
    };
  }

  const startMs = startTime.getTime();
  const endMs = endTime?.getTime() || null;

  // Pas encore commencé
  if (now < startMs) {
    const remainingMs = startMs - now;
    const minutes = Math.floor(remainingMs / 60000);

    let phase: CountdownPhase;
    let color: string;
    let animate = false;

    if (minutes >= 15) {
      phase = "future";
      color = "var(--color-muted)";
    } else if (minutes >= 5) {
      phase = "approaching";
      color = "#3b82f6"; // Bleu discret
    } else if (minutes >= 1) {
      phase = "soon";
      color = "#f59e0b"; // Orange
    } else {
      phase = "imminent";
      color = "#f97316"; // Orange soutenu
      animate = true;
    }

    // Utiliser le formatage intelligent
    const remainingText = format === "short"
      ? formatCountdownShort(remainingMs)
      : formatSmartCountdownText(remainingMs, "Débute dans");

    return { phase, remainingMs, remainingText, color, animate };
  }

  // En cours
  if (!endMs || now < endMs) {
    const elapsedMs = now - startMs;
    const remainingMs = endMs ? endMs - now : 0;

    if (endMs && remainingMs < 10 * 60 * 1000) {
      // Moins de 10 min avant la fin
      const minutes = Math.floor(remainingMs / 60000);
      const remainingText = format === "short"
        ? formatCountdownShort(remainingMs)
        : formatSmartCountdownText(remainingMs, "Fin dans");

      return {
        phase: "ending",
        remainingMs,
        remainingText,
        color: "#f59e0b",
        animate: minutes === 0,
      };
    }

    // En cours normal - utiliser formatage intelligent
    const remainingText = format === "short"
      ? formatElapsedShort(elapsedMs)
      : `En cours • ${formatElapsedText(elapsedMs)}`;

    return {
      phase: "active",
      remainingMs: elapsedMs,
      remainingText,
      color: "#10b981", // Vert
      animate: true,
    };
  }

  // Terminé
  return {
    phase: "done",
    remainingMs: 0,
    remainingText: "Terminée",
    color: "var(--color-muted)",
    animate: false,
  };
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formatage intelligent du countdown avec les bonnes unités
 */
function formatSmartCountdownText(ms: number, prefix: string): string {
  if (ms < 0) return "maintenant";

  const totalSeconds = Math.floor(ms / SECOND);
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = totalSeconds % 60;

  // Moins d'1 minute : afficher uniquement les secondes
  if (ms < MINUTE) {
    return `${prefix} ${seconds} s`;
  }

  // Moins d'1 heure : minutes + secondes
  if (ms < HOUR) {
    return `${prefix} ${minutes} min ${seconds} s`;
  }

  // Moins de 24 heures : heures + minutes (sans secondes)
  if (ms < DAY) {
    return `${prefix} ${hours} h ${String(minutes).padStart(2, "0")}`;
  }

  // 1 jour ou plus : jours + heures
  return `${prefix} ${days} j ${hours} h`;
}

/**
 * Formatage du temps écoulé
 */
function formatElapsedText(ms: number): string {
  if (ms < 0) return "depuis maintenant";

  // Moins d'1 heure : afficher les minutes
  if (ms < HOUR) {
    const minutes = Math.floor(ms / MINUTE);
    return `depuis ${minutes} min`;
  }

  // Moins de 24 heures : afficher les heures
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    return `depuis ${hours} h`;
  }

  // Exactement 1 jour (24h à 48h)
  if (ms < 2 * DAY) {
    return "depuis hier";
  }

  // 2 jours ou plus
  const days = Math.floor(ms / DAY);
  return `depuis ${days} jours`;
}

/**
 * Format court pour les badges compacts (format "short")
 */
function formatCountdownShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Format court pour le temps écoulé
 */
function formatElapsedShort(ms: number): string {
  if (ms < HOUR) {
    const minutes = Math.floor(ms / MINUTE);
    return `${minutes} min`;
  }

  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }

  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  return `${days}j ${hours}h`;
}

// ─── useAutoRefresh Hook ─────────────────────────────────────────────────────

/**
 * Hook pour déclencher un callback quand une session change de phase.
 * Utilisé pour déplacer automatiquement les cartes entre les sections.
 */
export function useSessionPhaseChange(
  startTime: Date | null,
  endTime: Date | null,
  onPhaseChange: (newPhase: "upcoming" | "active" | "done") => void
) {
  const now = useLiveTime();

  useEffect(() => {
    if (!startTime) return;

    const startMs = startTime.getTime();
    const endMs = endTime?.getTime();

    let phase: "upcoming" | "active" | "done";

    if (now < startMs) {
      phase = "upcoming";
    } else if (!endMs || now < endMs) {
      phase = "active";
    } else {
      phase = "done";
    }

    onPhaseChange(phase);
  }, [now, startTime, endTime, onPhaseChange]);
}
