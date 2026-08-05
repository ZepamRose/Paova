"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";

type PrintViewProps = {
  stationName: string;
  templateTitle: string;
  publicUrl: string;
  qrDataUrl: string;
};

export function PrintView({
  stationName,
  templateTitle,
  publicUrl,
  qrDataUrl,
}: PrintViewProps) {
  const router = useRouter();

  useEffect(() => {
    // Auto-trigger print dialog after page loads
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Screen-only controls */}
      <div className="print:hidden fixed top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3b82f6] px-4 text-[13px] font-semibold text-white shadow-lg transition-[transform,filter] duration-200 hover:scale-105 hover:brightness-110 active:scale-[0.98]"
        >
          <Printer size={16} strokeWidth={2} />
          Imprimer
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-[var(--color-surface-2)] active:scale-[0.98]"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Print content - Affiche A4 minimaliste */}
      <div className="min-h-screen bg-white print:bg-white">
        <div className="mx-auto flex min-h-screen max-w-[210mm] flex-col items-center justify-center gap-8 px-8 print:gap-12 print:px-0">

          {/* QR Code - 70% de l'attention visuelle */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR Code"
              width={800}
              height={800}
              className="block w-[320px] h-[320px] print:w-[500px] print:h-[500px]"
            />
          </div>

          {/* Instructions - 20% + 10% */}
          <div className="text-center space-y-2 print:space-y-3">
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-black print:text-[44px]">
              Scannez pour signer
            </h1>
            <p className="text-[16px] font-normal leading-relaxed text-gray-600 print:text-[20px]">
              Utilisez l&apos;appareil photo de votre téléphone
            </p>
          </div>

        </div>
      </div>

      {/* Print-specific styles - Affiche A4 pure */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 20mm 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Force une seule page */
          html, body {
            height: 100%;
            overflow: hidden;
          }
        }
      `}</style>
    </>
  );
}
