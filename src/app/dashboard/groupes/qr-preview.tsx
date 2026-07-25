"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { QrDownloadButton } from "./qr-download-button";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Same click-to-zoom QR pattern as the décharge detail page, adapted for groups. */
export function QrPreview({
  dataUrl,
  filename,
  downloadClassName,
}: {
  dataUrl: string;
  filename: string;
  downloadClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 40);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mx-auto overflow-hidden rounded-xl border border-black/[0.07] bg-white p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_-8px_rgba(0,0,0,0.14)] transition-[transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_28px_-10px_rgba(0,0,0,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 dark:border-white/[0.1]"
        aria-label="Agrandir le QR code"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt="QR code du groupe"
          className="h-[11rem] w-[11rem] transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.01]"
        />
        <span
          className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 shadow-sm transition-opacity duration-[180ms] group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          <Maximize2 size={13} strokeWidth={2} />
        </span>
      </button>

      <p className="text-center text-[11px] text-[var(--color-muted)]">
        Cliquer pour agrandir
      </p>

      <QrDownloadButton
        dataUrl={dataUrl}
        filename={filename}
        className={downloadClassName}
      />

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="qr-preview-dialog"
                  className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: "linear" }}
                >
                  <button
                    type="button"
                    aria-label="Fermer"
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/50 dark:bg-black/60"
                  />

                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    initial={reduced ? false : { y: 10, scale: 0.97 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={reduced ? undefined : { y: 8, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: EASE }}
                    className="relative z-10 w-full max-w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-3)] sm:p-6"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2
                          id={titleId}
                          className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]"
                        >
                          QR code
                        </h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
                          Affichez-le à l&apos;accueil ou imprimez-le pour un
                          scan facile.
                        </p>
                      </div>
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-[background-color,color] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                        aria-label="Fermer"
                      >
                        <X size={16} strokeWidth={1.85} aria-hidden />
                      </button>
                    </div>

                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[var(--elev-2)] dark:border-white/[0.08] sm:p-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dataUrl}
                        alt="QR code agrandi"
                        className="h-[min(70vw,20rem)] w-[min(70vw,20rem)] max-h-[20rem] max-w-[20rem]"
                      />
                    </div>

                    <div className="mt-5 flex justify-center">
                      <QrDownloadButton
                        dataUrl={dataUrl}
                        filename={filename}
                        className={downloadClassName}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
