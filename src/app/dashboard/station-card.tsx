"use client";

import Link from "next/link";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { StationActionsMenu } from "./station-actions-menu";

type StationCardProps = {
  station: DashboardGroupRow;
  appUrl: string;
  canArchive?: boolean;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

function formatCreatedDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

export function StationCard({ station, appUrl, canArchive = true }: StationCardProps) {
  const publicUrl = `${appUrl}/g/${station.public_token}`;
  const totalSignatures = station.total;

  return (
    <div className="group relative">
      <Link
        href={`/dashboard/groupes/${station.id}`}
        className={`block w-full rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[transform,box-shadow,border-color] ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_2px_6px_-2px_rgba(0,0,0,0.04)]`}
      >
        <div className="flex flex-col gap-2 p-3">
          {/* Header : Nom + Badge + Menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-foreground)]">
                {station.name}
              </h3>

              {/* Badge discret */}
              <div className="inline-flex w-fit items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] px-1.5 py-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2.5" className="text-[var(--color-brand)]" />
                  <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--color-brand)]" />
                </svg>
                <span className="text-[10px] font-medium tracking-tight text-[var(--color-brand)]/70">
                  Signature libre
                </span>
              </div>
            </div>

            {/* Menu d'actions */}
            <div className="shrink-0" onClick={(e) => e.preventDefault()}>
              <StationActionsMenu
                id={station.id}
                name={station.name}
                publicUrl={publicUrl}
                archived={station.status === "archived"}
                canArchive={canArchive}
              />
            </div>
          </div>

          {/* Métadonnées : Date de création */}
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Créée le {formatCreatedDate(station.created_at)}</span>
          </div>

          {/* Statistique principale */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
              {totalSignatures}
            </span>
            <span className="text-[13px] font-medium text-[var(--color-muted)]">
              signature{totalSignatures !== 1 ? "s" : ""} collectée{totalSignatures !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Informations secondaires : Modèle */}
          <div className="flex flex-col gap-1 pt-0.5">
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate font-medium">{station.template_title}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
