"use client";

import { useReducedMotion, motion } from "framer-motion";
import {
  type BrandButtonRadius,
} from "@/lib/branding";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

function SuccessMark({ reduced }: { reduced: boolean }) {
  return (
    <div
      className="relative flex h-12 w-12 items-center justify-center"
      aria-hidden
    >
      {!reduced ? (
        <>
          <motion.span
            className="absolute inset-[-6px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: [0.9, 1.08, 1], opacity: [0, 0.45, 0.22] }}
            transition={{ duration: 0.65, ease: EASE }}
          />
          <motion.span
            className="absolute inset-0 rounded-full ring-1 ring-[color-mix(in_srgb,var(--color-brand)_32%,transparent)]"
            initial={{ scale: 0.7, opacity: 0.55 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          />
        </>
      ) : null}
      <motion.div
        className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-brand)_24%,transparent),0_10px_24px_-12px_color-mix(in_srgb,var(--color-brand)_40%,transparent)]"
        initial={reduced ? false : { scale: 0.78, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 24, delay: 0.04 }
        }
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.35"
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
                      duration: 0.4,
                      ease: EASE,
                      delay: 0.2,
                    },
                    opacity: { duration: 0.1, delay: 0.2 },
                  }
            }
          />
        </svg>
      </motion.div>
    </div>
  );
}

export function GroupMerciView({
  businessName,
  groupName,
  logoUrl,
  brandColor,
  brandAccent,
  representativeName,
  signedAt,
}: {
  token: string;
  businessName: string | null;
  groupName: string;
  logoUrl: string | null;
  brandColor: string;
  brandAccent?: string;
  buttonRadius?: BrandButtonRadius;
  representativeName: string | null;
  signedAt: string | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const accent = brandAccent || brandColor;
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

      <main className="relative mx-auto flex min-h-screen max-w-[26.5rem] flex-col items-center justify-center gap-4 px-5 py-10 sm:px-6">
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          className="w-full rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[var(--color-surface)] px-6 py-6 shadow-[var(--elev-3)] sm:px-7 sm:py-7"
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
                className="mb-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-1.5 shadow-[var(--elev-1)]"
              >
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
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg text-[12px] font-semibold text-[var(--color-on-brand)] shadow-[var(--elev-1)]"
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
              className="mt-3.5 flex flex-col items-center"
            >
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.45rem]">
                Décharge signée pour le groupe
              </h1>
              <p className="mt-2 max-w-[21rem] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                La signature a bien été enregistrée. L&apos;ensemble du groupe est désormais couvert par cette décharge.
              </p>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                ease: EASE,
                delay: reduced ? 0 : 0.36,
              }}
              className="mt-5 w-full space-y-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_42%,var(--color-background))] px-4 py-3.5 text-left"
            >
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Activité
                </p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-[var(--color-foreground)]">
                  {groupName}
                </p>
              </div>

              {representativeName ? (
                <div className="border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] pt-2.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Signé par
                  </p>
                  <p className="mt-0.5 text-[13.5px] font-semibold text-[var(--color-foreground)]">
                    {representativeName}
                  </p>
                </div>
              ) : null}

              {dateLabel ? (
                <div className="border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] pt-2.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Le
                  </p>
                  <p className="mt-0.5 text-[13.5px] font-semibold text-[var(--color-foreground)]">
                    {dateLabel}
                  </p>
                </div>
              ) : null}
            </motion.div>
          </div>
        </motion.section>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.32,
            ease: EASE,
            delay: reduced ? 0 : 0.44,
          }}
          className="text-[12.5px] text-[var(--color-muted)]/70"
        >
          Vous pouvez fermer cette page en toute sécurité.
        </motion.p>

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