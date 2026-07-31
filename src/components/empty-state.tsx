"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Composant réutilisable pour tous les états vides de l'application.
 * Garantit une expérience cohérente avec icône, titre, description et CTA optionnel.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,transparent)] px-6 text-center ${
        compact ? "py-8" : "py-10 sm:px-10 sm:py-12"
      }`}
    >
      {!compact ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[var(--elev-1)]">
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </p>
        <p className="text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          {description}
        </p>
      </div>
      {action ? action : null}
    </motion.div>
  );
}
