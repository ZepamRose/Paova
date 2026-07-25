"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DEFAULT_BRAND_COLOR,
  DEFAULT_ENABLED_LOCALES,
  DEFAULT_PUBLIC_HEADER_STYLE,
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
import { PublicThemePicker } from "./public-theme-picker";
import { SettingsToggle } from "./settings-toggle";
import { SettingsPreview } from "./settings-preview";
import { ResetSettingsDialog } from "./reset-settings-dialog";

const EASE = [0.22, 1, 0.36, 1] as const;

const LOCALES: { id: SupportedLocale; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "nl", label: "Nederlands" },
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
];

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

const cardSoft =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_62%,var(--color-foreground))] bg-[var(--color-surface)] p-3.5 shadow-[var(--elev-2)] sm:p-4";

const field =
  "mt-1.5 min-h-[2.75rem] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_82%,var(--color-surface-2))] px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/50 hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const textarea =
  "mt-1.5 min-h-[4.5rem] w-full resize-y rounded-xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_82%,var(--color-surface-2))] px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/50 hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const divider =
  "h-px w-full bg-[color-mix(in_srgb,var(--color-border)_62%,transparent)]";

const toggleGrid =
  "grid grid-cols-1 gap-0.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-background))] p-1 shadow-[var(--elev-1)] sm:grid-cols-2";

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
  initialContactAddress,
  initialContactPhone,
  initialContactEmail,
  initialWebsiteUrl,
  initialThankYouTitle,
  initialThankYouMessage,
  initialThankYouButtonLabel,
  initialThankYouButtonUrl,
  initialCustomDomain,
  initialCustomDomainStatus,
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
  initialEmailShowLogo,
  initialEnabledLocales,
  logoUrl,
  currentPublicHost,
  previewPublicUrl = null,
  previewMerciUrl = null,
}: {
  businessId: string;
  initialName: string;
  initialTagline: string | null;
  initialColor: string;
  initialAccent: string | null;
  initialPublicTheme: string | null;
  initialContactAddress: string | null;
  initialContactPhone: string | null;
  initialContactEmail: string | null;
  initialWebsiteUrl: string | null;
  initialThankYouTitle: string | null;
  initialThankYouMessage: string | null;
  initialThankYouButtonLabel: string | null;
  initialThankYouButtonUrl: string | null;
  initialCustomDomain: string | null;
  initialCustomDomainStatus: string | null;
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
  initialEmailShowLogo: boolean;
  initialEnabledLocales: string[] | null;
  logoUrl: string | null;
  currentPublicHost: string;
  previewPublicUrl?: string | null;
  previewMerciUrl?: string | null;
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
  const [emailShowLogo, setEmailShowLogo] = useState(initialEmailShowLogo);
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
    emailShowLogo !== initialEmailShowLogo ||
    !localesEqual(enabledLocales, initialLocalesResolved);

  const domainStatus = initialCustomDomainStatus ?? "unavailable";
  const domainStatusLabel =
    domainStatus === "active"
      ? "Connecté"
      : domainStatus === "pending"
        ? "En attente"
        : "Non connecté";

  function toggleLocale(id: SupportedLocale) {
    setEnabledLocales((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

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
    setEmailShowLogo(true);
    setEnabledLocales([...DEFAULT_ENABLED_LOCALES]);
  }

  const resetButtonClass =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] px-3 py-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[transform,border-color,background-color,box-shadow] duration-[180ms] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0";

  const previewProps = {
    businessName: name,
    tagline,
    color,
    accent,
    publicTheme,
    showLogo: publicShowLogo,
    showName: publicShowName,
    showTagline: publicShowTagline,
    showContact: publicShowContact,
    contactAddress,
    contactPhone,
    contactEmail,
    websiteUrl,
    thankYouTitle,
    thankYouMessage,
    thankYouButtonLabel,
    thankYouButtonUrl,
    emailFromName,
    emailSubject: emailSubject.replaceAll("{nom}", name.trim() || "…"),
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
    hasUnsavedChanges: dirty,
    logoUrl,
  };

  return (
    <form action={updateBusiness}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-2 flex flex-col gap-3 sm:gap-3.5 lg:order-1">
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
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <label
                    htmlFor="tagline"
                    className="text-[13px] font-medium tracking-tight"
                  >
                    Slogan
                  </label>
                  <input
                    id="tagline"
                    name="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    maxLength={120}
                    placeholder="Parc aventure · Lyon"
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

          {/* 2. Documents & Branding */}
          <motion.section
            className={card}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE, delay: 0.03 }}
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
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </SectionIcon>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-[1rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Documents & branding
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-muted)]">
                  Ce que voient vos clients sur la page de signature. Le PDF
                  reste en option.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className={nestedPanel}>
                <Subhead
                  title="Page de signature"
                  hint="En-tête du formulaire public."
                />
                <input
                  type="hidden"
                  name="public_header_style"
                  value={DEFAULT_PUBLIC_HEADER_STYLE}
                />
                <div className={toggleGrid}>
                  <SettingsToggle
                    dense
                    name="public_show_logo"
                    checked={publicShowLogo}
                    onChange={setPublicShowLogo}
                    label="Logo"
                  />
                  <SettingsToggle
                    dense
                    name="public_show_name"
                    checked={publicShowName}
                    onChange={setPublicShowName}
                    label="Nom"
                  />
                  <SettingsToggle
                    dense
                    name="public_show_tagline"
                    checked={publicShowTagline}
                    onChange={setPublicShowTagline}
                    label="Slogan"
                  />
                  <SettingsToggle
                    dense
                    name="public_show_contact"
                    checked={publicShowContact}
                    onChange={setPublicShowContact}
                    label="Coordonnées"
                  />
                </div>
                <div className="mt-3.5 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] pt-3.5">
                  <PublicThemePicker
                    name="public_theme"
                    value={publicTheme}
                    onChange={setPublicTheme}
                    compact
                  />
                </div>
              </div>

              <details className="group rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_45%,var(--color-surface))]">
                <summary className="cursor-pointer list-none px-3.5 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                        Preuves PDF
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-muted)]">
                        Contenu des copies PDF générées après signature.
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-normal text-[var(--color-muted)] transition-transform duration-[160ms] group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] px-3.5 py-3.5">
                  <div className={toggleGrid}>
                    <SettingsToggle
                      dense
                      name="pdf_show_logo"
                      checked={pdfShowLogo}
                      onChange={setPdfShowLogo}
                      label="Logo"
                    />
                    <SettingsToggle
                      dense
                      name="pdf_show_name"
                      checked={pdfShowName}
                      onChange={setPdfShowName}
                      label="Nom"
                    />
                    <SettingsToggle
                      dense
                      name="pdf_show_contact"
                      checked={pdfShowContact}
                      onChange={setPdfShowContact}
                      label="Coordonnées"
                    />
                    <SettingsToggle
                      dense
                      name="pdf_show_footer"
                      checked={pdfShowFooter}
                      onChange={setPdfShowFooter}
                      label="Pied de page"
                    />
                  </div>
                  {pdfShowContact ? (
                    <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-2 py-1.5">
                      <p className="mb-1 px-0.5 text-[11px] font-medium tracking-tight text-[var(--color-muted)]">
                        Dans les coordonnées
                      </p>
                      <div className={toggleGrid}>
                        <SettingsToggle
                          dense
                          name="pdf_show_phone"
                          checked={pdfShowPhone}
                          onChange={setPdfShowPhone}
                          label="Téléphone"
                        />
                        <SettingsToggle
                          dense
                          name="pdf_show_website"
                          checked={pdfShowWebsite}
                          onChange={setPdfShowWebsite}
                          label="Site web"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="hidden"
                        name="pdf_show_phone"
                        value={pdfShowPhone ? "1" : "0"}
                      />
                      <input
                        type="hidden"
                        name="pdf_show_website"
                        value={pdfShowWebsite ? "1" : "0"}
                      />
                    </>
                  )}
                </div>
              </details>
            </div>
          </motion.section>

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
                <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-muted)]">
                  E-mail de confirmation d’abord ; page de remerciement en
                  option.
                </p>
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
                  <div className="max-w-xs">
                    <SettingsToggle
                      dense
                      name="email_show_logo"
                      checked={emailShowLogo}
                      onChange={setEmailShowLogo}
                      label="Logo"
                    />
                  </div>
                </div>
              </div>

              <details className="group rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_45%,var(--color-surface))]">
                <summary className="cursor-pointer list-none px-3.5 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                        Page de remerciement
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-muted)]">
                        Affichée après signature — onglet Remerciement dans
                        l’aperçu.
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-normal text-[var(--color-muted)] transition-transform duration-[160ms] group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] px-3.5 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="thank_you_title"
                      className="text-[12.5px] font-medium tracking-tight"
                    >
                      Titre
                    </label>
                    <input
                      id="thank_you_title"
                      name="thank_you_title"
                      value={thankYouTitle}
                      onChange={(e) => setThankYouTitle(e.target.value)}
                      maxLength={80}
                      placeholder="Décharge signée"
                      className={field}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="thank_you_message"
                      className="text-[12.5px] font-medium tracking-tight"
                    >
                      Message
                    </label>
                    <textarea
                      id="thank_you_message"
                      name="thank_you_message"
                      value={thankYouMessage}
                      onChange={(e) => setThankYouMessage(e.target.value)}
                      maxLength={400}
                      rows={2}
                      placeholder="Votre signature a été enregistrée auprès de {nom}."
                      className={textarea}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="thank_you_button_label"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Libellé du bouton
                      </label>
                      <input
                        id="thank_you_button_label"
                        name="thank_you_button_label"
                        value={thankYouButtonLabel}
                        onChange={(e) => setThankYouButtonLabel(e.target.value)}
                        maxLength={40}
                        placeholder="Retour au site"
                        className={field}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label
                        htmlFor="thank_you_button_url"
                        className="text-[12.5px] font-medium tracking-tight"
                      >
                        Lien
                      </label>
                      <input
                        id="thank_you_button_url"
                        name="thank_you_button_url"
                        type="url"
                        value={thankYouButtonUrl}
                        onChange={(e) => setThankYouButtonUrl(e.target.value)}
                        placeholder="https://votresite.fr"
                        className={field}
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </motion.section>

          {/* 4. Paramètres avancés */}
          <motion.section
            className={cardSoft}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE, delay: 0.09 }}
          >
            <div className="flex items-start gap-3">
              <SectionIcon tone="muted">
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </SectionIcon>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Paramètres avancés
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
                  Domaine et langues — préparation des prochaines étapes.
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-col gap-3">
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_40%,transparent)] px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium tracking-tight">
                        Domaine personnalisé
                      </p>
                      <span className="rounded-md bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)]">
                        Bientôt
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
                      Actuel · {currentPublicHost}
                      <span className="mx-1.5 text-[var(--color-muted)]/40">
                        ·
                      </span>
                      {domainStatusLabel}
                    </p>
                  </div>
                </div>
                <input
                  id="custom_domain"
                  name="custom_domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="signatures.monentreprise.be"
                  className={`${field} mt-2.5`}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Domaine personnalisé"
                />
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-muted)]/80">
                  Disponible avec certaines offres. La connexion DNS viendra
                  ensuite.
                </p>
              </div>

              <div>
                <Subhead title="Langues" />
                <div className={toggleGrid}>
                  {LOCALES.map((locale) => (
                    <SettingsToggle
                      key={locale.id}
                      dense
                      name={`locale_${locale.id}`}
                      checked={enabledLocales.includes(locale.id)}
                      onChange={() => toggleLocale(locale.id)}
                      label={locale.label}
                    />
                  ))}
                </div>
                <input
                  type="hidden"
                  name="enabled_locales"
                  value={enabledLocales.join(",")}
                />
              </div>
            </div>
          </motion.section>
        </div>

        {/* Sticky live preview + reset — stays visible while scrolling */}
        <aside className="order-1 lg:sticky lg:top-5 lg:order-2 lg:self-start">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE, delay: 0.06 }}
            className="flex flex-col gap-3"
          >
            <SettingsPreview {...previewProps} />
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className={`${resetButtonClass} w-full`}
            >
              <RotateCcw size={14} strokeWidth={1.9} aria-hidden />
              Restaurer les réglages par défaut
            </button>
            <p className="px-1 text-[11.5px] leading-snug text-[var(--color-muted)]/75">
              Nom et logo conservés. Enregistrez ensuite pour appliquer.
            </p>
          </motion.div>
        </aside>
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
