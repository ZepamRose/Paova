"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  buttonRadiusClass,
  formatThankYouMessage,
  type BrandButtonRadius,
  type PublicTheme,
} from "@/lib/branding";

type PreviewTab = "form" | "merci" | "pdf" | "email";

const TABS: { id: PreviewTab; label: string }[] = [
  { id: "form", label: "Formulaire" },
  { id: "merci", label: "Remerciement" },
  { id: "pdf", label: "PDF" },
  { id: "email", label: "Email" },
];

const PALETTE = {
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

export function SettingsPreview({
  businessName,
  tagline,
  color,
  accent,
  publicTheme,
  buttonRadius = "soft",
  showLogo,
  showName,
  showTagline,
  showContact,
  contactAddress,
  contactPhone,
  contactEmail,
  websiteUrl,
  thankYouTitle,
  thankYouMessage,
  thankYouButtonLabel,
  thankYouButtonUrl,
  emailFromName,
  emailSubject,
  emailSignature,
  emailFooter,
  emailShowLogo,
  pdfShowLogo,
  pdfShowName,
  pdfShowContact,
  pdfShowWebsite,
  pdfShowPhone,
  pdfShowFooter,
  previewPublicUrl,
  previewMerciUrl,
  hasUnsavedChanges,
  logoUrl,
}: {
  businessName: string;
  tagline: string;
  color: string;
  accent: string;
  publicTheme: PublicTheme;
  buttonRadius?: BrandButtonRadius;
  showLogo: boolean;
  showName: boolean;
  showTagline: boolean;
  showContact: boolean;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl: string;
  thankYouTitle: string;
  thankYouMessage: string;
  thankYouButtonLabel: string;
  thankYouButtonUrl: string;
  emailFromName: string;
  emailSubject: string;
  emailSignature: string;
  emailFooter: string;
  emailShowLogo: boolean;
  pdfShowLogo: boolean;
  pdfShowName: boolean;
  pdfShowContact: boolean;
  pdfShowWebsite: boolean;
  pdfShowPhone: boolean;
  pdfShowFooter: boolean;
  previewPublicUrl: string | null;
  previewMerciUrl: string | null;
  hasUnsavedChanges: boolean;
  logoUrl: string | null;
}) {
  const [tab, setTab] = useState<PreviewTab>("form");
  const reduced = useReducedMotion() ?? false;
  const name = businessName.trim() || "Votre établissement";
  const palette = PALETTE[publicTheme];
  const radius = buttonRadiusClass(buttonRadius);
  const contactLine = [
    showContact ? contactAddress.trim() : "",
    showContact ? contactPhone.trim() : "",
    showContact ? contactEmail.trim() : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const merciTitle = thankYouTitle.trim() || "Décharge signée";
  const merciMessage = formatThankYouMessage(
    thankYouMessage,
    name,
    `Votre signature a été enregistrée avec succès auprès de ${name}.`,
  );
  const merciBtn = thankYouButtonLabel.trim() || "Retour au site";
  const showMerciBtn = Boolean(thankYouButtonUrl.trim());

  const from = emailFromName.trim() || name;
  const subject =
    emailSubject.trim() || `Votre décharge signée — ${name}`;

  const openUrl =
    tab === "merci" ? previewMerciUrl : tab === "form" ? previewPublicUrl : null;

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-3)] sm:p-5">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]/70">
              Aperçu en direct
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-[var(--color-muted)]">
              Les changements se reflètent immédiatement.
            </p>
          </div>
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              title={
                hasUnsavedChanges
                  ? "Ouvre la page avec les réglages déjà enregistrés"
                  : "Ouvrir l’aperçu complet"
              }
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_55%,var(--color-surface))] px-2.5 text-[12px] font-medium text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,border-color,box-shadow] duration-[200ms] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            >
              <ExternalLink size={13} strokeWidth={1.85} aria-hidden />
              Ouvrir
            </a>
          ) : null}
        </div>
        <div
          className="inline-flex w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[var(--color-surface-2)] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]"
          role="tablist"
          aria-label="Type d'aperçu"
        >
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] transition-[background-color,color,box-shadow] duration-[200ms] ${
                  selected
                    ? "bg-[var(--color-surface)] font-semibold text-[var(--color-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
                    : "font-medium text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasUnsavedChanges && openUrl ? (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]/75">
          L&apos;aperçu ouvert utilise les réglages déjà enregistrés.
        </p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-3.5 min-h-[280px] overflow-hidden rounded-2xl border shadow-[var(--elev-2)]"
          style={{
            backgroundColor: tab === "email" || tab === "pdf" ? "#fff" : palette.bg,
            borderColor: tab === "email" || tab === "pdf" ? "#e5e7eb" : palette.border,
            color: tab === "email" || tab === "pdf" ? "#12141a" : palette.fg,
          }}
        >
          {tab === "form" ? (
            <div>
              <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
              <div className="space-y-3.5 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  {showLogo ? (
                    logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-10 w-10 rounded-xl object-contain"
                      />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : null}
                  <div className="min-w-0">
                    {showName ? (
                      <p
                        className="text-[13px] font-semibold tracking-tight"
                        style={{ color }}
                      >
                        {name}
                      </p>
                    ) : null}
                    {showTagline && tagline.trim() ? (
                      <p
                        className="mt-0.5 text-[11px]"
                        style={{ color: palette.muted }}
                      >
                        {tagline.trim()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-[15px] font-semibold tracking-tight">
                  Décharge de responsabilité
                </p>
                <div
                  className="space-y-1.5 rounded-xl px-3 py-3"
                  style={{ backgroundColor: palette.surface2 }}
                >
                  <div
                    className="h-2 w-[90%] rounded-full opacity-35"
                    style={{ backgroundColor: palette.muted }}
                  />
                  <div
                    className="h-2 w-[70%] rounded-full opacity-25"
                    style={{ backgroundColor: palette.muted }}
                  />
                </div>
                <span
                  className={`inline-flex h-9 items-center ${radius} px-4 text-[13px] font-semibold text-white`}
                  style={{ backgroundColor: color }}
                >
                  Signer et valider
                </span>
                {contactLine ? (
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: palette.muted }}
                  >
                    {contactLine}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "merci" ? (
            <div className="px-5 py-6 text-center">
              <div
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
                  color,
                }}
              >
                ✓
              </div>
              <p
                className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: accent }}
              >
                Succès
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight">
                {merciTitle}
              </p>
              <p
                className="mx-auto mt-1.5 max-w-[18rem] text-[12.5px] leading-relaxed"
                style={{ color: palette.muted }}
              >
                {merciMessage}
              </p>
              {showMerciBtn ? (
                <span
                  className={`mt-4 inline-flex h-9 items-center ${radius} px-4 text-[12.5px] font-semibold text-white`}
                  style={{ backgroundColor: color }}
                >
                  {merciBtn}
                </span>
              ) : null}
            </div>
          ) : null}

          {tab === "pdf" ? (
            <div className="space-y-3 px-5 py-5">
              <div
                className="h-1 w-full rounded-full"
                style={{ backgroundColor: color }}
              />
              {pdfShowLogo && logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-8 w-auto object-contain" />
              ) : null}
              {pdfShowName ? (
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color }}
                >
                  {name}
                </p>
              ) : null}
              {(pdfShowContact || pdfShowPhone || pdfShowWebsite) &&
              [
                pdfShowContact ? contactAddress.trim() : "",
                pdfShowPhone ? contactPhone.trim() : "",
                pdfShowContact ? contactEmail.trim() : "",
                pdfShowWebsite ? websiteUrl.trim() : "",
              ].some(Boolean) ? (
                <p className="text-[10px] leading-relaxed text-[#6b7280]">
                  {[
                    pdfShowContact ? contactAddress.trim() : "",
                    pdfShowPhone ? contactPhone.trim() : "",
                    pdfShowContact ? contactEmail.trim() : "",
                    pdfShowWebsite ? websiteUrl.trim() : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="text-[15px] font-semibold tracking-tight">
                Décharge de responsabilité
              </p>
              <div className="space-y-1.5 border-t border-[#e5e7eb] pt-3">
                <div className="h-1.5 w-[88%] rounded-full bg-[#e8eaed]" />
                <div className="h-1.5 w-[70%] rounded-full bg-[#eef0f3]" />
              </div>
              {pdfShowFooter ? (
                <p className="pt-1 text-[10px] text-[#6b7280]">
                  Document généré par Paova
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "email" ? (
            <div className="space-y-3 px-5 py-5">
              <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-[#6b7280]">De</p>
                  <p className="truncate text-[13px] font-medium">{from}</p>
                </div>
                {emailShowLogo && logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-lg object-contain"
                  />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] text-[#6b7280]">Objet</p>
                <p className="mt-0.5 text-[13px] font-semibold tracking-tight">
                  {subject}
                </p>
              </div>
              <p className="text-[12.5px] leading-relaxed text-[#374151]">
                Bonjour,
                <br />
                Vous trouverez ci-joint votre document signé.
              </p>
              {emailSignature.trim() ? (
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[#4b5563]">
                  {emailSignature.trim()}
                </p>
              ) : (
                <p className="text-[12px] text-[#4b5563]">— L&apos;équipe {name}</p>
              )}
              {emailFooter.trim() ? (
                <p className="border-t border-[#e5e7eb] pt-3 text-[10px] text-[#9ca3af]">
                  {emailFooter.trim()}
                </p>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
