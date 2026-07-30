"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAuthConfirmUrl } from "@/lib/app-url";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import {
  AuthRequestError,
  describeAuthError,
  GENERIC_MESSAGE,
} from "@/lib/auth/auth-error";
import { createClient } from "@/lib/supabase/client";
import { MagicLinkSent } from "./magic-link-sent";
import { RateLimitWarning } from "./rate-limit-warning";

type Status = "idle" | "sending" | "sent" | "error";
type ErrorKind = "none" | "rate_limit" | "generic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            "L'envoi prend trop de temps. Vérifiez votre connexion, ou réessayez avec un autre email.",
          ),
        ),
      ms,
    );
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const iconSm = {
  width: 13,
  height: 13,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
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
  );
}

function TrustItem({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

/** Static, non-interactive preview — mirrors the real dashboard language. */
function DashboardPreview() {
  return (
    <aside
      aria-hidden
      className="w-full max-w-[400px] origin-top animate-fade-up-delay sm:origin-center lg:max-w-[420px] lg:origin-left"
    >
      <p className="mb-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]/70 lg:text-left">
        Aperçu de votre espace
      </p>
      <div className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]">
        {/* Header chrome */}
        <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/paova-mark.svg"
              alt=""
              width={12}
              height={16}
              className="h-4 w-auto shrink-0"
            />
            <span className="truncate text-[13px] font-semibold tracking-tight">
              paova
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
              Pro
            </span>
            <span className="rounded-md bg-[var(--color-brand)] px-2 py-1 text-[10px] font-medium text-[var(--color-on-brand)]">
              + Nouvelle
            </span>
          </div>
        </div>

        {/* Business identity */}
        <div className="border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight">
              Escape Room Lyon
            </p>
            <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] px-1.5 py-[2px] text-[10px] font-semibold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_26%,transparent)]">
              Plan Pro
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            2 décharges actives · 24 signatures ce mois
          </p>
          <p className="mt-0.5 text-[10.5px] text-[var(--color-muted)]/85">
            Dernière activité il y a 12 min
          </p>
        </div>

        {/* Stats — Aperçu */}
        <div className="border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3.5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Aperçu
            </span>
            <span
              className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Ce mois", value: "24", hint: "+12 % vs mois dernier" },
              { label: "7 jours", value: "8", hint: "Stable" },
              { label: "Actives", value: "2", hint: "2 sur 2" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[0.85rem] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-2 py-2 shadow-[var(--elev-1)]"
              >
                <p className="text-[15px] font-semibold tracking-tight tabular-nums leading-none">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[9px] font-medium text-[var(--color-foreground)]/85">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-[8.5px] leading-snug text-[var(--color-muted)]">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Décharges list */}
        <div className="flex flex-col gap-2 px-3.5 py-3">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Décharges
            </span>
            <div className="flex items-center gap-0.5 rounded-md border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] p-0.5 shadow-[var(--elev-1)]">
              <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[9px] font-medium shadow-[var(--elev-1)]">
                Actives{" "}
                <span className="tabular-nums opacity-70">2</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-muted)]">
                Archivées
              </span>
            </div>
          </div>

          {[
            {
              title: "Décharge — Escape game",
              count: "12 signatures",
              meta: "Dernière signature il y a 12 min",
            },
            {
              title: "Autorisation parentale",
              count: "7 signatures",
              meta: "Dernière signature hier",
            },
          ].map((row) => (
            <div
              key={row.title}
              className="rounded-[1rem] border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] px-3 py-2.5 shadow-[var(--elev-2)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12px] font-semibold tracking-tight">
                      {row.title}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-brand)_22%,transparent)]" />
                      Ouverte
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium tabular-nums text-[var(--color-brand)]">
                    {row.count}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                    {row.meta}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] px-2 py-1 text-[10px] font-medium text-[var(--color-brand)]">
                  Voir
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const emailErrorId = useId();
  const emailHintId = useId();
  const formErrorId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind>("none");
  const [touched, setTouched] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [focusEmailOnIdle, setFocusEmailOnIdle] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setStatus("error");
      setErrorKind("generic");
      setError(
        "Le lien de connexion a expiré ou n'a pas pu être validé. Demandez un nouveau lien et ouvrez-le dans le même navigateur.",
      );
    }
    const prefill = params.get("email")?.trim() ?? "";
    if (prefill) {
      setEmail(prefill);
    }
  }, []);

  useEffect(() => {
    if (status !== "idle" || !focusEmailOnIdle) return;
    const input = emailInputRef.current;
    if (!input) return;
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
    setFocusEmailOnIdle(false);
  }, [status, focusEmailOnIdle]);

  const trimmed = email.trim();
  const emailInvalid =
    (touched || showValidation) && trimmed.length > 0 && !isValidEmail(trimmed);
  const emailEmptyOnSubmit = showValidation && trimmed.length === 0;
  const fieldError = emailEmptyOnSubmit
    ? "Indiquez votre adresse email."
    : emailInvalid
      ? "Vérifiez le format de votre adresse email."
      : "";

  async function sendMagicLink(targetEmail: string) {
    const supabase = createClient();
    const nextRaw =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    const next = safeNextPath(nextRaw, "");
    const confirmBase = getAuthConfirmUrl();
    const emailRedirectTo = next
      ? `${confirmBase}?next=${encodeURIComponent(next)}`
      : confirmBase;

    const { error: otpError } = await withTimeout(
      supabase.auth.signInWithOtp({
        email: targetEmail.trim(),
        options: {
          emailRedirectTo,
        },
      }),
      20000,
    );

    if (otpError) {
      // Keep the technical detail in the console for support; the thrown error
      // carries an already-classified, human-readable kind for the UI.
      console.error("[login] signInWithOtp:", {
        name: otpError.name,
        status: otpError.status,
        message: otpError.message,
      });
      throw new AuthRequestError(describeAuthError(otpError));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);
    setError("");

    if (!isValidEmail(email)) {
      setStatus("idle");
      return;
    }

    setStatus("sending");

    try {
      await sendMagicLink(email);
      setStatus("sent");
    } catch (err) {
      // Already classified in sendMagicLink — no second round of string
      // matching, which is what previously turned "{}" into visible garbage.
      const kind =
        err instanceof AuthRequestError
          ? err.kind
          : describeAuthError({
              message: err instanceof Error ? err.message : "",
            }).kind;

      if (kind === "rate_limit") {
        setErrorKind("rate_limit");
        setError("");
      } else {
        setErrorKind("generic");
        setError(
          err instanceof Error && err.message ? err.message : GENERIC_MESSAGE,
        );
      }
      setStatus("error");
    }
  }

  async function handleResend() {
    await sendMagicLink(email);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--color-brand) 18%, transparent), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, color-mix(in srgb, var(--color-brand) 8%, transparent), transparent 60%)",
        }}
      />

      <header className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <BrandLogo size="lg" />
          <Link
            href="/"
            className="hidden min-h-11 items-center text-[13px] text-[var(--color-muted)]/65 transition-[color,opacity] duration-200 hover:text-[var(--color-muted)] hover:opacity-100 sm:inline-flex"
          >
            ← Accueil
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--color-muted)]/70 transition-colors duration-200 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] sm:hidden"
          >
            Accueil
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-5 pb-10 pt-2 sm:justify-center sm:px-6 sm:pb-16 sm:pt-0">
        <div className="w-full max-w-[960px]">
          {status === "sent" ? (
            <MagicLinkSent
              email={email}
              onChangeEmail={() => {
                setStatus("idle");
                setError("");
                setErrorKind("none");
                setShowValidation(false);
                setFocusEmailOnIdle(true);
              }}
              onResend={handleResend}
            />
          ) : (
            <div className="flex flex-col gap-8 lg:gap-10">
              <div className="mx-auto flex max-w-[34rem] flex-col gap-1.5 text-center animate-fade-up">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Espace professionnel
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.125rem]">
                  Accédez à votre espace Paova
                </h1>
                <div className="mx-auto mt-3 max-w-md space-y-1 text-[15px] leading-relaxed text-[var(--color-muted)]">
                  <p>Entrez simplement votre adresse e-mail professionnelle.</p>
                  <p>Nous vous envoyons un lien sécurisé.</p>
                  <p>Aucun mot de passe à retenir.</p>
                </div>
              </div>

              <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={status === "sending"}
                  className="mx-auto flex w-full max-w-[440px] flex-col rounded-[1.4rem] border border-[color-mix(in_srgb,var(--color-border)_88%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_28px_-14px_rgba(0,0,0,0.1)] animate-fade-up-delay sm:p-7 lg:mx-0 lg:justify-self-end"
                >
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="login-email"
                      className="text-sm font-medium tracking-tight"
                    >
                      Adresse email
                    </label>
                    <input
                      ref={emailInputRef}
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      inputMode="email"
                      enterKeyHint="send"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") {
                          setStatus("idle");
                          setError("");
                          setErrorKind("none");
                        }
                      }}
                      onBlur={() => setTouched(true)}
                      placeholder="vous@entreprise.fr"
                      disabled={status === "sending"}
                      aria-invalid={fieldError ? true : undefined}
                      aria-describedby={
                        [
                          emailHintId,
                          fieldError ? emailErrorId : null,
                          status === "error" && errorKind !== "none"
                            ? formErrorId
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      aria-label="Adresse email professionnelle"
                      className="min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-[1.125rem] py-3.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-[var(--color-muted)]/65 hover:border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <p
                      id={emailHintId}
                      className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]"
                    >
                      Aucun mot de passe. Aucun compte à créer.
                    </p>
                    {fieldError ? (
                      <p
                        id={emailErrorId}
                        role="alert"
                        className="text-sm leading-relaxed text-red-600/90"
                      >
                        {fieldError}
                      </p>
                    ) : null}
                    {status === "error" && errorKind === "rate_limit" ? (
                      <div className="mt-3">
                        <RateLimitWarning id={formErrorId} />
                      </div>
                    ) : null}
                    {status === "error" && errorKind === "generic" && error ? (
                      <p
                        id={formErrorId}
                        role="alert"
                        className="mt-2 text-sm leading-relaxed text-[color-mix(in_srgb,#b45309_80%,var(--color-foreground))]"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    aria-label={
                      status === "sending"
                        ? "Envoi du lien en cours"
                        : "Recevoir mon lien de connexion"
                    }
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] px-5 py-3.5 text-sm font-medium text-[var(--color-on-brand)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[transform,box-shadow,filter] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_55%,transparent),0_0_0_1px_color-mix(in_srgb,var(--color-brand)_25%,transparent)] hover:brightness-[1.04] active:translate-y-0 active:scale-[0.99] active:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55 disabled:shadow-none"
                  >
                    {status === "sending" ? (
                      <>
                        <Spinner />
                        <span>Envoi en cours…</span>
                      </>
                    ) : (
                      "Recevoir mon lien"
                    )}
                  </button>

                  <ul className="mt-5 flex flex-col gap-2.5 text-[12px] leading-snug text-[var(--color-muted)]/80">
                    <TrustItem
                      icon={
                        <svg {...iconSm}>
                          <rect x="4" y="11" width="16" height="10" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      }
                      label="Connexion sécurisée"
                    />
                    <TrustItem
                      icon={
                        <svg {...iconSm}>
                          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                        </svg>
                      }
                      label="Lien envoyé en quelques secondes"
                    />
                    <TrustItem
                      icon={
                        <svg {...iconSm}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M2 12h20" />
                          <path d="M12 2a15 15 0 0 1 0 20" />
                          <path d="M12 2a15 15 0 0 0 0 20" />
                        </svg>
                      }
                      label="Hébergé en Europe"
                    />
                  </ul>

                  <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--color-muted)]/60">
                    En continuant, vous acceptez notre{" "}
                    <Link
                      href="/confidentialite"
                      className="underline underline-offset-2 transition-colors duration-200 hover:text-[var(--color-muted)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                    >
                      politique de confidentialité
                    </Link>
                    .
                  </p>
                </form>

                <div className="mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none lg:justify-self-start">
                  <DashboardPreview />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
