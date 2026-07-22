import { Suspense } from "react";
import AuthConfirmClient from "./confirm-client";

function ConfirmFallback() {
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
      <div className="flex flex-1 flex-col items-center justify-center px-5">
        <div className="flex w-full max-w-[380px] flex-col items-center text-center">
          <div
            className="h-14 w-14 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_24%,transparent)]"
            aria-hidden
          />
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)]">
            Connexion sécurisée
          </p>
          <p className="mt-3 text-[1.45rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            Vérification de votre lien sécurisé…
          </p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Redirection en cours…
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <AuthConfirmClient />
    </Suspense>
  );
}
