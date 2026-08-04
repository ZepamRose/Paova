"use client";

import { useLiveCountdown, type CountdownConfig } from "@/hooks/use-live-time";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PAOVA V2 - Live Countdown Display Component
 * 
 * Composant réutilisable pour afficher un countdown en temps réel.
 * Animations fluides, couleurs progressives, zéro setInterval local.
 */

type LiveCountdownProps = CountdownConfig & {
  className?: string;
  showIndicator?: boolean;
};

export function LiveCountdown({ 
  startTime, 
  endTime, 
  format = "full",
  className = "",
  showIndicator = true,
}: LiveCountdownProps) {
  const state = useLiveCountdown({ startTime, endTime, format });

  if (!state.remainingText) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.phase}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`flex items-center gap-1.5 ${className}`}
      >
        {showIndicator && (
          <motion.div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: state.color }}
            animate={state.animate ? {
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: state.animate ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        )}
        <motion.span
          className="text-[11.5px] font-semibold tabular-nums"
          style={{ color: state.color }}
          layout
        >
          {state.remainingText}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Variante compacte pour les cartes
 */
export function LiveCountdownCompact({ 
  startTime, 
  endTime,
  className = "",
}: Omit<LiveCountdownProps, "format">) {
  const state = useLiveCountdown({ startTime, endTime, format: "short" });

  if (!state.remainingText) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.phase}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${className}`}
        style={{ 
          backgroundColor: `${state.color}15`,
        }}
      >
        <motion.div
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: state.color }}
          animate={state.animate ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.6, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: state.animate ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ color: state.color }}
        >
          {state.remainingText}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Badge de statut avec texte de phase
 */
export function LiveStatusBadge({
  startTime,
  endTime,
  className = "",
}: Omit<LiveCountdownProps, "format">) {
  const state = useLiveCountdown({ startTime, endTime, format: "full" });

  const labels = {
    future: "À venir",
    approaching: "Bientôt",
    soon: "Imminent",
    imminent: "Débute",
    active: "En cours",
    ending: "Fin proche",
    done: "Terminée",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.phase}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${className}`}
        style={{
          backgroundColor: `${state.color}12`,
          borderColor: `${state.color}30`,
        }}
      >
        <motion.div
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: state.color }}
          animate={state.animate ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: state.animate ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
        <span
          className="text-[11px] font-semibold"
          style={{ color: state.color }}
        >
          {labels[state.phase]}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
