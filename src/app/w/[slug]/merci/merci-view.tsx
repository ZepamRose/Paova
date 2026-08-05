"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buttonRadiusClass,
  DEFAULT_BUTTON_RADIUS,
  formatThankYouMessage,
  type BrandButtonRadius,
} from "@/lib/branding";
import { ThankYouPdfButton } from "./thank-you-pdf-button";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION =
  "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

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

function SuccessMark({ reduced }: { reduced: boolean }) {
  return (
    <div
      className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center"
      aria-hidden
    >
      {!reduced ? (
        <>
          <motion.span
            className="absolute inset-[-10px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.92, 1.06, 1], opacity: [0, 0.5, 0.2] }}
            transition={{ duration: 0.75, ease: EASE }}
          />
          <motion.span
            className="absolute inset-0 rounded-full ring-[1.5px] ring-[color-mix(in_srgb,var(--color-brand)_28%,transparent)]"
            initial={{ scale: 0.75, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
          />
        </>
      ) : null}
      <motion.div
        className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-brand)_22%,transparent),0_12px_28px_-14px_color-mix(in_srgb,var(--color-brand)_45%,transparent),0_4px_12px_-4px_color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
        initial={reduced ? false : { scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 380, damping: 26, delay: 0.05 }
        }
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6 9 17l-5-5"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    pathLength: {
                      duration: 0.42,
                      ease: EASE,
                      delay: 0.22,
                    },
                    opacity: { duration: 0.08, delay: 0.22 },
                  }
            }
          />
        </svg>
      </motion.div>
    </div>
  );
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
      className={`relative inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[var(--color-muted)]/60 transition-[color,background-color,transform] ${MOTION} before:absolute before:-inset-0.5 before:content-[''] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-foreground)]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.96]`}
    >
      {copied ? (
        <>
          <Check
            size={12}
            strokeWidth={2.4}
            className="text-[var(--color-brand)]"
            aria-hidden
          />
          <span className="text-[10.5px] font-medium text-[var(--color-brand)]">
            Copié
          </span>
        </>
      ) : (
        <Copy size={12} strokeWidth={1.9} aria-hidden />
      )}
    </button>
  );
}

function InfoRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <li
      className={`grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center sm:gap-3 ${
        last
          ? ""
          : "border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]"
      }`}
    >
      <span className="text-[11px] font-medium tracking-tight text-[var(--color-muted)]/85">
        {label}
      </span>
      <div className="min-w-0 text-[13px] font-medium tracking-tight text-[var(--color-foreground)] sm:text-right">
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
  brandAccent,
  buttonRadius = DEFAULT_BUTTON_RADIUS,
  thankYouTitle,
  thankYouMessage,
  thankYouButtonLabel,
  thankYouButtonUrl,
  signedAt,
  reference,
  pdfHref = null,
  borne,
  isLegalRep = false,
  emailFailed = false,
}: {
  slug: string;
  businessName: string | null;
  logoUrl: string | null;
  brandColor: string;
  brandAccent?: string;
  buttonRadius?: BrandButtonRadius;
  thankYouTitle?: string | null;
  thankYouMessage?: string | null;
  thankYouButtonLabel?: string | null;
  thankYouButtonUrl?: string | null;
  signedAt: string | null;
  reference: string | null;
  pdfHref?: string | null;
  borne: boolean;
  isLegalRep?: boolean;
  emailFailed?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const showKioskCta = useShowKioskCta(borne);
  const name = businessName?.trim() || "l'établissement";
  const accent = brandAccent || brandColor;
  const radiusClass = buttonRadiusClass(buttonRadius);
  const customTitle = thankYouTitle?.trim() || null;
  const title =
    customTitle ||
    (isLegalRep ? "Autorisation enregistrée" : "Décharge signée");
  const defaultMessage = isLegalRep
    ? `Votre autorisation a été enregistrée avec succès auprès de ${name}.`
    : `Votre signature a été enregistrée avec succès auprès de ${name}.`;
  const message = formatThankYouMessage(
    thankYouMessage,
    businessName?.trim() || name,
    defaultMessage,
  );
  const externalCtaUrl = thankYouButtonUrl?.trim() || null;
  const externalCtaLabel =
    thankYouButtonLabel?.trim() || "Retour au site";

  const dateLabel = signedAt
    ? new Date(signedAt).toLocaleString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const hasReceipt = Boolean(businessName || dateLabel || reference);
  const hasActions = Boolean(pdfHref || showKioskCta || externalCtaUrl);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -left-24 top-[-4rem] h-80 w-80 rounded-full opacity-[0.14] blur-3xl dark:opacity-[0.12]"
          style={{
            background: `radial-gradient(circle, ${brandColor} 0%, transparent 68%)`,
          }}
        />
        <div
          className="absolute -right-20 bottom-[12%] h-72 w-72 rounded-full opacity-[0.1] blur-3xl dark:opacity-[0.1]"
          style={{
            background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          }}
        />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-[26.5rem] flex-col items-center justify-center gap-4 px-5 py-8 sm:px-6 sm:py-10">
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          className="w-full rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-6 py-7 shadow-[var(--elev-3)] sm:px-7 sm:py-8"
        >
          <div className="flex flex-col items-center text-center">
            {logoUrl ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.26,
                  ease: EASE,
                  delay: reduced ? 0 : 0.02,
                }}
                className="mb-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] p-1.5 shadow-[var(--elev-1)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={businessName ?? "Logo"}
                  className="h-full w-full object-contain"
                />
              </motion.div>
            ) : businessName ? (
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.26,
                  ease: EASE,
                  delay: reduced ? 0 : 0.02,
                }}
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl text-[12.5px] font-semibold text-[var(--color-on-brand)] shadow-[var(--elev-1)]"
                style={{ backgroundColor: brandColor }}
                aria-hidden
              >
                {businessName.trim().charAt(0).toUpperCase()}
              </motion.span>
            ) : null}

            <SuccessMark reduced={reduced} />

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                ease: EASE,
                delay: reduced ? 0 : 0.26,
              }}
              className="mt-4 flex flex-col items-center"
            >
              <h1 className="text-[1.65rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-[22rem] whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                {message}
              </p>
              {emailFailed ? (
                <p
                  role="status"
                  className="mt-2.5 max-w-[22rem] rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_50%,var(--color-background))] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-foreground)]/85"
                >
                  L&apos;e-mail de confirmation n&apos;a pas pu être envoyé.
                  {pdfHref
                    ? " Téléchargez votre PDF ci-dessous pour en conserver une copie."
                    : " Conservez la référence ci-dessous."}
                </p>
              ) : null}
            </motion.div>

            {hasReceipt ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.32,
                  ease: EASE,
                  delay: reduced ? 0 : 0.36,
                }}
                className="mt-5 w-full rounded-[0.875rem] border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_38%,var(--color-background))] px-4 py-1 text-left sm:px-4.5"
              >
                <ul className="flex flex-col">
                  {businessName ? (
                    <InfoRow label="Établissement" last={!dateLabel && !reference}>
                      {businessName}
                    </InfoRow>
                  ) : null}
                  {dateLabel ? (
                    <InfoRow label="Date" last={!reference}>
                      {dateLabel}
                    </InfoRow>
                  ) : null}
                  {reference ? (
                    <InfoRow label="Référence" last>
                      <span className="inline-flex items-center justify-end gap-1">
                        <span className="font-mono text-[12px] tracking-tight text-[var(--color-foreground)]/90">
                          {reference}
                        </span>
                        <CopyReference value={reference} />
                      </span>
                    </InfoRow>
                  ) : null}
                </ul>
              </motion.div>
            ) : null}

            {hasActions ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.32,
                  ease: EASE,
                  delay: reduced ? 0 : 0.44,
                }}
                className="mt-5 flex w-full flex-col gap-2.5"
              >
                {showKioskCta ? (
                  <div className="flex w-full flex-col gap-2">
                    <Link
                      href={`/w/${slug}${borne ? "?borne=1" : ""}`}
                      className={`inline-flex h-12 w-full items-center justify-center ${radiusClass} px-5 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.08),0_12px_26px_-14px_rgba(0,0,0,0.36)] transition-[transform,filter,box-shadow] ${MOTION} hover:-translate-y-[1.5px] hover:shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_2px_4px_rgba(0,0,0,0.1),0_16px_32px_-16px_rgba(0,0,0,0.42)] hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.988]`}
                      style={{ backgroundColor: brandColor }}
                    >
                      Faire signer la personne suivante
                    </Link>
                    <p className="text-center text-[11.5px] leading-relaxed text-[var(--color-muted)]/60">
                      Ouvre un nouveau formulaire sur cette borne.
                    </p>
                  </div>
                ) : null}
                {pdfHref ? (
                  <ThankYouPdfButton
                    href={pdfHref}
                    brandColor={brandColor}
                    radiusClass={radiusClass}
                    emphasis={!showKioskCta}
                    documentLabel={isLegalRep ? "autorisation" : "décharge"}
                  />
                ) : null}
                {externalCtaUrl && !showKioskCta ? (
                  <a
                    href={externalCtaUrl}
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={`inline-flex h-11 w-full items-center justify-center ${radiusClass} border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] px-5 text-[13.5px] font-medium text-[var(--color-foreground)]/80 shadow-[var(--elev-1)] transition-[transform,background-color,border-color,color,box-shadow] ${MOTION} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.988]`}
                  >
                    {externalCtaLabel}
                  </a>
                ) : null}
              </motion.div>
            ) : null}
          </div>
        </motion.section>

        {!showKioskCta && !externalCtaUrl && !hasActions ? (
          <p className="text-[12px] leading-relaxed text-[var(--color-muted)]/65">
            Vous pouvez fermer cette page en toute sécurité.
          </p>
        ) : null}

        <footer className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[11.5px] text-[var(--color-muted)]/75">
          <span className="font-medium tracking-tight text-[var(--color-muted)]/90">
            Propulsé par Paova
          </span>
          <span aria-hidden className="text-[var(--color-muted)]/35">
            ·
          </span>
          <a
            href="/confidentialite"
            className={`transition-colors ${MOTION} hover:text-[var(--color-foreground)]`}
          >
            Confidentialité
          </a>
          <span aria-hidden className="text-[var(--color-muted)]/35">
            ·
          </span>
          <a
            href="/mentions-legales"
            className={`transition-colors ${MOTION} hover:text-[var(--color-foreground)]`}
          >
            Mentions légales
          </a>
        </footer>
      </main>
    </div>
  );
}
