"use client";

import { useState, useEffect } from "react";
import { QrCode, Maximize2, Printer, ExternalLink } from "lucide-react";
import Link from "next/link";

type StationDetailViewProps = {
  stationId: string;
  stationName: string;
  templateTitle: string;
  publicUrl: string;
  qrDataUrl: string;
  signaturesToday: number;
  totalSignatures: number;
};

const motion = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function StationDetailView({
  stationId,
  stationName,
  templateTitle,
  publicUrl,
  qrDataUrl,
  signaturesToday,
  totalSignatures,
}: StationDetailViewProps) {
  const [kioskMode, setKioskMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a]">
        {/* Controls overlay */}
        <div
          className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between gap-4 bg-gradient-to-b from-white/95 to-transparent dark:from-[#0a0a0a]/95 px-8 py-6 pb-12">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-[var(--color-foreground)]">
                {stationName}
              </h1>
              <p className="text-[14px] text-[var(--color-muted)]">{templateTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setKioskMode(false)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold text-[var(--color-foreground)] shadow-sm transition-[transform,box-shadow] ${motion} hover:-translate-y-px hover:shadow-md`}
            >
              Quitter le mode kiosque
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center gap-8">
          <div className="rounded-3xl bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR Code — ${stationName}`} width={400} height={400} className="block" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-[var(--color-foreground)]">
              Scannez pour signer
            </p>
            <p className="mt-2 font-mono text-[14px] text-[var(--color-muted)]">
              {publicUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </div>

        {/* Stats overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="bg-gradient-to-t from-white/95 to-transparent dark:from-[#0a0a0a]/95 px-8 py-12 pt-12 pb-6">
            <div className="flex justify-center gap-12">
              <div className="text-center">
                <div className="text-[36px] font-bold tabular-nums text-[#3b82f6]">
                  {signaturesToday}
                </div>
                <div className="text-[13px] font-medium text-[var(--color-muted)]">
                  Aujourd&apos;hui
                </div>
              </div>
              <div className="text-center">
                <div className="text-[36px] font-bold tabular-nums text-[var(--color-foreground)]">
                  {totalSignatures}
                </div>
                <div className="text-[13px] font-medium text-[var(--color-muted)]">
                  Total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#3b82f6]">
              <QrCode size={14} strokeWidth={2.5} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold tracking-tight text-[var(--color-foreground)]">
              {stationName}
            </h1>
          </div>
          <p className="text-[13px] text-[var(--color-muted)]">{templateTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKioskMode(true)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,transform,box-shadow] ${motion} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-md`}
          >
            <Maximize2 size={14} strokeWidth={2} />
            Mode kiosque
          </button>
          <Link
            href={`/dashboard/groupes/${stationId}/print`}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,transform,box-shadow] ${motion} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-md`}
          >
            <Printer size={14} strokeWidth={2} />
            Imprimer A4
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[color-mix(in_srgb,#3b82f6_20%,var(--color-border))] bg-[color-mix(in_srgb,#3b82f6_3%,var(--color-surface))] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Aujourd&apos;hui
          </div>
          <div className="mt-2 text-[32px] font-bold tabular-nums text-[#3b82f6]">
            {signaturesToday}
          </div>
          <div className="text-[12px] text-[var(--color-muted)]">
            signature{signaturesToday !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Total
          </div>
          <div className="mt-2 text-[32px] font-bold tabular-nums text-[var(--color-foreground)]">
            {totalSignatures}
          </div>
          <div className="text-[12px] text-[var(--color-muted)]">
            signature{totalSignatures !== 1 ? "s" : ""} depuis création
          </div>
        </div>
      </div>

      {/* QR Code section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--color-foreground)]">
          QR Code pour signature
        </h2>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR Code — ${stationName}`} width={280} height={280} />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
            <ExternalLink size={14} strokeWidth={2} className="text-[var(--color-muted)]" />
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[12px] text-[var(--color-foreground)] hover:text-[#3b82f6]"
            >
              {publicUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
