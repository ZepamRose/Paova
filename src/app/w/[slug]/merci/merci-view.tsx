"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

function useShowKioskCta(forcedBorne: boolean) {
  const [show, setShow] = useState(forcedBorne);

  useEffect(() => {
    if (forcedBorne) {
      setShow(true);
      return;
    }
    const mq = window.matchMedia("(pointer: coarse) and (min-width: 768px)");
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [forcedBorne]);

  return show;
}

function CopyReference({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Référence copiée" : "Copier la référence"}
      title={copied ? "Copié" : "Copier"}
      className="group/copy relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-1.5 text-[var(--color-muted)]/65 transition-[color,background-color,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.97]"
    >
      {copied ? (
        <>
          <Check
            size={13}
            strokeWidth={2.2}
            className="text-[var(--color-brand)]"
            aria-hidden
          />
          <span className="text-[11px] font-medium text-[var(--color-brand)]">
            Copié
          </span>
        </>
      ) : (
        <>
          <Copy size={13} strokeWidth={1.85} aria-hidden />
          <span
            role="tooltip"
            className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[var(--color-foreground)] opacity-0 shadow-[var(--elev-2)] transition-opacity duration-[160ms] group-hover/copy:opacity-100"
          >
            Copier
          </span>
        </>
      )}
    </button>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-1 gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <span className="text-[11px] font-medium text-[var(--color-muted)]/88">
        {label}
      </span>
      <div className="min-w-0 text-[14px] font-medium tracking-tight text-[var(--color-foreground)] sm:text-right">
        {children}
      </div>
    </li>
  );
}

export function MerciView({
  slug,
  businessName,
  logoUrl,
  brandColor,
  signedAt,
  reference,
  borne,
}: {
  slug: string;
  businessName: string | null;
  logoUrl: string | null;
  brandColor: string;
  signedAt: string | null;
  reference: string | null;
  borne: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const showKioskCta = useShowKioskCta(borne);
  const name = businessName?.trim() || "l'établissement";

  const dateLabel = signedAt
    ? new Date(signedAt).toLocaleString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-[color-mix(in_srgb,var(--color-background)_94%,var(--color-surface-2))] px-5 py-8 sm:px-6 sm:py-10">
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] px-6 py-7 shadow-[var(--elev-3)] sm:px-7 sm:py-8"
      >
        <div className="flex flex-col items-center text-center">
          {logoUrl ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE, delay: reduced ? 0 : 0.02 }}
              className="mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.08] bg-[#f0f2f5] p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_18px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.03] dark:border-black/12 dark:bg-[#e4e7ec] dark:shadow-[0_1px_2px_rgba(0,0,0,0.22),0_10px_20px_-12px_rgba(0,0,0,0.4)] dark:ring-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={businessName ?? "Logo"}
                className="h-full w-full scale-[1.12] object-contain"
              />
            </motion.div>
          ) : null}

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.32,
              ease: EASE,
              delay: reduced ? 0 : logoUrl ? 0.1 : 0.04,
            }}
            className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center"
            aria-hidden
          >
            {/* Soft green halo — kept subtle so the check stays primary */}
            <span className="absolute inset-[-4px] rounded-full bg-[color-mix(in_srgb,#16a34a_7%,transparent)] dark:bg-[color-mix(in_srgb,#4ade80_8%,transparent)]" />
            <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,#16a34a_14%,transparent)] text-[#16a34a] shadow-[0_1px_2px_rgba(22,163,74,0.12),0_12px_28px_-12px_rgba(22,163,74,0.42)] ring-1 ring-[color-mix(in_srgb,#16a34a_24%,transparent)] dark:bg-[color-mix(in_srgb,#4ade80_16%,transparent)] dark:text-[#a7f3d0] dark:ring-[color-mix(in_srgb,#4ade80_28%,transparent)]">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.55"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: EASE,
              delay: reduced ? 0 : logoUrl ? 0.16 : 0.1,
            }}
            className="flex flex-col items-center"
          >
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#15803d] dark:text-[#86efac]">
              Succès
            </p>
            <h1 className="mt-1.5 text-[1.55rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.65rem]">
              Décharge signée
            </h1>

            <p className="mt-2.5 max-w-[26rem] text-[14.5px] leading-relaxed text-[var(--color-muted)]/82">
              Votre signature a été enregistrée avec succès auprès de{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {name}
              </span>
              .
            </p>
            {!showKioskCta ? (
              <p className="mt-1.5 max-w-[26rem] text-[13px] leading-relaxed text-[var(--color-muted)]/68">
                Vous pouvez maintenant fermer cette page en toute sécurité.
              </p>
            ) : null}
          </motion.div>

          {businessName || dateLabel || reference ? (
            <div className="mt-6 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_65%,var(--color-surface-2))] px-4 py-4 text-left shadow-[var(--elev-1)] sm:px-5 sm:py-[1.125rem]">
              <ul className="flex flex-col gap-3.5">
                {businessName ? (
                  <InfoRow label="Établissement">{businessName}</InfoRow>
                ) : null}
                {dateLabel ? <InfoRow label="Date">{dateLabel}</InfoRow> : null}
                {reference ? (
                  <InfoRow label="Référence">
                    <span className="inline-flex items-center justify-end gap-0.5">
                      <span className="font-mono text-[13px] tracking-tight">
                        {reference}
                      </span>
                      <CopyReference value={reference} />
                    </span>
                  </InfoRow>
                ) : null}
              </ul>
            </div>
          ) : null}

          {showKioskCta ? (
            <div className="mt-6 flex w-full flex-col gap-2.5">
              <Link
                href={`/w/${slug}${borne ? "?borne=1" : ""}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_24px_-12px_rgba(0,0,0,0.35)] transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]"
                style={{ backgroundColor: brandColor }}
              >
                Faire signer la personne suivante
              </Link>
              <p className="text-[12px] leading-relaxed text-[var(--color-muted)]/62">
                Pour l&apos;équipe : ouvre un nouveau formulaire sur cette
                borne.
              </p>
            </div>
          ) : null}
        </div>
      </motion.section>
    </main>
  );
}
