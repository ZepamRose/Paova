"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DEFAULT_BRAND_COLOR,
  DEFAULT_ENABLED_LOCALES,
  DEFAULT_PUBLIC_THEME,
  normalizeHexColor,
  resolveAccentColor,
  resolveEnabledLocales,
  resolvePublicTheme,
  type PublicTheme,
  type SupportedLocale,
} from "@/lib/branding";
import { updateBusiness } from "./actions";
import { LogoUploader } from "./logo-uploader";
import { ResetSettingsDialog } from "./reset-settings-dialog";

const EASE = [0.22, 1, 0.36, 1] as const;

function SectionIcon({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] ${
        tone === "muted"
          ? "bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)] text-[var(--color-muted)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border)_70%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_14%,transparent)]"
      }`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Subhead({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h3>
      {hint ? (
        <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const nestedPanel =
  "rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_42%,var(--color-surface))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-3.5";

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-3)] sm:p-5";

const field =
  "mt-1.5 min-h-[2.75rem] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_82%,var(--color-surface-2))] px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/50 hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const textarea =
  "mt-1.5 min-h-[4.5rem] w-full resize-y rounded-xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_82%,var(--color-surface-2))] px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/50 hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const divider =
  "h-px w-full bg-[color-mix(in_srgb,var(--color-border)_62%,transparent)]";

function norm(s: string | null | undefined) {
  return (s ?? "").trim();
}

function localesEqual(a: SupportedLocale[], b: SupportedLocale[]) {
  if (a.length !== b.length) return false;
  return [...a].sort().join(",") === [...b].sort().join(",");
}

export function SettingsForm({
  businessId,
  initialName,
  initialTagline,
  initialColor,
  initialAccent,
  initialPublicTheme,
  initialPublicHeaderStyle,
  initialContactAddress,
  initialContactPhone,
  initialContactEmail,
  initialWebsiteUrl,
  initialThankYouTitle,
  initialThankYouMessage,
  initialThankYouButtonLabel,
  initialThankYouButtonUrl,
  initialCustomDomain,
  initialPublicShowLogo,
  initialPublicShowName,
  initialPublicShowTagline,
  initialPublicShowContact,
  initialPdfShowLogo,
  initialPdfShowName,
  initialPdfShowContact,
  initialPdfShowWebsite,
  initialPdfShowPhone,
  initialPdfShowFooter,
  initialEmailFromName,
  initialEmailSubject,
  initialEmailSignature,
  initialEmailFooter,
  initialEnabledLocales,
  logoUrl,
}: {
  businessId: string;
  initialName: string;
  initialTagline: string | null;
  initialColor: string;
  initialAccent: string | null;
  initialPublicTheme: string | null;
  initialPublicHeaderStyle: string | null;
  initialContactAddress: string | null;
  initialContactPhone: string | null;
  initialContactEmail: string | null;
  initialWebsiteUrl: string | null;
  initialThankYouTitle: string | null;
  initialThankYouMessage: string | null;
  initialThankYouButtonLabel: string | null;
  initialThankYouButtonUrl: string | null;
  initialCustomDomain: string | null;
  initialPublicShowLogo: boolean;
  initialPublicShowName: boolean;
  initialPublicShowTagline: boolean;
  initialPublicShowContact: boolean;
  initialPdfShowLogo: boolean;
  initialPdfShowName: boolean;
  initialPdfShowContact: boolean;
  initialPdfShowWebsite: boolean;
  initialPdfShowPhone: boolean;
  initialPdfShowFooter: boolean;
  initialEmailFromName: string | null;
  initialEmailSubject: string | null;
  initialEmailSignature: string | null;
  initialEmailFooter: string | null;
  initialEnabledLocales: string[] | null;
  logoUrl: string | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline ?? "");
  const [color, setColor] = useState(
    normalizeHexColor(initialColor, DEFAULT_BRAND_COLOR),
  );
  const [accent, setAccent] = useState(
    resolveAccentColor(initialColor, initialAccent),
  );
  const [publicTheme, setPublicTheme] = useState<PublicTheme>(
    resolvePublicTheme(initialPublicTheme),
  );
  const [contactAddress, setContactAddress] = useState(
    initialContactAddress ?? "",
  );
  const [contactPhone, setContactPhone] = useState(initialContactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl ?? "");
  const [thankYouTitle, setThankYouTitle] = useState(
    initialThankYouTitle ?? "",
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    initialThankYouMessage ?? "",
  );
  const [thankYouButtonLabel, setThankYouButtonLabel] = useState(
    initialThankYouButtonLabel ?? "",
  );
  const [thankYouButtonUrl, setThankYouButtonUrl] = useState(
    initialThankYouButtonUrl ?? "",
  );
  const [customDomain, setCustomDomain] = useState(initialCustomDomain ?? "");
  const [publicShowLogo, setPublicShowLogo] = useState(initialPublicShowLogo);
  const [publicShowName, setPublicShowName] = useState(initialPublicShowName);
  const [publicShowTagline, setPublicShowTagline] = useState(
    initialPublicShowTagline,
  );
  const [publicShowContact, setPublicShowContact] = useState(
    initialPublicShowContact,
  );
  const [pdfShowLogo, setPdfShowLogo] = useState(initialPdfShowLogo);
  const [pdfShowName, setPdfShowName] = useState(initialPdfShowName);
  const [pdfShowContact, setPdfShowContact] = useState(initialPdfShowContact);
  const [pdfShowWebsite, setPdfShowWebsite] = useState(initialPdfShowWebsite);
  const [pdfShowPhone, setPdfShowPhone] = useState(initialPdfShowPhone);
  const [pdfShowFooter, setPdfShowFooter] = useState(initialPdfShowFooter);
  const [emailFromName, setEmailFromName] = useState(
    initialEmailFromName ?? "",
  );
  const [emailSubject, setEmailSubject] = useState(initialEmailSubject ?? "");
  const [emailSignature, setEmailSignature] = useState(
    initialEmailSignature ?? "",
  );
  const [emailFooter, setEmailFooter] = useState(initialEmailFooter ?? "");
  const [enabledLocales, setEnabledLocales] = useState<SupportedLocale[]>(
    resolveEnabledLocales(initialEnabledLocales),
  );
  const [resetOpen, setResetOpen] = useState(false);

  const initialAccentResolved = resolveAccentColor(
    initialColor,
    initialAccent,
  );
  const initialPublicThemeResolved = resolvePublicTheme(initialPublicTheme);
  const initialLocalesResolved = resolveEnabledLocales(initialEnabledLocales);

  const dirty =
    norm(name) !== norm(initialName) ||
    norm(tagline) !== norm(initialTagline) ||
    normalizeHexColor(color) !==
      normalizeHexColor(initialColor, DEFAULT_BRAND_COLOR) ||
    normalizeHexColor(accent) !== normalizeHexColor(initialAccentResolved) ||
    publicTheme !== initialPublicThemeResolved ||
    norm(contactAddress) !== norm(initialContactAddress) ||
    norm(contactPhone) !== norm(initialContactPhone) ||
    norm(contactEmail) !== norm(initialContactEmail) ||
    norm(websiteUrl) !== norm(initialWebsiteUrl) ||
    norm(thankYouTitle) !== norm(initialThankYouTitle) ||
    norm(thankYouMessage) !== norm(initialThankYouMessage) ||
    norm(thankYouButtonLabel) !== norm(initialThankYouButtonLabel) ||
    norm(thankYouButtonUrl) !== norm(initialThankYouButtonUrl) ||
    norm(customDomain) !== norm(initialCustomDomain) ||
    publicShowLogo !== initialPublicShowLogo ||
    publicShowName !== initialPublicShowName ||
    publicShowTagline !== initialPublicShowTagline ||
    publicShowContact !== initialPublicShowContact ||
    pdfShowLogo !== initialPdfShowLogo ||
    pdfShowName !== initialPdfShowName ||
    pdfShowContact !== initialPdfShowContact ||
    pdfShowWebsite !== initialPdfShowWebsite ||
    pdfShowPhone !== initialPdfShowPhone ||
    pdfShowFooter !== initialPdfShowFooter ||
    norm(emailFromName) !== norm(initialEmailFromName) ||
    norm(emailSubject) !== norm(initialEmailSubject) ||
    norm(emailSignature) !== norm(initialEmailSignature) ||
    norm(emailFooter) !== norm(initialEmailFooter) ||
    !localesEqual(enabledLocales, initialLocalesResolved);



  /** Restore product defaults (keeps name & logo). User must still save. */
  function applyDefaults() {
    setTagline("");
    setColor(DEFAULT_BRAND_COLOR);
    setAccent(DEFAULT_BRAND_COLOR);
    setPublicTheme(DEFAULT_PUBLIC_THEME);
    setContactAddress("");
    setContactPhone("");
    setContactEmail("");
    setWebsiteUrl("");
    setThankYouTitle("");
    setThankYouMessage("");
    setThankYouButtonLabel("");
    setThankYouButtonUrl("");
    setCustomDomain("");
    setPublicShowLogo(true);
    setPublicShowName(true);
    setPublicShowTagline(true);
    setPublicShowContact(true);
    setPdfShowLogo(true);
    setPdfShowName(true);
    setPdfShowContact(true);
    setPdfShowWebsite(false);
    setPdfShowPhone(true);
    setPdfShowFooter(true);
    setEmailFromName("");
    setEmailSubject("");
    setEmailSignature("");
    setEmailFooter("");
    setEnabledLocales([...DEFAULT_ENABLED_LOCALES]);
  }

  const resetButtonClass =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] px-3 py-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0";


  return (
    <form action={updateBusiness}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:gap-3.5">
          {/* 1. Identité */}
          <motion.section
            className={card}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="flex items-start gap-3">
              <SectionIcon>
                <svg
                  width="16"
                  height="16"
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
                <h2 className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Identité
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-muted)]">
                  Logo, nom et coordonnées de votre établissement.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <LogoUploader businessId={businessId} currentLogoUrl={logoUrl} />

              <div className={divider} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <label
                    htmlFor="name"
                    className="text-[13px] font-medium tracking-tight"
                  >
                    Nom
                  </label>
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

              <details className="group rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_50%,var(--color-surface))]">
                <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[13px] font-medium tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span>Coordonnées & site</span>
                    <span className="text-[11px] font-normal text-[var(--color-muted)] transition-transform duration-[160ms] group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3.5 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] px-3.5 py-3.5">
                  <input
                    id="contact_address"
                    name="contact_address"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    maxLength={200}
                    placeholder="Adresse"
                    className={field}
                    aria-label="Adresse"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      id="contact_phone"
                      name="contact_phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      maxLength={40}
                      placeholder="Téléphone"
                      className={field}
                      aria-label="Téléphone"
                    />
                    <input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      maxLength={120}
                      placeholder="E-mail"
                      className={field}
                      aria-label="E-mail"
                    />
                  </div>
                  <input
                    id="website_url"
                    name="website_url"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.monentreprise.be"
                    className={field}
                    aria-label="Site web"
                  />
                </div>
              </details>
            </div>
          </motion.section>

          {/* Preserve brand colors on save (no longer edited in settings UI). */}
          <input type="hidden" name="brand_color" value={color} />
          <input type="hidden" name="brand_accent" value={accent} />

          {/* Retired from the UI (V1 simplification) but still written by the
              server action. Posting the stored values keeps every tenant's data
              exactly as it was — dropping the fields would erase the text ones
              and flip the flags to their fallbacks.

              The document visibility flags are the deliberate exception: Paova
              now always prints what a business actually has, so they are pinned
              on rather than preserved. */}
          <input type="hidden" name="tagline" value={initialTagline ?? ""} />
          <input type="hidden" name="public_show_tagline" value={initialPublicShowTagline ? "1" : "0"} />
          <input type="hidden" name="public_theme" value={initialPublicTheme ?? ""} />
          <input type="hidden" name="public_header_style" value={initialPublicHeaderStyle ?? ""} />
          <input type="hidden" name="thank_you_title" value={initialThankYouTitle ?? ""} />
          <input type="hidden" name="thank_you_message" value={initialThankYouMessage ?? ""} />
          <input type="hidden" name="thank_you_button_label" value={initialThankYouButtonLabel ?? ""} />
          <input type="hidden" name="thank_you_button_url" value={initialThankYouButtonUrl ?? ""} />
          <input type="hidden" name="custom_domain" value={initialCustomDomain ?? ""} />
          <input type="hidden" name="enabled_locales" value={(initialEnabledLocales ?? []).join(",")} />
          <input type="hidden" name="pdf_show_logo" value="1" />
          <input type="hidden" name="pdf_show_name" value="1" />
          <input type="hidden" name="pdf_show_contact" value="1" />
          <input type="hidden" name="pdf_show_phone" value="1" />
          <input type="hidden" name="pdf_show_website" value="1" />
          <input type="hidden" name="pdf_show_footer" value="1" />
          <input type="hidden" name="public_show_logo" value="1" />
          <input type="hidden" name="public_show_name" value="1" />
          <input type="hidden" name="public_show_contact" value="1" />

          {/* 3. Communication */}
          <motion.section
            className={card}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE, delay: 0.05 }}
          >
            <div className="flex items-start gap-3">
              <SectionIcon>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.991 5.247a2 2 0 0 1-2.009 0L2 7" />
                </svg>
              </SectionIcon>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Communication
                </h2>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className={nestedPanel}>
                <Subhead
                  title="Email de confirmation"
                  hint="Envoyé après chaque signature."
                />
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="email_from_name"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Expéditeur
                      </label>
                      <input
                        id="email_from_name"
                        name="email_from_name"
                        value={emailFromName}
                        onChange={(e) => setEmailFromName(e.target.value)}
                        maxLength={80}
                        placeholder={name.trim() || "Votre établissement"}
                        className={field}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="email_subject_template"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Objet
                      </label>
                      <input
                        id="email_subject_template"
                        name="email_subject_template"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        maxLength={160}
                        placeholder="Votre décharge signée — {nom}"
                        className={field}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="email_signature"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Signature
                      </label>
                      <textarea
                        id="email_signature"
                        name="email_signature"
                        value={emailSignature}
                        onChange={(e) => setEmailSignature(e.target.value)}
                        maxLength={400}
                        rows={2}
                        placeholder={`Cordialement,\nL'équipe ${name.trim() || "…"}`}
                        className={textarea}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="email_footer"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Pied de page
                      </label>
                      <textarea
                        id="email_footer"
                        name="email_footer"
                        value={emailFooter}
                        onChange={(e) => setEmailFooter(e.target.value)}
                        maxLength={240}
                        rows={2}
                        placeholder="Mentions légales"
                        className={textarea}
                      />
                    </div>
                  </div>
                  {/* Le logo est désormais toujours affiché : la valeur est
                      épinglée plutôt que réglable. */}
                  <input type="hidden" name="email_show_logo" value="1" />
                </div>
              </div>

              
            </div>
          </motion.section>

        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className={`${resetButtonClass} w-fit`}
          >
            <RotateCcw size={14} strokeWidth={1.9} aria-hidden />
            Restaurer les réglages par défaut
          </button>
          <p className="px-1 text-[11.5px] leading-snug text-[var(--color-muted)]/75">
            Nom et logo conservés. Enregistrez ensuite pour appliquer.
          </p>
        </div>
      </div>

      <ResetSettingsDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={applyDefaults}
      />

      <AnimatePresence>
        {dirty ? (
          <motion.div
            key="actions"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="sticky bottom-4 z-20 mt-4"
          >
            <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_75%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-background))] shadow-[var(--elev-3)] backdrop-blur-md">
              <div className="border-t border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))]" />
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
                <p className="text-[13px] leading-snug text-[var(--color-muted)]">
                  Enregistrez pour appliquer ces changements.
                </p>
                <div className="flex items-center justify-end gap-2 sm:shrink-0">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-medium text-[var(--color-muted)] transition-[color,background-color,transform] duration-[180ms] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                  >
                    Annuler
                  </Link>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_20px_-10px_color-mix(in_srgb,var(--color-brand)_45%,transparent)] transition-[transform,box-shadow,filter] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0"
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
