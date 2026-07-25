import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import { resolveBrandFont } from "@/lib/brand-fonts";
import {
  DEFAULT_BRAND_COLOR,
  resolveAccentColor,
  resolveButtonRadius,
  resolvePublicTheme,
} from "@/lib/branding";
import {
  configFromTemplateRow,
  ensureTemplateNotStale,
  isExpirationMode,
  isTemplateStatus,
  isWithinSignatureHours,
  signatureHoursClosedCopy,
  type ExpirationMode,
} from "@/lib/templates";
import { BrandFontLink } from "@/components/brand-font-link";
import {
  PublicThemeLock,
  PublicThemeScript,
} from "@/components/public-theme-lock";
import { resolveTemplateIntent } from "@/lib/waiver-packs";
import { SignForm } from "./sign-form";
import { TrackPublicEvents } from "./track-public-events";

type WaiverField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "tel"
    | "date"
    | "checkbox"
    | "select"
    | "participants";
  required: boolean;
  options?: string[];
};

function PublicFooter({
  contactLines,
}: {
  contactLines?: string[];
}) {
  return (
    <footer className="mt-1 flex flex-col items-center gap-2 pb-2 pt-1 text-[12px] text-[var(--color-muted)]/75">
      {contactLines && contactLines.length > 0 ? (
        <p className="max-w-sm text-center text-[12px] leading-relaxed text-[var(--color-muted)]/70">
          {contactLines.join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        <span className="font-medium tracking-tight text-[var(--color-muted)]/85">
          Propulsé par Paova
        </span>
        <a
          href="/confidentialite"
          className="transition-colors duration-[180ms] hover:text-[var(--color-foreground)]"
        >
          Confidentialité
        </a>
        <a
          href="/mentions-legales"
          className="transition-colors duration-[180ms] hover:text-[var(--color-foreground)]"
        >
          Mentions légales
        </a>
      </div>
    </footer>
  );
}

export default async function PublicWaiverPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; borne?: string }>;
}) {
  const { slug } = await params;
  const { error, borne } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, legal_text, fields, signer_name_label, starter_pack_id, status, expiration_mode, expiration_days, expires_at, deleted_at, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("public_slug", slug)
    .maybeSingle();

  if (
    !template ||
    !isTemplateStatus(template.status) ||
    template.deleted_at
  ) {
    notFound();
  }

  const expirationMode: ExpirationMode = isExpirationMode(
    template.expiration_mode,
  )
    ? template.expiration_mode
    : "none";

  const lifecycle = await ensureTemplateNotStale(supabase, {
    id: template.id,
    business_id: template.business_id,
    title: template.title,
    status: template.status,
    expiration_mode: expirationMode,
    expiration_days: template.expiration_days,
    expires_at: template.expires_at,
  });

  // Inactive / archived: hide as not found. Expired / outside hours: clear message.
  if (!lifecycle.acceptsSignatures && lifecycle.status !== "expired") {
    notFound();
  }

  const hoursConfig = configFromTemplateRow(template);
  const withinHours = isWithinSignatureHours(hoursConfig);
  const outsideHours =
    lifecycle.acceptsSignatures && hoursConfig.enabled && !withinHours;

  const closedForHours = outsideHours || error === "hours";
  const closed =
    closedForHours ||
    !lifecycle.acceptsSignatures ||
    error === "closed" ||
    lifecycle.status === "expired";

  const { data: business } = await supabase
    .from("business")
    .select(
      "name, brand_color, brand_font, logo_url, owner_id, tagline, brand_accent, brand_button_radius, public_theme, contact_address, contact_phone, contact_email, public_show_logo, public_show_name, public_show_tagline, public_show_contact",
    )
    .eq("id", template.business_id)
    .maybeSingle();

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const intent = resolveTemplateIntent({
    starterPackId: template.starter_pack_id,
    fields,
    signerNameLabel: template.signer_name_label,
  });
  const isLegalRep = intent.signerRole === "legal_representative";

  const brandColor = business?.brand_color ?? DEFAULT_BRAND_COLOR;
  const brandAccent = resolveAccentColor(
    business?.brand_color,
    business?.brand_accent,
  );
  const buttonRadius = resolveButtonRadius(business?.brand_button_radius);
  const publicTheme = resolvePublicTheme(business?.public_theme);
  const brandFont = resolveBrandFont(business?.brand_font);
  const showLogo = business?.public_show_logo !== false;
  const showName = business?.public_show_name !== false;
  const showTagline = business?.public_show_tagline !== false;
  const showContact = business?.public_show_contact !== false;
  const tagline =
    showTagline && business?.tagline?.trim() ? business.tagline.trim() : null;
  const contactLines = showContact
    ? [
        business?.contact_address?.trim(),
        business?.contact_phone?.trim(),
        business?.contact_email?.trim(),
      ].filter((v): v is string => Boolean(v))
    : [];
  let limitReached = false;
  if (business && !closed) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", business.owner_id)
      .maybeSingle();

    if (!isPro(ownerProfile)) {
      const { count } = await supabase
        .from("submission")
        .select("id", { count: "exact", head: true })
        .eq("business_id", template.business_id)
        .gte("signed_at", currentMonthStartISO());
      limitReached = (count ?? 0) >= FREE_MONTHLY_LIMIT;
    }
  }

  const unavailableCopy = closedForHours
    ? signatureHoursClosedCopy(hoursConfig)
    : closed
      ? {
          eyebrow: lifecycle.status === "expired" ? "Expirée" : "Indisponible",
          title:
            lifecycle.status === "expired"
              ? "Cette décharge n'accepte plus de signatures"
              : "Les signatures sont fermées pour le moment",
          body: "Merci de contacter l'établissement si vous pensez qu'il s'agit d'une erreur.",
          meta: null as string | null,
        }
      : limitReached
        ? {
            eyebrow: "Temporairement indisponible",
            title: "Impossible de signer pour le moment",
            body: "Merci de contacter l'établissement directement.",
            meta: null as string | null,
          }
        : null;

  const showSigningFlow = !closed && !limitReached;

  return (
    <>
      <PublicThemeScript theme={publicTheme} />
      <PublicThemeLock theme={publicTheme} />
      <BrandFontLink fontId={brandFont.id} />
      {showSigningFlow ? <TrackPublicEvents slug={slug} /> : null}
      <div
        className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]"
        style={
          {
            fontFamily: brandFont.family,
            "--public-brand": brandColor,
            "--public-accent": brandAccent,
          } as CSSProperties
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -left-24 top-0 h-72 w-72 rounded-full opacity-[0.22] blur-3xl dark:opacity-[0.18]"
            style={{
              background: `radial-gradient(circle, ${brandColor} 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute -right-16 top-40 h-64 w-64 rounded-full opacity-[0.14] blur-3xl dark:opacity-[0.12]"
            style={{
              background: `radial-gradient(circle, ${brandAccent} 0%, transparent 70%)`,
            }}
          />
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-background)_88%,transparent)]" />
        </div>

        <main
          className={`relative mx-auto flex min-h-screen max-w-[32rem] flex-col px-5 py-8 sm:px-6 sm:py-11 ${
            showSigningFlow ? "gap-4 sm:gap-5" : "justify-center gap-8"
          }`}
        >
          <header
            className={`animate-fade-up flex flex-col ${
              showSigningFlow ? "gap-3.5" : "items-center gap-3 text-center"
            }`}
          >
            <div
              className={`flex flex-col gap-4 overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-background))] p-5 shadow-[var(--elev-3)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-6 ${
                showSigningFlow ? "" : "w-full max-w-md"
              }`}
            >
              <div
                className={`flex items-center gap-3.5 ${
                  showSigningFlow ? "" : "flex-col"
                }`}
              >
                {showLogo ? (
                  business?.logo_url ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.05rem] border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-2 shadow-[var(--elev-1)] sm:h-14 sm:w-14">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={business.logo_url}
                        alt={business?.name ?? "Logo"}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,var(--elev-1)]"
                      style={{ backgroundColor: brandColor }}
                      aria-hidden
                    >
                      {(business?.name?.trim()?.charAt(0) || "P").toUpperCase()}
                    </span>
                  )
                ) : null}
                <div
                  className={`min-w-0 ${showSigningFlow ? "" : "text-center"}`}
                >
                  {showName && business?.name ? (
                    <p
                      className="text-[15px] font-semibold tracking-tight"
                      style={{ color: brandColor }}
                    >
                      {business.name}
                    </p>
                  ) : null}
                  {tagline ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                      {tagline}
                    </p>
                  ) : null}
                  {showSigningFlow ? (
                    <p
                      className={`text-[13px] leading-relaxed text-[var(--color-muted)] ${
                        tagline || (showName && business?.name)
                          ? "mt-1"
                          : "mt-0.5"
                      }`}
                    >
                      {isLegalRep
                        ? "Autorisation à remplir par le parent ou représentant légal"
                        : "À signer avant l’activité"}
                    </p>
                  ) : null}
                </div>
              </div>

              {showSigningFlow ? (
                <div className="border-t border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] pt-4">
                  <h1 className="text-[1.5rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.7rem]">
                    {template.title}
                  </h1>
                </div>
              ) : (
                <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {template.title}
                </p>
              )}
            </div>
          </header>

          {showSigningFlow ? (
            <>
              <section className="animate-fade-up-delay overflow-hidden rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)] ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
                <div className="flex items-center justify-between gap-3 px-5 pb-0 pt-4 sm:px-6 sm:pt-5">
                  <p className="text-[12.5px] font-medium tracking-tight text-[var(--color-muted)]">
                    {isLegalRep
                      ? "Texte de l’autorisation"
                      : "Texte de la décharge"}
                  </p>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: brandColor }}
                    aria-hidden
                  />
                </div>
                <div className="max-h-[min(32vh,18rem)] overflow-y-auto px-5 py-3.5 sm:px-6 sm:py-4">
                  <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[var(--color-foreground)]/86">
                    {template.legal_text}
                  </p>
                </div>
                <div
                  className="h-px w-full bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-border)_80%,transparent)] to-transparent"
                  aria-hidden
                />
                <p className="px-5 py-3 text-[12px] leading-relaxed text-[var(--color-muted)] sm:px-6">
                  Lisez attentivement avant de remplir le formulaire ci-dessous.
                </p>
              </section>

              <div className="animate-fade-up-delay">
                <SignForm
                  slug={slug}
                  fields={fields}
                  brandColor={brandColor}
                  brandAccent={brandAccent}
                  buttonRadius={buttonRadius}
                  businessName={business?.name ?? null}
                  signerNameLabel={template.signer_name_label ?? null}
                  intent={intent}
                  hasError={error}
                  borne={borne === "1"}
                />
              </div>
            </>
          ) : unavailableCopy ? (
            <section className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] px-6 py-9 text-center shadow-[var(--elev-3)] sm:px-9 sm:py-10">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1"
                style={{
                  backgroundColor: `color-mix(in srgb, ${brandColor} 12%, transparent)`,
                  color: brandColor,
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${brandColor} 18%, transparent)`,
                }}
                aria-hidden
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <p
                className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: brandColor }}
              >
                {unavailableCopy.eyebrow}
              </p>
              <h1 className="mt-2.5 text-[1.55rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
                {unavailableCopy.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[22rem] text-[14.5px] leading-relaxed text-[var(--color-muted)]">
                {unavailableCopy.body}
              </p>
              {unavailableCopy.meta ? (
                <p className="mx-auto mt-6 max-w-[22rem] rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-2)]/60 px-4 py-3 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                  {unavailableCopy.meta}
                </p>
              ) : null}
            </section>
          ) : null}

          <PublicFooter contactLines={contactLines} />
        </main>
      </div>
    </>
  );
}
