"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Soft ease-out — no overshoot, no spring. */
export const DASHBOARD_ENTRANCE_EASE = [0.33, 1, 0.68, 1] as const;
export const DASHBOARD_ENTRANCE_Y = 10;
export const DASHBOARD_ENTRANCE_DURATION = 0.4;
/** Delay between staged blocks (~65 ms). */
export const DASHBOARD_ENTRANCE_STAGGER = 0.065;

/**
 * One-shot entrance for dashboard blocks.
 * Plays only on mount (first load / real return to the page) —
 * not on search, pagination, or view toggles.
 */
export function DashboardEntrance({
  step,
  children,
  className,
  role,
  "aria-label": ariaLabel,
}: {
  /** 0 = identity, 1 = pulse, 2 = search, 3 = waivers, 4 = groups */
  step: number;
  children: ReactNode;
  className?: string;
  role?: string;
  "aria-label"?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      role={role}
      aria-label={ariaLabel}
      initial={reduced ? false : { opacity: 0, y: DASHBOARD_ENTRANCE_Y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DASHBOARD_ENTRANCE_DURATION,
        delay: reduced ? 0 : step * DASHBOARD_ENTRANCE_STAGGER,
        ease: DASHBOARD_ENTRANCE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
