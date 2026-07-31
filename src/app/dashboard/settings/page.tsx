import { redirect } from "next/navigation";
import Link from "next/link";
import { requireDashboardCapability } from "@/lib/auth/session";
import { isPro } from "@/lib/plan";
import { SettingsForm } from "./settings-form";
import { SettingsSavedBanner } from "./settings-saved-banner";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const { supabase, membership } =
    await requireDashboardCapability("edit_business_info");

  const { data: planRow } = await supabase
    .from("business")
    .select("plan, subscription_status")
    .eq("id", membership.businessId)
    .maybeSingle();
  const pro = isPro(planRow);

  const { data: business } = await supabase
    .from("business")
    .select(
      "id, name, brand_color, logo_url, tagline, brand_accent, contact_address, contact_phone, contact_email, website_url, thank_you_title, thank_you_message, thank_you_button_label, thank_you_button_url, public_theme, custom_domain, custom_domain_status, public_header_style, public_show_logo, public_show_name, public_show_tagline, public_show_contact, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer, email_from_name, email_subject_template, email_signature, email_footer, email_show_logo, enabled_locales",
    )
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) {
    redirect("/onboarding");
  }



  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-5 py-7 sm:gap-6 sm:px-8 sm:py-9 lg:px-10">
      <header className="flex flex-col gap-1.5">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-[var(--color-muted)]/80 transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-col gap-1">
            <h1 className="text-[1.625rem] font-semibold tracking-tight sm:text-[1.85rem]">
              Réglages
            </h1>
            <p className="max-w-2xl text-[14px] leading-snug text-[var(--color-muted)]">
              Gérez l&apos;identité de votre établissement et les e-mails
              envoyés après chaque signature.
            </p>
        </div>
      </header>

      <SettingsSavedBanner show={Boolean(success)} />

      {error === "name" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 text-sm leading-relaxed text-[#92400e] dark:text-[#fbbf24]"
        >
          Le nom de l&apos;établissement est obligatoire.
        </p>
      ) : null}

      {error === "pro_required" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5 text-sm leading-relaxed text-[#92400e] dark:text-[#fbbf24]"
        >
          La personnalisation de la marque est réservée au plan Pro.
        </p>
      ) : null}

      {!pro ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] px-4 py-3.5">
          <p className="text-[13.5px] leading-relaxed text-[var(--color-foreground)]">
            <span className="font-semibold">Personnalisation de la marque</span>
            {" — "}
            <span className="text-[var(--color-muted)]">
              couleurs, police, logo, thème et textes personnalisés sont inclus
              dans le plan Pro. Vos informations d&apos;établissement restent
              modifiables.
            </span>
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-[var(--color-brand)] px-3.5 text-[13px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            Passer à Pro
          </Link>
        </div>
      ) : null}

      <SettingsForm
        businessId={business.id}
        initialName={business.name}
        initialTagline={business.tagline}
        initialColor={business.brand_color}
        initialAccent={business.brand_accent}
        initialPublicTheme={business.public_theme}
        initialPublicHeaderStyle={business.public_header_style}
        initialContactAddress={business.contact_address}
        initialContactPhone={business.contact_phone}
        initialContactEmail={business.contact_email}
        initialWebsiteUrl={business.website_url}
        initialThankYouTitle={business.thank_you_title}
        initialThankYouMessage={business.thank_you_message}
        initialThankYouButtonLabel={business.thank_you_button_label}
        initialThankYouButtonUrl={business.thank_you_button_url}
        initialCustomDomain={business.custom_domain}
        initialPublicShowLogo={business.public_show_logo ?? true}
        initialPublicShowName={business.public_show_name ?? true}
        initialPublicShowTagline={business.public_show_tagline ?? true}
        initialPublicShowContact={business.public_show_contact ?? true}
        initialPdfShowLogo={business.pdf_show_logo ?? true}
        initialPdfShowName={business.pdf_show_name ?? true}
        initialPdfShowContact={business.pdf_show_contact ?? true}
        initialPdfShowWebsite={business.pdf_show_website ?? false}
        initialPdfShowPhone={business.pdf_show_phone ?? true}
        initialPdfShowFooter={business.pdf_show_footer ?? true}
        initialEmailFromName={business.email_from_name}
        initialEmailSubject={business.email_subject_template}
        initialEmailSignature={business.email_signature}
        initialEmailFooter={business.email_footer}
        initialEnabledLocales={business.enabled_locales}
        logoUrl={business.logo_url}
      />
    </main>
  );
}
