"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, FileText, Calendar, Clock, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClosingMode } from "@/lib/groups/lifecycle";

const EASE = [0.22, 1, 0.36, 1] as const;

function formatDateTime(date: Date | null, time: string): string {
  if (!date || !time) return "";
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(date, now)) return `Aujourd'hui à ${time}`;
  if (sameDay(date, tomorrow)) return `Demain à ${time}`;

  const d = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return `${d} à ${time}`;
}

function formatClosingMode(mode: ClosingMode, durationMinutes: number | null): string {
  if (mode === "manual") return "Fermeture manuelle";
  if (mode === "duration" && durationMinutes) {
    if (durationMinutes < 60) return `Fin après ${durationMinutes} min`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m === 0 ? `Fin après ${h} h` : `Fin après ${h} h ${m}`;
  }
  if (mode === "fixed_time") return "Fin à heure fixe";
  if (mode === "business_close") return "Fin à la fermeture";
  return "";
}

type SummaryItem = {
  key: string;
  icon: typeof FileText;
  text: string;
  badge?: string;
  highlight?: boolean;
  muted?: boolean;
};

export function LiveSummary({
  name,
  startDate,
  startTime,
  closingMode,
  durationMinutes,
  requiresSignature,
  selected,
  signatureMode,
}: {
  name: string;
  startDate: Date | null;
  startTime: string;
  closingMode: ClosingMode;
  durationMinutes: number | null;
  requiresSignature: boolean;
  selected: { title: string } | null;
  signatureMode: "individual" | "group_representative";
}) {
  const items = useMemo<SummaryItem[]>(() => {
    const result: SummaryItem[] = [];

    if (name?.trim()) {
      result.push({
        key: "name",
        icon: FileText,
        text: name.trim(),
      });
    }

    if (startDate && startTime) {
      result.push({
        key: "time",
        icon: Calendar,
        text: formatDateTime(startDate, startTime),
      });
    }

    if (closingMode !== "manual") {
      const text = formatClosingMode(closingMode, durationMinutes);
      if (text) {
        result.push({
          key: "closing",
          icon: Clock,
          text,
        });
      }
    }

    if (requiresSignature && selected) {
      result.push({
        key: "waiver",
        icon: Shield,
        text: selected.title,
        badge: signatureMode === "individual" ? "Indiv." : "Repr.",
        highlight: true,
      });
    } else if (!requiresSignature) {
      result.push({
        key: "no-waiver",
        icon: Shield,
        text: "Sans décharge",
        muted: true,
      });
    }

    result.push({
      key: "participants",
      icon: Users,
      text: "Participants ajoutés après",
      muted: true,
    });

    return result;
  }, [name, startDate, startTime, closingMode, durationMinutes, requiresSignature, selected, signatureMode]);

  return (
    <div className="min-h-[110px] rounded-xl border border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-gradient-to-br from-[var(--color-surface-2)]/50 to-[var(--color-surface-2)]/20 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles size={11} className="text-[var(--color-brand)]" strokeWidth={2.5} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/70">
          Récapitulatif
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="flex flex-col gap-1.5">
          {items.map((item) => (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, x: -8, filter: "blur(2px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -8, filter: "blur(2px)" }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-2"
            >
              <item.icon
                size={12}
                className={cn(
                  "shrink-0",
                  item.highlight
                    ? "text-[var(--color-brand)]/80"
                    : item.muted
                      ? "text-[var(--color-muted)]/40"
                      : "text-[var(--color-muted)]/60"
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "text-[12.5px]",
                  item.muted
                    ? "text-[var(--color-muted)]/70"
                    : item.highlight
                      ? "font-medium text-[var(--color-foreground)]"
                      : "font-medium text-[var(--color-foreground)]"
                )}
              >
                {item.text}
                {item.badge && (
                  <span className="ml-1.5 rounded bg-[var(--color-brand)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
                    {item.badge}
                  </span>
                )}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
