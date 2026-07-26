"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/safe-next-path";

const OTP_TYPES = new Set<string>([
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

/** Feel-good floor so a fast auth response never feels like a hard cut. */
const MIN_HOLD_MS = 600;
/** Soft ceiling for artificial wait — never pad beyond this. */
const MAX_HOLD_MS = 1200;

type Phase = "verifying" | "success" | "error" | "invalid";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function VerifyingMark({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center" aria-hidden>
      {!reduced ? (
        <motion.span
          className="absolute inset-[-8px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
          animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
        />
      ) : null}
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_24%,transparent)]">
        <motion.svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[var(--color-brand)]"
        >
          <motion.circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="2"
          />
          <motion.circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="40 60"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={
              reduced
                ? undefined
                : { duration: 1.1, ease: "linear", repeat: Infinity }
            }
            style={{ originX: "12px", originY: "12px" }}
          />
        </motion.svg>
      </div>
    </div>
  );
}

function SuccessMark({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center" aria-hidden>
      {!reduced ? (
        <motion.span
          className="absolute inset-[-8px] rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : null}
      <motion.div
        className="relative flex h-full w-full items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_28%,transparent)]"
        initial={reduced ? false : { scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 24 }
        }
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.15"
          strokeLinecap="round"
          strokeLinejoin="round"
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
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: { duration: 0.1 },
                  }
            }
          />
        </svg>
      </motion.div>
    </div>
  );
}

function ErrorMark() {
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,#dc2626_10%,transparent)] text-red-600 ring-1 ring-[color-mix(in_srgb,#dc2626_22%,transparent)] dark:text-red-400"
      aria-hidden
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    </div>
  );
}

async function holdForFeel(started: number, reducedMotion: boolean) {
  const elapsed = performance.now() - started;
  const target = reducedMotion ? 320 : MIN_HOLD_MS;
  const pad = Math.min(MAX_HOLD_MS, Math.max(0, target - elapsed));
  if (pad > 0) await delay(pad);
}

/**
 * Magic-link landing: verifies the session automatically, holds a short
 * premium “secure connection” moment, then hard-redirects to the app.
 *
 * Uses window.location (not router.replace) so auth cookies are always
 * sent on the next document request. Tolerates React Strict Mode remounts
 * by reusing an existing session if the one-time token was already spent.
 */
export default function AuthConfirmClient() {
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion() ?? false;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type") ?? "email";
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = safeNextPath(nextParam);

  const [phase, setPhase] = useState<Phase>(() => {
    if (code) return "verifying";
    if (tokenHash && OTP_TYPES.has(typeParam)) return "verifying";
    return "invalid";
  });

  useEffect(() => {
    if (!code && !(tokenHash && OTP_TYPES.has(typeParam))) {
      return;
    }

    let abandoned = false;
    let safetyTimer: number | undefined;

    async function go(path: string) {
      if (!abandoned) setPhase("success");
      await delay(reducedMotion ? 100 : 260);
      // Full navigation so the server reads the new session cookies.
      window.location.replace(path);
    }

    async function verifyTokenHash(hash: string, type: string) {
      const supabase = createClient();
      const primary = await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: hash,
      });
      if (!primary.error) return primary;

      // Magic-link emails sometimes arrive as type=email; retry the other.
      const fallbackType =
        type === "email" ? "magiclink" : type === "magiclink" ? "email" : null;
      if (!fallbackType) return primary;

      const secondary = await supabase.auth.verifyOtp({
        type: fallbackType,
        token_hash: hash,
      });
      return secondary.error ? primary : secondary;
    }

    async function run() {
      const started = performance.now();
      const supabase = createClient();

      safetyTimer = window.setTimeout(() => {
        if (!abandoned) setPhase("error");
      }, 10000);

      // Always consume the link token first. Skipping verify when a session
      // already exists left the *owner* logged in when they opened an invite
      // link meant for a collaborator — invite stayed "pending".
      let failed = false;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        failed = Boolean(error);
        if (error) {
          console.error("[auth/confirm] exchangeCodeForSession:", error.message);
        }
      } else if (tokenHash && OTP_TYPES.has(typeParam)) {
        const { error } = await verifyTokenHash(tokenHash, typeParam);
        failed = Boolean(error);
        if (error) {
          console.error("[auth/confirm] verifyOtp:", error.message);
        }
      } else {
        failed = true;
      }

      window.clearTimeout(safetyTimer);

      if (failed) {
        // Strict Mode remount: token already spent on the first pass, but the
        // session from that pass should still be present.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          try {
            await fetch("/api/auth/claim-invites", { method: "POST" });
          } catch {
            /* claim also runs on dashboard resolve */
          }
          await holdForFeel(started, reducedMotion);
          await go(next);
          return;
        }
        if (!abandoned) setPhase("error");
        return;
      }

      try {
        await fetch("/api/auth/claim-invites", { method: "POST" });
      } catch {
        /* claim also runs on dashboard resolve */
      }

      await holdForFeel(started, reducedMotion);
      // Always hard-navigate after a successful verify (even if Strict Mode
      // cleaned up the effect) — soft router.replace left users stuck here.
      await go(next);
    }

    void run();

    return () => {
      abandoned = true;
      if (safetyTimer) window.clearTimeout(safetyTimer);
    };
  }, [code, tokenHash, typeParam, next, reducedMotion]);

  const copy =
    phase === "success"
      ? {
          title: "Connexion sécurisée",
          body: "Connexion à votre espace Paova…",
          sub: "Redirection en cours…",
        }
      : phase === "verifying"
        ? {
            title: "Connexion sécurisée",
            body: "Vérification de votre lien sécurisé…",
            sub: "Redirection en cours…",
          }
        : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--color-brand) 16%, transparent), transparent 70%)",
        }}
      />

      <header className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <BrandLogo size="lg" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-20">
        <AnimatePresence mode="wait">
          {phase === "verifying" || phase === "success" ? (
            <motion.div
              key="ok"
              className="flex w-full max-w-[380px] flex-col items-center text-center"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              aria-live="polite"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase === "success" ? "check" : "spin"}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {phase === "success" ? (
                    <SuccessMark reduced={reducedMotion} />
                  ) : (
                    <VerifyingMark reduced={reducedMotion} />
                  )}
                </motion.div>
              </AnimatePresence>

              <motion.p
                className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)]"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.32 }}
              >
                {copy?.title}
              </motion.p>

              <motion.h1
                className="mt-3 text-[1.45rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.6rem]"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {copy?.body}
              </motion.h1>

              <motion.p
                className="mt-3 text-sm text-[var(--color-muted)]"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18, duration: 0.35 }}
              >
                {copy?.sub}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="err"
              className="flex w-full max-w-[400px] flex-col items-center text-center"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              role="alert"
            >
              <ErrorMark />
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Connexion
              </p>
              <h1 className="mt-3 text-[1.45rem] font-semibold tracking-tight sm:text-[1.6rem]">
                Lien invalide ou expiré
              </h1>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--color-muted)]">
                {phase === "invalid"
                  ? "Ce lien est incomplet. Demandez un nouveau lien de connexion."
                  : "Ce lien a déjà été utilisé ou n’est plus valable. Demandez-en un nouveau pour continuer."}
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                Recevoir un nouveau lien
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
