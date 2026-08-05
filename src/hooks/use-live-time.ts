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
 * Formatage du temps écoulé - affichage naturel et lisible
 */
function formatElapsedText(ms: number): string {
  if (ms < 0) return "0 min";

  const totalMinutes = Math.floor(ms / MINUTE);
  const hours = Math.floor(ms / HOUR);
  const days = Math.floor(ms / DAY);

  // 0 à 59 min → "26 min"
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  // 1 h à 23 h → "2 h 15"
  if (hours < 24) {
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return minutes > 0 ? `${hours} h ${minutes}` : `${hours} h`;
  }

  // 24 h à 47 h → "1 jour 2 h"
  if (days === 1) {
    const remainingHours = Math.floor((ms % DAY) / HOUR);
    return remainingHours > 0 ? `1 jour ${remainingHours} h` : `1 jour`;
  }

  // 48 h+ → "2 jours", "3 jours", etc.
  // Affiche les heures seulement si < 3 jours
  if (days < 3) {
    const remainingHours = Math.floor((ms % DAY) / HOUR);
    return remainingHours > 0 ? `${days} jours ${remainingHours} h` : `${days} jours`;
  }

  // 3+ jours → juste les jours
  return `${days} jours`;
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
 * Format court pour le temps écoulé - même logique que formatElapsedText
 */
function formatElapsedShort(ms: number): string {
  if (ms < 0) return "0 min";

  const totalMinutes = Math.floor(ms / MINUTE);
  const hours = Math.floor(ms / HOUR);
  const days = Math.floor(ms / DAY);

  // 0 à 59 min → "26 min"
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  // 1 h à 23 h → "2h15"
  if (hours < 24) {
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
  }

  // 1 jour → "1j 2h"
  if (days === 1) {
    const remainingHours = Math.floor((ms % DAY) / HOUR);
    return remainingHours > 0 ? `1j ${remainingHours}h` : `1j`;
  }

  // 2+ jours
  if (days < 3) {
    const remainingHours = Math.floor((ms % DAY) / HOUR);
    return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
  }

  // 3+ jours
  return `${days}j`;
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
