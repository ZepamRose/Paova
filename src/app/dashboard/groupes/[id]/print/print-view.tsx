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
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3b82f6] px-4 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          <Printer size={16} strokeWidth={2} />
          Imprimer
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm transition-transform hover:scale-105"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Print content */}
      <div className="min-h-screen bg-white p-8 print:p-0">
        <div className="mx-auto flex min-h-screen max-w-[210mm] flex-col items-center justify-center gap-8 print:gap-12">

          {/* Header */}
          <div className="text-center">
            <h1 className="mb-2 text-[32px] font-bold tracking-tight text-black print:text-[40px]">
              {stationName}
            </h1>
            <p className="text-[18px] text-gray-600 print:text-[20px]">
              {templateTitle}
            </p>
          </div>

          {/* QR Code - Large */}
          <div className="flex flex-col items-center gap-6">
            <div className="rounded-3xl bg-white p-8 shadow-2xl print:rounded-none print:p-0 print:shadow-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code pour ${stationName}`}
                width={400}
                height={400}
                className="block print:w-[500px] print:h-[500px]"
              />
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="mb-3 text-[24px] font-semibold text-black print:text-[28px]">
                Scannez pour signer votre décharge
              </p>
              <p className="text-[16px] text-gray-600 print:text-[18px]">
                Utilisez l&apos;appareil photo de votre téléphone
              </p>
            </div>
          </div>

          {/* URL */}
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-4 print:border-gray-300 print:bg-white">
            <p className="text-center font-mono text-[14px] font-medium text-gray-700 print:text-[16px]">
              {publicUrl}
            </p>
          </div>

          {/* Footer note */}
          <div className="text-center text-[12px] text-gray-500 print:text-[14px]">
            <p>Ce QR code reste actif en permanence</p>
            <p className="mt-1">Aucune limite de signatures</p>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
