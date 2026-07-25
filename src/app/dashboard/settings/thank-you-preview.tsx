"use client";

import { motion } from "framer-motion";
import {
  buttonRadiusClass,
  formatThankYouMessage,
  type BrandButtonRadius,
} from "@/lib/branding";

export function ThankYouPreview({
  businessName,
  color,
  buttonRadius,
  title,
  message,
  buttonLabel,
  buttonUrl,
}: {
  businessName: string;
  color: string;
  buttonRadius: BrandButtonRadius;
  title: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
}) {
  const name = businessName.trim() || "Votre établissement";
  const resolvedTitle = title.trim() || "Décharge signée";
  const resolvedMessage = formatThankYouMessage(
    message,
    name,
    `Votre signature a été enregistrée avec succès auprès de ${name}.`,
  );
  const showButton = Boolean(buttonUrl.trim());
  const resolvedButtonLabel = buttonLabel.trim() || "Retour au site";
  const radius = buttonRadiusClass(buttonRadius);

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-background))] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/70">
        Aperçu
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
        Ce que voient vos participants après la signature.
      </p>

      <motion.div
        key={`${resolvedTitle}-${resolvedMessage}-${showButton}-${color}-${buttonRadius}`}
        initial={{ opacity: 0.92 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3.5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[var(--color-surface)] px-5 py-5 text-center shadow-[var(--elev-2)]"
      >
        <div
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-on-brand)]"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
            color,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 28%, transparent)`,
          }}
          aria-hidden
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p
          className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color }}
        >
          Succès
        </p>
        <p className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {resolvedTitle}
        </p>
        <p className="mx-auto mt-1.5 max-w-[18rem] whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-muted)]">
          {resolvedMessage}
        </p>
        {showButton ? (
          <span
            className={`mt-4 inline-flex h-9 w-full max-w-[14rem] items-center justify-center ${radius} px-4 text-[12.5px] font-semibold text-white`}
            style={{ backgroundColor: color }}
          >
            {resolvedButtonLabel}
          </span>
        ) : (
          <p className="mt-3 text-[11px] text-[var(--color-muted)]/70">
            Bouton masqué tant qu&apos;aucun lien n&apos;est renseigné
          </p>
        )}
      </motion.div>
    </div>
  );
}
