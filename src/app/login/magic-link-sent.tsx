"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AuthRequestError,
  describeAuthError,
  type AuthErrorKind,
} from "@/lib/auth/auth-error";
import { RateLimitWarning } from "./rate-limit-warning";

const RESEND_COOLDOWN_SEC = 30;
const EASE = [0.22, 1, 0.36, 1] as const;

function CheckIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.path
        d="M8.2 12.4l2.6 2.6 5-5.2"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                pathLength: {
                  duration: 0.45,
                  ease: EASE,
                  delay: 0.28,
                },
                opacity: { duration: 0.12, delay: 0.28 },
              }
        }
      />
    </svg>
  );
}

type MagicLinkSentProps = {
  email: string;
  onChangeEmail: () => void;
  onResend: () => Promise<void>;
};

export function MagicLinkSent({
  email,
  onChangeEmail,
  onResend,
}: MagicLinkSentProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SEC);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState("");
  const [resendKind, setResendKind] = useState<AuthErrorKind | null>(null);
  const [resendFlash, setResendFlash] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  async function handleResend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setResendError("");
    setResendKind(null);
    try {
      await onResend();
      setSecondsLeft(RESEND_COOLDOWN_SEC);
      setResendFlash(true);
      window.setTimeout(() => setResendFlash(false), 2200);
    } catch (err) {
      // Same classifier as the initial send: never render a raw provider
      // message (supabase-js can hand us the literal string "{}").
      const description =
        err instanceof AuthRequestError
          ? { kind: err.kind, message: err.message }
          : describeAuthError({
              message: err instanceof Error ? err.message : "",
            });
      setResendKind(description.kind);
      setResendError(description.message);
    } finally {
      setResending(false);
    }
  }

  const canResend = secondsLeft === 0 && !resending;
  const rateLimited = resendKind === "rate_limit";

  return (
    <motion.div
      className="mx-auto flex w-full max-w-[440px] flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      role="status"
      aria-live="polite"
    >
      {/* Success header */}
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <div
          className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center"
          aria-hidden
        >
          <motion.span
            className="absolute inset-[-10px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
            initial={reducedMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={
              reducedMotion
                ? { scale: 1, opacity: 0.4 }
                : { scale: [0.92, 1.08, 0.92], opacity: [0.35, 0.55, 0.35] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    scale: {
                      duration: 2.4,
                      ease: "easeInOut",
                      repeat: Infinity,
                      delay: 0.55,
                    },
                    opacity: {
                      duration: 2.4,
                      ease: "easeInOut",
                      repeat: Infinity,
                      delay: 0.55,
                    },
                  }
            }
          />
          <motion.span
            className="absolute inset-[-4px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]"
            initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.5, ease: EASE, delay: 0.08 }
            }
          />
          <motion.div
            className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_28%,transparent)]"
            initial={reducedMotion ? false : { scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 380,
                    damping: 22,
                    delay: 0.06,
                  }
            }
          >
            <CheckIcon reduced={reducedMotion} />
          </motion.div>
        </div>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)]">
          Lien envoyé
        </p>

        <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
          Consultez votre boîte mail
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--color-muted)]">
          Un lien sécurisé a été envoyé à l’adresse ci-dessous.
        </p>

        <motion.div
          className="mt-5 w-full max-w-md"
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.36, ease: EASE, delay: 0.12 }
          }
        >
          <div className="flex items-center gap-3 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-12px_rgba(0,0,0,0.14)] transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-surface)_88%,white)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_36px_-14px_rgba(0,0,0,0.18)] dark:hover:bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-brand))] sm:gap-3.5 sm:px-5 sm:py-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]"
              aria-hidden
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </span>

            <p className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[15px]">
              {email}
            </p>

            <button
              type="button"
              onClick={onChangeEmail}
              aria-label="Modifier l'adresse e-mail"
              className="group/edit inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] px-2 py-1 text-[12px] font-medium text-[var(--color-brand)] transition-[background-color,color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] hover:text-[color-mix(in_srgb,var(--color-brand)_78%,white)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="opacity-90 transition-transform duration-200 ease-out group-hover/edit:-translate-y-px group-hover/edit:translate-x-px"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Modifier
            </button>
          </div>
        </motion.div>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
          Le lien est valable quelques minutes et vous permettra de vous
          connecter en un clic.
        </p>
      </div>

      {/* Passive information callout */}
      <aside
        className="mt-8 flex cursor-default gap-3 rounded-xl bg-[color-mix(in_srgb,var(--color-muted)_5.5%,var(--color-background))] px-4 py-3.5 sm:gap-3.5 sm:px-5"
        aria-label="Information"
      >
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-muted)]/65"
          aria-hidden
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </span>
        <p className="text-[13px] leading-relaxed text-[var(--color-muted)]/88">
          Le message peut mettre quelques secondes à arriver.
          <span className="mt-1 block">
            Pensez également à vérifier vos courriers indésirables.
          </span>
        </p>
      </aside>

      {/* Resend */}
      <div className="mt-6 flex min-h-[4.5rem] flex-col justify-start gap-2 sm:items-start">
        <AnimatePresence mode="wait">
          {resendFlash ? (
            <motion.p
              key="flash"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-medium text-[var(--color-brand)]"
            >
              ✓ Nouveau lien envoyé.
            </motion.p>
          ) : null}
        </AnimatePresence>

        {rateLimited ? (
          <RateLimitWarning />
        ) : resendError ? (
          <p
            role="alert"
            className="text-sm leading-relaxed text-[color-mix(in_srgb,#b45309_85%,var(--color-foreground))]"
          >
            {resendError}
          </p>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {secondsLeft > 0 ? (
            <motion.p
              key="countdown"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, transition: { duration: 0.22 } }
              }
              transition={{ duration: 0.28, ease: EASE }}
              className="text-center text-[12px] tabular-nums text-[var(--color-muted)]/80 sm:text-left"
              aria-live="polite"
            >
              Disponible dans {secondsLeft}s
            </motion.p>
          ) : (
            <motion.button
              key="resend"
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
              transition={{ duration: 0.32, ease: EASE }}
              aria-label="Renvoyer le lien de connexion"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {resending ? "Envoi…" : "Renvoyer le lien"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
