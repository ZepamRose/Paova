"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarClock, Timer } from "lucide-react";
import {
  type ExpirationMode,
  type SignatureHoursConfig,
} from "@/lib/templates";
import { SignatureHoursSettings } from "./signature-hours-settings";
import {
  ExpirationSettings,
  type ExpirationSavedPayload,
} from "./expiration-settings";
import {
  summarizeExpiration,
  summarizeHours,
} from "./availability-summary";

export { summarizeExpiration, summarizeHours } from "./availability-summary";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const card =
  `rounded-[1.1rem] border border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-2)] ring-1 ring-black/[0.015] transition-[border-color,box-shadow,transform] ${MOTION} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:shadow-[var(--elev-hover)] dark:ring-white/[0.035]`;

const configureBtn =
  `inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-[12px] font-medium text-[var(--color-muted)] transition-[background-color,color,transform] ${MOTION} hover:bg-[color-mix(in_srgb,var(--color-surface-2)_70%,transparent)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]`;

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

function AvailabilityCard({
  icon,
  title,
  description,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  summary: { primary: string; secondary?: string; tone?: "warning" };
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className={`${card} ${open ? "lg:col-span-2 hover:translate-y-0" : ""}`}>
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <SectionIcon>{icon}</SectionIcon>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-[0.9rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                {title}
              </h3>
              <p className="text-[11.5px] leading-snug text-[var(--color-muted)]">
                {description}
              </p>
            </div>
            <div className="mt-3.5 flex flex-col gap-0.5">
              <p
                className={`text-[15px] font-semibold tracking-tight ${
                  summary.tone === "warning"
                    ? "text-[color-mix(in_srgb,#b45309_88%,var(--color-foreground))] dark:text-[color-mix(in_srgb,#fbbf24_88%,var(--color-muted))]"
                    : "text-[var(--color-foreground)]"
                }`}
              >
                <span
                  className={`mr-1.5 font-medium ${
                    summary.tone === "warning"
                      ? "text-[color-mix(in_srgb,#b45309_80%,var(--color-muted))] dark:text-[color-mix(in_srgb,#fbbf24_80%,var(--color-muted))]"
                      : "text-[var(--color-brand)]"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                {summary.primary}
              </p>
              {summary.secondary ? (
                <p className="pl-[1.15rem] text-[13px] tabular-nums text-[var(--color-muted)]">
                  {summary.secondary}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={`${configureBtn} self-start`}
        >
          {open ? "Fermer" : "Configurer"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 border-t border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] pt-0.5">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AvailabilitySection({
  templateId,
  hoursConfig,
  expirationMode,
  expirationDays,
  expiresAt,
  expiresLabel,
  isExpired,
  initiallyOpen,
}: {
  templateId: string;
  hoursConfig: SignatureHoursConfig;
  expirationMode: ExpirationMode;
  expirationDays: number | null;
  expiresAt: string | null;
  expiresLabel: string | null;
  isExpired: boolean;
  initiallyOpen?: "hours" | "expiration" | null;
}) {
  const [openPanel, setOpenPanel] = useState<"hours" | "expiration" | null>(
    initiallyOpen ?? null,
  );
  const [hoursState, setHoursState] = useState(hoursConfig);
  const [expirationState, setExpirationState] = useState({
    mode: expirationMode,
    days: expirationDays,
    expiresAt,
    expiresLabel,
    isExpired,
  });

  useEffect(() => {
    setHoursState(hoursConfig);
  }, [hoursConfig]);

  useEffect(() => {
    setExpirationState({
      mode: expirationMode,
      days: expirationDays,
      expiresAt,
      expiresLabel,
      isExpired,
    });
  }, [expirationMode, expirationDays, expiresAt, expiresLabel, isExpired]);

  useEffect(() => {
    if (!initiallyOpen) return;
    const node = document.getElementById("disponibilite");
    if (!node) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [initiallyOpen]);

  const hoursSummary = summarizeHours(hoursState);
  const expirationSummary = summarizeExpiration({
    mode: expirationState.mode,
    expiresAt: expirationState.expiresAt,
    expiresLabel: expirationState.expiresLabel,
    isExpired: expirationState.isExpired,
  });

  function toggle(panel: "hours" | "expiration") {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }

  function handleHoursSaved(config: SignatureHoursConfig) {
    setHoursState(config);
    setOpenPanel(null);
  }

  function handleExpirationSaved(payload: ExpirationSavedPayload) {
    setExpirationState({
      mode: payload.mode,
      days: payload.days,
      expiresAt: payload.expiresAt,
      expiresLabel: payload.expiresLabel,
      isExpired: payload.isExpired,
    });
    setOpenPanel(null);
  }

  return (
    <section
      id="disponibilite"
      className="flex scroll-mt-6 flex-col gap-2.5 animate-fade-up"
    >
      <div>
        <h2 className="text-[0.95rem] font-semibold tracking-tight text-[var(--color-foreground)]">
          Disponibilité
        </h2>
        <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-[var(--color-muted)]">
          Quand cette décharge accepte les signatures.
        </p>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <AvailabilityCard
          icon={<CalendarClock size={15} strokeWidth={1.85} />}
          title="Horaires"
          description="Jours et heures d’acceptation."
          summary={hoursSummary}
          open={openPanel === "hours"}
          onToggle={() => toggle("hours")}
        >
          <SignatureHoursSettings
            key={[
              hoursState.enabled,
              hoursState.timezone,
              hoursState.start,
              hoursState.end,
              hoursState.days.join("-"),
            ].join("|")}
            templateId={templateId}
            initial={hoursState}
            onSaved={handleHoursSaved}
          />
        </AvailabilityCard>

        <AvailabilityCard
          icon={<Timer size={15} strokeWidth={1.85} />}
          title="Expiration"
          description="Fermeture automatique éventuelle."
          summary={expirationSummary}
          open={openPanel === "expiration"}
          onToggle={() => toggle("expiration")}
        >
          <ExpirationSettings
            key={[
              expirationState.mode,
              expirationState.days ?? "",
              expirationState.expiresAt ?? "",
            ].join("|")}
            templateId={templateId}
            initialMode={expirationState.mode}
            initialDays={expirationState.days}
            initialExpiresAt={expirationState.expiresAt}
            onSaved={handleExpirationSaved}
          />
        </AvailabilityCard>
      </div>
    </section>
  );
}
