"use client";

import { useState, useEffect } from "react";
import { QrCode, Maximize2, Printer, ExternalLink, Copy, Check, Search, Download, Archive, Trash2, ChevronDown, FileText, Clock, Activity } from "lucide-react";
import Link from "next/link";

type StationDetailViewProps = {
  stationId: string;
  stationName: string;
  templateTitle: string;
  publicUrl: string;
  qrDataUrl: string;
  signaturesToday: number;
  totalSignatures: number;
  lastSignatureAt?: Date | null;
  recentSignatures?: Array<{ name: string; signedAt: Date }>;
  createdAt?: Date;
  canArchive?: boolean;
  canDelete?: boolean;
};

const motion = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

// Fonction pour formater le temps relatif
function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "Aucune signature";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Il y a moins d'une minute";
  if (diffMins < 60) return `Il y a ${diffMins} min`;

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Aujourd'hui à ${timeStr}`;
  if (isYesterday) return `Hier à ${timeStr}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function StationDetailView({
  stationId,
  stationName,
  templateTitle,
  publicUrl,
  qrDataUrl,
  signaturesToday,
  totalSignatures,
  lastSignatureAt,
  recentSignatures = [],
  createdAt,
  canArchive = true,
  canDelete = true,
}: StationDetailViewProps) {
  const [kioskMode, setKioskMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  // Copy link handler
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Kiosk mode: auto-hide controls on mouse inactivity
  useEffect(() => {
    if (!kioskMode) return;

    const handleMouseMove = () => {
      setShowControls(true);
      if (hideTimeout) clearTimeout(hideTimeout);
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setHideTimeout(timeout);
    };

    document.addEventListener("mousemove", handleMouseMove);
    handleMouseMove(); // Initial trigger

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [kioskMode, hideTimeout]);

  if (kioskMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden">
        {/* Premium background - dégradé radial centré très subtil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a1a1a_0%,#0d0d0d_35%,#000000_100%)]" />

        {/* Vignette douce */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

        {/* Texture très légère */}
        <div className="absolute inset-0 opacity-[0.012] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />

        {/* Exit button - encore plus discret */}
        <button
          type="button"
          onClick={() => setKioskMode(false)}
          className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 py-1 text-[9.5px] font-medium text-white/20 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/50"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span>Quitter</span>
        </button>

        {/* Main content - centré et hiérarchisé */}
        <div className="relative flex flex-col items-center gap-4 px-6 sm:gap-5 md:gap-6 lg:gap-7 scale-90">

          {/* 1. Nom de l'activité - Plus discret et élégant */}
          <div className="text-center animate-[fadeIn_0.8s_ease-out]">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
              <h1 className="text-[1.125rem] font-semibold tracking-wide text-white/70 sm:text-[1.25rem] md:text-[1.375rem] lg:text-[1.5rem]">
                {stationName}
              </h1>
            </div>
          </div>

          {/* 2. QR Code GÉANT - Le héros absolu (agrandi de 8%) */}
          <div className="relative animate-[fadeIn_1s_ease-out_0.15s_both]" style={{ isolation: 'isolate' }}>
            {/* Halo avec respiration ultra-lente et discrète */}
            <div
              className="absolute -inset-9 rounded-[52px] bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent blur-[56px] animate-[breathe_8s_ease-in-out_infinite] sm:-inset-11 md:-inset-[52px]"
              style={{
                animationTimingFunction: 'cubic-bezier(0.4, 0.0, 0.6, 1.0)'
              }}
            />

            {/* Carte QR - grande et nette */}
            <div className="relative rounded-[32px] border-[5px] border-white bg-white p-5 shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.12)] sm:rounded-[40px] sm:p-7 md:p-10 lg:p-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code pour ${stationName}`}
                width={420}
                height={420}
                className="block w-[210px] h-[210px] sm:w-[262px] sm:h-[262px] md:w-[315px] md:h-[315px] lg:w-[420px] lg:h-[420px]"
              />
            </div>
          </div>

          {/* 3. Instructions - Message principal amélioré */}
          <div className="text-center space-y-2.5 animate-[fadeIn_1.2s_ease-out_0.3s_both] sm:space-y-3">
            <p className="text-[1.5rem] font-bold leading-tight tracking-tight text-white sm:text-[1.75rem] md:text-[2rem] lg:text-[2.5rem]">
              Scannez ce QR Code
            </p>
            <p className="text-[0.9375rem] font-medium leading-relaxed text-white/60 sm:text-[1.0625rem] md:text-[1.1875rem]">
              Signez votre décharge en moins d&apos;une minute
            </p>
          </div>
        </div>

        {/* Animations CSS */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes breathe {
            0%, 100% {
              opacity: 0.25;
              transform: scale(1);
            }
            50% {
              opacity: 0.4;
              transform: scale(1.03);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title - Plus compact et logo plus discret */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#5b9dd9,#4a8bc7)] shadow-[0_1px_2px_rgba(59,130,246,0.12)]">
              <QrCode size={14} strokeWidth={2.5} className="text-white/85" />
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[var(--color-foreground)]">
              {stationName}
            </h1>
          </div>
          <p className="text-[13px] text-[var(--color-muted)] pl-9.5">{templateTitle}</p>
        </div>
      </div>

      {/* Primary actions grid - Plus compacts */}
      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleCopyLink}
          className={`group inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.98]`}
        >
          {linkCopied ? (
            <Check size={12} strokeWidth={2.2} className="text-[var(--color-brand)]" />
          ) : (
            <Copy size={12} strokeWidth={2} />
          )}
          <span className="whitespace-nowrap">{linkCopied ? "Copié" : "Copier le lien"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className={`group inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.98]`}
        >
          <QrCode size={12} strokeWidth={2} />
          <span className="whitespace-nowrap">QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => setKioskMode(true)}
          className={`group inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.98]`}
        >
          <Maximize2 size={12} strokeWidth={2} />
          <span className="whitespace-nowrap">Mode kiosque</span>
        </button>

        <Link
          href={`/dashboard/groupes/${stationId}/print`}
          className={`group inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.98]`}
        >
          <Printer size={12} strokeWidth={2} />
          <span className="whitespace-nowrap">Imprimer</span>
        </Link>
      </div>

      {/* Stats cards - 3 indicateurs avec plus de personnalité */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="group relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,#3b82f6_18%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,#3b82f6_4.5%,var(--color-surface)),color-mix(in_srgb,#3b82f6_2%,var(--color-surface)))] p-3.5 shadow-[0_1px_2px_rgba(59,130,246,0.06)] transition-all ${motion} hover:-translate-y-0.5 hover:shadow-[0_3px_8px_rgba(59,130,246,0.12)]">
          <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-[#3b82f6] opacity-[0.045] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.09]" />
          <div className="relative">
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.09em] text-[color-mix(in_srgb,#3b82f6_65%,var(--color-foreground))]">
                Aujourd&apos;hui
              </div>
            </div>
            <div className="mb-0.5 text-[30px] font-bold leading-none tabular-nums tracking-tight text-[#3b82f6] transition-transform duration-200 group-hover:scale-[1.01]">
              {signaturesToday}
            </div>
            <div className="text-[11px] font-medium text-[var(--color-muted)]">
              signature{signaturesToday !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)]">
          <div className="absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-[var(--color-foreground)] opacity-[0.015] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.03]" />
          <div className="relative">
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.09em] text-[var(--color-muted)]">
                Total
              </div>
            </div>
            <div className="mb-0.5 text-[30px] font-bold leading-none tabular-nums tracking-tight text-[var(--color-foreground)] transition-transform duration-200 group-hover:scale-[1.01]">
              {totalSignatures}
            </div>
            <div className="text-[11px] font-medium text-[var(--color-muted)]">
              depuis création
            </div>
          </div>
        </div>

        <div className={`group relative overflow-hidden rounded-xl border ${lastSignatureAt ? 'border-[color-mix(in_srgb,#10b981_16%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,#10b981_3.5%,var(--color-surface)),color-mix(in_srgb,#10b981_1.5%,var(--color-surface)))]' : 'border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)]'} p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all ${motion} hover:-translate-y-0.5 hover:shadow-[0_3px_8px_rgba(0,0,0,0.06)]`}>
          <div className={`absolute top-0 right-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full ${lastSignatureAt ? 'bg-[#10b981] opacity-[0.04]' : 'bg-[var(--color-foreground)] opacity-[0.015]'} blur-2xl transition-opacity duration-300 group-hover:opacity-[0.08]`} />
          <div className="relative">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Clock size={9} strokeWidth={2.5} className={lastSignatureAt ? "text-[color-mix(in_srgb,#10b981_65%,var(--color-foreground))]" : "text-[var(--color-muted)]"} />
              <div className={`text-[9.5px] font-bold uppercase tracking-[0.09em] ${lastSignatureAt ? 'text-[color-mix(in_srgb,#10b981_65%,var(--color-foreground))]' : 'text-[var(--color-muted)]'}`}>
                Dernière
              </div>
            </div>
            <div className={`mb-0.5 text-[14px] font-bold leading-tight ${lastSignatureAt ? 'text-[#10b981]' : 'text-[var(--color-foreground)]'} transition-transform duration-200 group-hover:scale-[1.01]`}>
              {formatRelativeTime(lastSignatureAt)}
            </div>
            <div className="text-[11px] font-medium text-[var(--color-muted)]">
              signature reçue
            </div>
          </div>
        </div>
      </div>

      {/* Informations - Carte restructurée avec meilleure respiration */}
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h2 className="text-[12.5px] font-semibold text-[var(--color-foreground)] mb-3.5">
          Informations
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="text-[14px] mt-0.5">🟢</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-muted)] mb-0.5">
                Statut
              </div>
              <div className="text-[13px] font-semibold text-[var(--color-foreground)]">
                Active
              </div>
            </div>
          </div>

          <div className="h-px bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)]" />

          <div className="flex items-start gap-2.5">
            <div className="text-[14px] mt-0.5">📅</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-muted)] mb-0.5">
                Créée le
              </div>
              <div className="text-[13px] font-semibold text-[var(--color-foreground)]">
                {createdAt ? createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date inconnue"}
              </div>
            </div>
          </div>

          <div className="h-px bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)]" />

          <div className="flex items-start gap-2.5">
            <div className="text-[14px] mt-0.5">🌍</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-muted)] mb-0.5">
                Visibilité
              </div>
              <div className="text-[13px] font-semibold text-[var(--color-foreground)]">
                Publique
              </div>
            </div>
          </div>

          <div className="h-px bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)]" />

          <div className="flex items-start gap-2.5">
            <div className="text-[14px] mt-0.5">🔗</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[var(--color-muted)] mb-1.5">
                Lien public
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface-2)] px-2.5 py-2">
                  <div className="truncate font-mono text-[11px] text-[var(--color-muted)]">
                    {publicUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[var(--color-surface)] px-2.5 text-[11px] font-medium text-[var(--color-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all ${motion} hover:bg-[var(--color-surface-2)] active:scale-[0.97]`}
                >
                  {linkCopied ? (
                    <>
                      <Check size={11} strokeWidth={2.2} className="text-[var(--color-brand)]" />
                      <span className="text-[var(--color-brand)]">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} strokeWidth={2} />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions disponibles - Hiérarchie renforcée */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/70">
            Actions
          </h2>
          <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/dashboard/signatures?group=${stationId}`}
            className={`group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_3%,var(--color-surface)),color-mix(in_srgb,var(--color-brand)_1%,var(--color-surface)))] p-3 shadow-[0_1px_2px_rgba(59,130,246,0.04)] transition-all ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] hover:shadow-[0_2px_8px_rgba(59,130,246,0.08)]`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]">
              <FileText size={15} strokeWidth={2} className="text-[var(--color-brand)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-[var(--color-foreground)] mb-0.5">
                Consulter les signatures
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                Voir tous les PDF signés
              </div>
            </div>
            <ExternalLink
              size={13}
              strokeWidth={2}
              className={`shrink-0 text-[var(--color-muted)]/40 transition-all ${motion} group-hover:translate-x-0.5 group-hover:text-[var(--color-muted)]/60`}
            />
          </Link>

          <Link
            href={`/dashboard/signatures/search?group=${stationId}`}
            className={`group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-3 shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-all ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)]`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_6%,transparent)]">
              <Search size={15} strokeWidth={2} className="text-[var(--color-brand)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-[var(--color-foreground)] mb-0.5">
                Rechercher des signatures
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                Trouver une signature spécifique
              </div>
            </div>
            <ExternalLink
              size={13}
              strokeWidth={2}
              className={`shrink-0 text-[var(--color-muted)]/40 transition-all ${motion} group-hover:translate-x-0.5 group-hover:text-[var(--color-muted)]/60`}
            />
          </Link>

          <Link
            href={`/dashboard/groupes/${stationId}/export/pdfs`}
            className={`group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-3 shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-all ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)]`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_6%,transparent)]">
              <Download size={15} strokeWidth={2} className="text-[var(--color-brand)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-[var(--color-foreground)] mb-0.5">
                Télécharger les PDF
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                Export groupé des documents
              </div>
            </div>
            <ExternalLink
              size={13}
              strokeWidth={2}
              className={`shrink-0 text-[var(--color-muted)]/40 transition-all ${motion} group-hover:translate-x-0.5 group-hover:text-[var(--color-muted)]/60`}
            />
          </Link>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_3%,var(--color-surface)),color-mix(in_srgb,var(--color-brand)_1%,var(--color-surface)))] p-3 shadow-[0_1px_2px_rgba(59,130,246,0.04)] transition-all ${motion} hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] hover:shadow-[0_2px_8px_rgba(59,130,246,0.08)]`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]">
              <ExternalLink size={15} strokeWidth={2} className="text-[var(--color-brand)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-[var(--color-foreground)] mb-0.5">
                Ouvrir le formulaire
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                Accès direct au lien public
              </div>
            </div>
            <ExternalLink
              size={13}
              strokeWidth={2}
              className={`shrink-0 text-[var(--color-muted)]/40 transition-all ${motion} group-hover:translate-x-0.5 group-hover:text-[var(--color-muted)]/60`}
            />
          </a>
        </div>
      </div>

      {/* Activité récente - Timeline moderne */}
      {recentSignatures.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <Activity size={10} strokeWidth={2.5} className="text-[var(--color-muted)]/70 mt-0.5" />
            <h2 className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/70">
              Activité récente
            </h2>
            <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]" />
          </div>

          <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="divide-y divide-[color-mix(in_srgb,var(--color-border)_35%,transparent)]">
              {recentSignatures.slice(0, 5).map((sig, idx) => (
                <div key={idx} className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${motion} hover:bg-[var(--color-surface-2)]`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] text-[11.5px] font-semibold text-[var(--color-brand)]">
                      {sig.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-[12.5px] font-semibold text-[var(--color-foreground)]">
                      {sig.name}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-[var(--color-muted)]">
                    {formatRelativeTime(sig.signedAt)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_35%,transparent)] p-2.5">
              <Link
                href={`/dashboard/signatures?group=${stationId}`}
                className={`group inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-medium text-[var(--color-brand)] transition-all ${motion} hover:bg-[color-mix(in_srgb,var(--color-brand)_5%,transparent)]`}
              >
                <span>Voir toutes les signatures</span>
                <ExternalLink size={11} strokeWidth={2} className={`transition-transform ${motion} group-hover:translate-x-0.5`} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Zone de danger - Plus d'espace avant pour mieux séparer */}
      {(canArchive || canDelete) && (
        <div className="space-y-2.5 pt-6">
          <button
            type="button"
            onClick={() => setShowDangerZone(!showDangerZone)}
            className={`group flex w-full items-center justify-between rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] px-3.5 py-2.5 text-left transition-all ${motion} hover:border-[color-mix(in_srgb,#dc2626_15%,var(--color-border))] hover:bg-[color-mix(in_srgb,#dc2626_2%,var(--color-surface))]`}
          >
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/60 transition-colors group-hover:text-[color-mix(in_srgb,#dc2626_60%,var(--color-foreground))]">
                Zone de danger
              </div>
            </div>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`text-[var(--color-muted)]/50 transition-all ${motion} group-hover:text-[color-mix(in_srgb,#dc2626_60%,var(--color-foreground))] ${
                showDangerZone ? "rotate-180" : ""
              }`}
            />
          </button>

          {showDangerZone && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {canArchive && (
                <form action="/api/groups/archive" method="POST">
                  <input type="hidden" name="group_id" value={stationId} />
                  <button
                    type="submit"
                    className={`group flex w-full items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-3 text-left shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-all ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] hover:bg-[var(--color-surface-2)]`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-muted)_6%,transparent)]">
                      <Archive size={15} strokeWidth={2} className="text-[var(--color-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-[var(--color-foreground)]">
                        Archiver cette signature libre
                      </div>
                      <div className="text-[11px] text-[var(--color-muted)]">
                        La retirer de la liste active
                      </div>
                    </div>
                  </button>
                </form>
              )}

              {canDelete && (
                <form action="/api/groups/delete" method="POST">
                  <input type="hidden" name="group_id" value={stationId} />
                  <button
                    type="submit"
                    className={`group flex w-full items-center gap-3 rounded-lg border border-[color-mix(in_srgb,#dc2626_20%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_2.5%,var(--color-surface))] p-3 text-left shadow-[0_1px_1px_rgba(220,38,38,0.02)] transition-all ${motion} hover:border-[color-mix(in_srgb,#dc2626_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,#dc2626_4%,var(--color-surface))]`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,#dc2626_8%,transparent)]">
                      <Trash2 size={15} strokeWidth={2} className="text-[#dc2626]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-[color-mix(in_srgb,#dc2626_85%,var(--color-foreground))]">
                        Supprimer définitivement
                      </div>
                      <div className="text-[11px] text-[var(--color-muted)]">
                        Action irréversible si aucune signature
                      </div>
                    </div>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowQrModal(false)}
              className={`absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-all ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 className="mb-4 text-[16px] font-bold text-[var(--color-foreground)]">
              {stationName}
            </h3>

            <div className="flex justify-center rounded-xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code — ${stationName}`}
                width={240}
                height={240}
              />
            </div>

            <div className="mt-4 rounded-xl bg-[var(--color-surface-2)] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/60">
                Lien public
              </p>
              <p className="break-all font-mono text-[12px] text-[var(--color-foreground)]">
                {publicUrl}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
