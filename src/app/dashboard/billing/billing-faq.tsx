"use client";

import { useId, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQ_ITEMS = [
  {
    q: "Puis-je résilier à tout moment ?",
    a: "Oui. L'offre Pro est sans engagement. Gérez ou résiliez depuis le portail Stripe en un clic.",
  },
  {
    q: "Que se passe-t-il si j'atteins la limite gratuite ?",
    a: "Les nouvelles signatures sont temporairement bloquées jusqu'au mois suivant, ou jusqu'à ce que vous passiez à Pro.",
  },
  {
    q: "Mes données restent-elles accessibles si je résilie ?",
    a: "Oui. Vos décharges et signatures restent disponibles. Vous repassez simplement sur les limites de l'offre gratuite.",
  },
] as const;

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      className="relative flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-muted)]"
      aria-hidden
    >
      {/* horizontal bar (always visible → forms the minus) */}
      <span className="absolute h-px w-3 rounded-full bg-current" />
      {/* vertical bar fades out when open */}
      <motion.span
        className="absolute h-3 w-px rounded-full bg-current"
        animate={{ opacity: open ? 0 : 1, scaleY: open ? 0 : 1 }}
        transition={{ duration: 0.22, ease: EASE }}
      />
    </span>
  );
}

export function BillingFaq() {
  const baseId = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface)]">
      {FAQ_ITEMS.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-btn-${index}`;

        return (
          <div
            key={item.q}
            className={
              index < FAQ_ITEMS.length - 1
                ? "border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
                : ""
            }
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--color-surface-2)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)] sm:px-6 sm:py-[1.125rem]"
            >
              <span className="text-[14px] font-medium tracking-tight text-[var(--color-foreground)] sm:text-[15px]">
                {item.q}
              </span>
              <PlusMinus open={open} />
            </button>

            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={
                    reducedMotion
                      ? false
                      : { height: 0, opacity: 0 }
                  }
                  animate={{ height: "auto", opacity: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.32, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 pt-1 text-[13px] leading-relaxed text-[var(--color-muted)] sm:px-6 sm:pb-5 sm:pt-1.5 sm:text-sm">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
