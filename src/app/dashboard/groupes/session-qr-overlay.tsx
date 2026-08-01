"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, QrCode } from "lucide-react";
import { CopyLinkButton } from "@/app/dashboard/copy-link-button";

/**
 * Bouton QR + overlay plein écran.
 *
 * L'opérateur clique → overlay s'ouvre, QR centré, grand.
 * Il retourne la tablette vers le client qui scanne.
 * Fermeture : clic sur ×, clic sur le fond, ou touche Escape.
 */
export function SessionQrOverlay({
  qrDataUrl,
  publicUrl,
  sessionName,
  className,
}: {
  qrDataUrl: string;
  publicUrl: string;
  sessionName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Fermeture au clavier
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Verrouiller le scroll en arrière-plan
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Afficher le QR code"
      >
        <QrCode size={15} strokeWidth={1.85} aria-hidden />
        QR
      </button>

      {/* Overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`QR code — ${sessionName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Bouton fermer */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>

          {/* Carte QR */}
          <div
            className="flex flex-col items-center gap-5 rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="max-w-[240px] text-center text-[14px] font-semibold tracking-tight text-gray-900">
              {sessionName}
            </p>

            {/* QR code */}
            <div className="overflow-hidden rounded-xl">
              <Image
                src={qrDataUrl}
                alt={`QR code — ${sessionName}`}
                width={280}
                height={280}
                priority
                unoptimized
                className="block"
              />
            </div>

            {/* URL raccourcie */}
            <p className="max-w-[240px] truncate text-center font-mono text-[12px] text-gray-500">
              {publicUrl}
            </p>

            <CopyLinkButton
              url={publicUrl}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
            />
          </div>
        </div>
      )}
    </>
  );
}
