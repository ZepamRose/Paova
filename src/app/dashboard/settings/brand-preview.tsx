"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { resolveBrandFont } from "@/lib/brand-fonts";
import {
  buttonRadiusClass,
  type BrandButtonRadius,
  type PublicTheme,
} from "@/lib/branding";
import { motion, AnimatePresence } from "framer-motion";

type PreviewTab = "page" | "pdf";

const PREVIEW_PALETTE = {
  light: {
    bg: "#ffffff",
    fg: "#0a0a0a",
    muted: "#555e69",
    surface2: "#eceef2",
    border: "#e2e4e8",
  },
  dark: {
    bg: "#141b26",
    fg: "#e5e7eb",
    muted: "#a8b2c0",
    surface2: "#1e2735",
    border: "#232b36",
  },
} as const;

export function BrandPreview({
  color,
  accent,
  businessName,
  tagline,
  fontId,
  buttonRadius,
  publicTheme,
  contactAddress,
  contactPhone,
  contactEmail,
  previewPublicUrl = null,
  hasUnsavedChanges = false,
}: {
  color: string;
  accent: string;
  businessName: string;
  tagline: string;
  fontId?: string | null;
  buttonRadius: BrandButtonRadius;
  publicTheme: PublicTheme;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  previewPublicUrl?: string | null;
  hasUnsavedChanges?: boolean;
}) {
  const [tab, setTab] = useState<PreviewTab>("page");
  const name = businessName.trim() || "Votre établissement";
  const line = tagline.trim();
  const font = resolveBrandFont(fontId);
  const radius = buttonRadiusClass(buttonRadius);
  const palette = PREVIEW_PALETTE[publicTheme];
  const hasContact = Boolean(
    contactAddress.trim() || contactPhone.trim() || contactEmail.trim(),
  );

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-background))] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/70">
            Aperçu
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
            Ce que voient vos participants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {previewPublicUrl ? (
            <a
              href={previewPublicUrl}
              target="_blank"
              rel="noreferrer"
              title={
                hasUnsavedChanges
                  ? "Ouvre la page publique avec les réglages déjà enregistrés"
                  : "Ouvrir la page publique"
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] px-2.5 text-[12px] font-medium text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,box-shadow] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
            >
              <ExternalLink size={13} strokeWidth={1.85} aria-hidden />
              Ouvrir un aperçu
            </a>
          ) : null}
          <div
            className="inline-flex rounded-xl border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] p-1 shadow-[var(--elev-1)]"
            role="tablist"
            aria-label="Type d'aperçu"
          >
            {(
              [
                { id: "page", label: "Page publique" },
                { id: "pdf", label: "PDF" },
              ] as const
            ).map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-[background-color,color,box-shadow] duration-[200ms] ${
                    selected
                      ? "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-foreground)] shadow-[var(--elev-1)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {previewPublicUrl && hasUnsavedChanges ? (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]/75">
          L&apos;aperçu complet utilise les réglages déjà enregistrés.
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {tab === "page" ? (
          <motion.div
            key={`page-${color}-${accent}-${font.id}-${buttonRadius}-${publicTheme}`}
            role="tabpanel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="group/preview mt-4 overflow-hidden rounded-2xl border shadow-[var(--elev-2)] transition-shadow duration-[180ms] hover:shadow-[var(--elev-3)]"
            style={{
              fontFamily: font.family,
              backgroundColor: palette.bg,
              borderColor: palette.border,
              color: palette.fg,
            }}
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
                  {line ? (
                    <p
                      className="mt-0.5 text-[11px] leading-relaxed"
                      style={{ color: palette.muted }}
                    >
                      {line}
                    </p>
                  ) : null}
                  <p
                    className="mt-1 text-[15px] font-semibold tracking-tight"
                    style={{ color: palette.fg }}
                  >
                    Décharge de responsabilité
                  </p>
                  <p
                    className="mt-1 text-[12px] leading-relaxed"
                    style={{ color: palette.muted }}
                  >
                    Lisez le texte, puis signez pour valider votre participation.
                  </p>
                </div>
                <span className="group/badge relative inline-flex shrink-0 cursor-default items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-semibold transition-[transform,box-shadow] duration-[180ms] hover:scale-[1.04]">
                  <span
                    className="absolute inset-0 opacity-[0.12] transition-opacity duration-[180ms] group-hover/badge:opacity-[0.2]"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <span
                    className="relative h-1.5 w-1.5 rounded-full transition-[box-shadow,transform] duration-[180ms] group-hover/badge:scale-110"
                    style={{
                      backgroundColor: accent,
                      boxShadow: `0 0 0 3px ${accent}28`,
                    }}
                    aria-hidden
                  />
                  <span className="relative" style={{ color: accent }}>
                    Active
                  </span>
                </span>
              </div>

              <div
                className="rounded-xl px-3.5 py-3"
                style={{ backgroundColor: palette.surface2 }}
              >
                <div className="space-y-1.5">
                  <div
                    className="h-2 w-[92%] rounded-full opacity-40"
                    style={{ backgroundColor: palette.muted }}
                  />
                  <div
                    className="h-2 w-[78%] rounded-full opacity-30"
                    style={{ backgroundColor: palette.muted }}
                  />
                  <div
                    className="h-2 w-[64%] rounded-full opacity-20"
                    style={{ backgroundColor: palette.muted }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex h-9 cursor-default items-center ${radius} px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_-6px_rgba(0,0,0,0.28)] transition-[transform,filter,box-shadow] duration-[180ms] hover:-translate-y-px hover:brightness-[1.05]`}
                  style={{ backgroundColor: color }}
                >
                  Signer
                </span>
                <span
                  className={`inline-flex h-9 cursor-default items-center ${radius} border px-3.5 text-[13px] font-medium transition-[transform,background-color] duration-[180ms] hover:-translate-y-px`}
                  style={{
                    borderColor: accent,
                    color: accent,
                    backgroundColor: palette.bg,
                  }}
                >
                  Annuler
                </span>
                <span
                  className="cursor-default text-[13px] font-medium underline-offset-[3px] transition-[opacity,text-decoration] duration-[180ms] hover:underline hover:opacity-85"
                  style={{ color: accent }}
                >
                  Conditions
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`pdf-${color}-${accent}-${font.id}`}
            role="tabpanel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-white shadow-[var(--elev-2)]"
            style={{ fontFamily: font.family }}
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <div className="space-y-3 px-5 py-5 text-[#12141a]">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color }}
                >
                  {name}
                </p>
                {line ? (
                  <p className="mt-0.5 text-[11px] text-[#5c6370]">{line}</p>
                ) : null}
                {hasContact ? (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-[#6b7280]">
                    {[
                      contactAddress.trim(),
                      contactPhone.trim(),
                      contactEmail.trim(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <p className="text-[15px] font-semibold tracking-tight">
                Décharge de responsabilité
              </p>
              <div className="space-y-1.5 border-t border-[#e5e7eb] pt-3">
                <div className="h-1.5 w-[88%] rounded-full bg-[#e8eaed]" />
                <div className="h-1.5 w-[72%] rounded-full bg-[#eef0f3]" />
                <div className="h-1.5 w-[60%] rounded-full bg-[#f3f4f6]" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <span className="text-[10px] font-medium text-[#6b7280]">
                  Document généré par Paova
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
