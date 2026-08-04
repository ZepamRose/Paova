"use client";

import Link from "next/link";
import { Zap, QrCode } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";

type StationCardProps = {
  station: DashboardGroupRow;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

export function StationCard({ station }: StationCardProps) {
  // Calculer les signatures d'aujourd'hui (pour l'instant, on affiche le total)
  // TODO: Filtrer par date du jour quand on aura les données
  const signaturesToday = station.total;

  return (
    <Link
      href={`/dashboard/groupes/${station.id}`}
      className={`group block w-full text-left rounded-[10px] border border-[color-mix(in_srgb,#3b82f6_25%,var(--color-border))] bg-[color-mix(in_srgb,#3b82f6_2%,var(--color-surface))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_color-mix(in_srgb,#3b82f6_6%,transparent)] px-2.5 py-2 transition-[transform,box-shadow,border-color] ${motion} hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(59,130,246,0.15)] hover:border-[color-mix(in_srgb,#3b82f6_40%,var(--color-border))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]`}
    >
      <div className="space-y-2">
        {/* En-tête : nom + badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#3b82f6] text-white">
              <Zap size={12} strokeWidth={2.5} fill="currentColor" />
            </div>
            <h3 className="flex-1 truncate text-[13.5px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
              {station.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,#3b82f6_12%,transparent)] px-2 py-0.5">
            <QrCode size={11} strokeWidth={2.5} className="text-[#3b82f6]" />
            <span className="text-[10px] font-semibold tracking-tight text-[#3b82f6]">
              QR actif
            </span>
          </div>
        </div>

        {/* Statistique principale : signatures aujourd'hui */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-[20px] font-bold tabular-nums tracking-tight text-[#3b82f6]">
            {signaturesToday}
          </span>
          <span className="text-[11px] font-medium text-[var(--color-muted)]">
            signature{signaturesToday !== 1 ? "s" : ""} aujourd&apos;hui
          </span>
        </div>

        {/* Informations secondaires */}
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
          <span className="font-medium">{station.template_title}</span>
        </div>
      </div>
    </Link>
  );
}
