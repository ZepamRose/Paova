"use client";

import { resolveBrandFont } from "@/lib/brand-fonts";
import { motion } from "framer-motion";

export function BrandPreview({
  color,
  businessName,
  fontId,
}: {
  color: string;
  businessName: string;
  fontId?: string | null;
}) {
  const name = businessName.trim() || "Votre établissement";
  const font = resolveBrandFont(fontId);

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-background))] p-4 sm:p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/70">
          Aperçu
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
          Ce que voient vos participants sur la page de signature.
        </p>
      </div>

      <motion.div
        key={`${color}-${font.id}`}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="group/preview mt-4 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-2)] transition-shadow duration-[180ms] hover:shadow-[var(--elev-3)]"
        style={{ fontFamily: font.family }}
      >
        <div
          className="h-1.5 w-full transition-[background-color] duration-[180ms]"
          style={{ backgroundColor: color }}
          aria-hidden
        />

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[12px] font-semibold tracking-tight transition-colors duration-[180ms]"
                style={{ color }}
              >
                {name}
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Décharge de responsabilité
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                Lisez le texte, puis signez pour valider votre participation.
              </p>
            </div>
            <span className="group/badge relative inline-flex shrink-0 cursor-default items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold transition-[transform,box-shadow] duration-[180ms] hover:scale-[1.04]">
              <span
                className="absolute inset-0 opacity-[0.12] transition-opacity duration-[180ms] group-hover/badge:opacity-[0.2]"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span
                className="relative h-1.5 w-1.5 rounded-full transition-[box-shadow,transform] duration-[180ms] group-hover/badge:scale-110"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 0 3px ${color}28`,
                }}
                aria-hidden
              />
              <span className="relative" style={{ color }}>
                Active
              </span>
            </span>
          </div>

          <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_55%,var(--color-background))] px-3.5 py-3 transition-[background-color] duration-[180ms] group-hover/preview:bg-[color-mix(in_srgb,var(--color-surface-2)_68%,var(--color-background))]">
            <div className="space-y-1.5">
              <div className="h-2 w-[92%] rounded-full bg-[color-mix(in_srgb,var(--color-muted)_16%,transparent)]" />
              <div className="h-2 w-[78%] rounded-full bg-[color-mix(in_srgb,var(--color-muted)_12%,transparent)]" />
              <div className="h-2 w-[64%] rounded-full bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex h-9 cursor-default items-center rounded-lg px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_-6px_rgba(0,0,0,0.28)] transition-[transform,filter,box-shadow] duration-[180ms] hover:-translate-y-px hover:brightness-[1.05] hover:shadow-[0_8px_16px_-8px_rgba(0,0,0,0.32)] active:translate-y-0 active:scale-[0.99]"
              style={{ backgroundColor: color }}
            >
              Signer
            </span>
            <span
              className="inline-flex h-9 cursor-default items-center rounded-lg border bg-[var(--color-surface)] px-3.5 text-[13px] font-medium transition-[transform,background-color,border-color,opacity] duration-[180ms] hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))] active:translate-y-0 active:scale-[0.99]"
              style={{ borderColor: color, color }}
            >
              Annuler
            </span>
            <span
              className="cursor-default text-[13px] font-medium underline-offset-[3px] transition-[opacity,text-decoration] duration-[180ms] hover:underline hover:opacity-85"
              style={{ color }}
            >
              Conditions
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
