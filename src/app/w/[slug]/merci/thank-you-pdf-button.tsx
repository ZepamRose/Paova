"use client";

import { useState } from "react";
import { Check, FileDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION =
  "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Keep the UI from spinning forever if PDF generation stalls. */
const FETCH_TIMEOUT_MS = 45_000;

type Status = "idle" | "preparing" | "done" | "error";

export function ThankYouPdfButton({
  href,
  brandColor,
  radiusClass,
  emphasis,
  documentLabel,
}: {
  href: string;
  brandColor: string;
  radiusClass: string;
  /** Filled primary when true; outline when false. */
  emphasis: boolean;
  documentLabel: "autorisation" | "décharge";
}) {
  const reduced = useReducedMotion() ?? false;
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    if (status === "preparing") return;
    setStatus("preparing");

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(href, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`PDF failed (${res.status})`);

      const blob = await res.blob();
      if (!blob.size) throw new Error("Empty PDF");

      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? "copie-signature.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      // Fallback: let the browser navigate to the download URL.
      try {
        const a = document.createElement("a");
        a.href = href;
        a.rel = "noopener";
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3200);
    } finally {
      window.clearTimeout(timer);
    }
  }

  const busy = status === "preparing";

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        aria-label={
          busy
            ? "Préparation de votre document"
            : status === "done"
              ? "Document téléchargé"
              : status === "error"
                ? "Échec du téléchargement — réessayer"
                : "Télécharger le PDF"
        }
        className={`relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden ${radiusClass} border px-5 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,filter,opacity] ${MOTION} hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-85`}
        style={
          emphasis
            ? {
                backgroundColor: brandColor,
                borderColor: brandColor,
                color: "#fff",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 2px rgba(0,0,0,0.06), 0 10px 22px -12px rgba(0,0,0,0.32)",
              }
            : {
                backgroundColor:
                  "color-mix(in srgb, var(--color-surface) 92%, var(--color-surface-2))",
                borderColor: `color-mix(in srgb, ${brandColor} 38%, var(--color-border))`,
                color: brandColor,
                boxShadow: "var(--elev-1)",
              }
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.span
              key="preparing"
              initial={reduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              <svg
                className="animate-spin"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="2.5"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              Préparation…
            </motion.span>
          ) : status === "done" ? (
            <motion.span
              key="done"
              initial={reduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              <Check size={15} strokeWidth={2.2} aria-hidden />
              Téléchargé
            </motion.span>
          ) : status === "error" ? (
            <motion.span
              key="error"
              initial={reduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              <FileDown size={15} strokeWidth={1.85} aria-hidden />
              Réessayer le PDF
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={reduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              <FileDown size={15} strokeWidth={1.85} aria-hidden />
              Télécharger le PDF
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <p className="text-center text-[12px] leading-relaxed text-[var(--color-muted)]/68">
        {status === "error"
          ? "Le téléchargement a pris trop de temps. Réessayez."
          : `Conservez votre exemplaire de ${documentLabel}.`}
      </p>
    </div>
  );
}
