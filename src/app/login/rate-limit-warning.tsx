"use client";

/** Soft amber callout for temporary limits — not a critical error. */
export function RateLimitWarning({ id }: { id?: string }) {
  return (
    <aside
      id={id}
      role="status"
      aria-live="polite"
      className="flex cursor-default gap-3 rounded-xl bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 sm:gap-3.5"
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#b45309] dark:text-[#d97706]"
        aria-hidden
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </span>
      <div className="min-w-0 space-y-1.5 text-left">
        <p className="text-[13px] font-semibold tracking-tight text-[#92400e] dark:text-[#fbbf24]">
          Limite temporaire atteinte
        </p>
        <p className="text-[13px] leading-relaxed text-[#a16207]/90 dark:text-[#fcd34d]/85">
          Pour des raisons de sécurité, plusieurs demandes de connexion ont été
          effectuées en peu de temps.
        </p>
        <p className="text-[13px] leading-relaxed text-[#a16207]/90 dark:text-[#fcd34d]/85">
          Veuillez patienter environ une heure avant de demander un nouveau
          lien. Vous pouvez également utiliser une autre adresse e-mail.
        </p>
      </div>
    </aside>
  );
}

export function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower === "rate_limit" ||
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("over_email") ||
    lower.includes("too many") ||
    lower.includes("limite temporaire") ||
    lower.includes("trop de liens")
  );
}
