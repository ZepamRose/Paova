"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Type } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DEFAULT_BRAND_FONT,
  isBrandFontId,
  type BrandFontId,
} from "@/lib/brand-fonts";
import { updateBusiness } from "./actions";
import { LogoUploader } from "./logo-uploader";
import { ColorPicker } from "./color-picker";
import { FontPicker } from "./font-picker";
import { BrandPreview } from "./brand-preview";

const EASE = [0.22, 1, 0.36, 1] as const;

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_14%,transparent)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[var(--elev-3)] transition-shadow duration-[180ms] sm:p-7";

const field =
  "mt-2 min-h-[3.15rem] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_88%,var(--color-surface-2))] px-4 py-3.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/50 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

function normalizeColor(c: string) {
  return (c || "#5e926c").trim().toLowerCase();
}

export function SettingsForm({
  businessId,
  initialName,
  initialColor,
  initialFont,
  logoUrl,
}: {
  businessId: string;
  initialName: string;
  initialColor: string;
  initialFont: string | null;
  logoUrl: string | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || "#5e926c");
  const [font, setFont] = useState<BrandFontId>(
    initialFont && isBrandFontId(initialFont)
      ? initialFont
      : DEFAULT_BRAND_FONT,
  );

  const dirty =
    name.trim() !== initialName.trim() ||
    normalizeColor(color) !== normalizeColor(initialColor || "#5e926c") ||
    font !==
      (initialFont && isBrandFontId(initialFont)
        ? initialFont
        : DEFAULT_BRAND_FONT);

  return (
    <form action={updateBusiness} className="flex flex-col gap-6 sm:gap-7">
      <motion.section
        className={card}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        <div className="flex items-start gap-3.5">
          <SectionIcon>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
            </svg>
          </SectionIcon>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--color-foreground)]">
              Identité
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Les informations visibles par vos participants.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-7 sm:gap-8">
          <LogoUploader businessId={businessId} currentLogoUrl={logoUrl} />

          <div className="h-px w-full bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />

          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium tracking-tight">
              Nom
            </label>
            <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
              Visible par vos participants.
            </p>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Escape Room Liège centre"
              className={field}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        className={`relative z-10 ${card}`}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE, delay: 0.04 }}
      >
        <div className="flex items-start gap-3.5">
          <SectionIcon>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="10.5" r="2.5" />
              <circle cx="8.5" cy="7.5" r="2.5" />
              <circle cx="6.5" cy="12.5" r="2.5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </SectionIcon>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--color-foreground)]">
              Apparence
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
              La couleur de votre marque sur Paova.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label htmlFor="brand_color_trigger" className="sr-only">
              Couleur principale
            </label>
            <p className="mb-2.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Utilisée sur les boutons, badges et éléments de marque.
            </p>
            <ColorPicker
              id="brand_color_trigger"
              name="brand_color"
              value={color}
              onChange={setColor}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        className={card}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE, delay: 0.08 }}
      >
        <div className="flex items-start gap-3.5">
          <SectionIcon>
            <Type size={17} strokeWidth={1.85} />
          </SectionIcon>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--color-foreground)]">
              Typographie de la marque
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Choisissez la police utilisée pour représenter votre
              établissement.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-6">
          <FontPicker name="brand_font" value={font} onChange={setFont} />
          <BrandPreview color={color} businessName={name} fontId={font} />
        </div>
      </motion.section>

      <AnimatePresence>
        {dirty ? (
          <motion.div
            key="actions"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="sticky bottom-4 z-20"
          >
            <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-background))] shadow-[var(--elev-3)] backdrop-blur-md">
              <div className="border-t border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))]" />
              <div className="flex flex-col gap-3.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-[1.125rem]">
                <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
                  Les modifications s&apos;appliquent à vos pages publiques et
                  PDF.
                </p>
                <div className="flex items-center justify-end gap-2 sm:shrink-0">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-sm font-medium text-[var(--color-muted)] transition-[color,background-color,transform] duration-[180ms] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99]"
                  >
                    Annuler
                  </Link>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-10px_color-mix(in_srgb,var(--color-brand)_45%,transparent)] transition-[transform,box-shadow,filter] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.05] hover:shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
