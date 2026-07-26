import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveBrandFont } from "@/lib/brand-fonts";
import {
  DEFAULT_BRAND_COLOR,
  resolveAccentColor,
  resolveButtonRadius,
  resolvePublicTheme,
  sanitizeHttpUrl,
  sanitizeLogoUrl,
} from "@/lib/branding";
import {
  buildThankYouPdfHref,
  verifyPdfDownloadToken,
} from "@/lib/pdf-download-token";
import { BrandFontLink } from "@/components/brand-font-link";
import {
  PublicThemeLock,
  PublicThemeScript,
} from "@/components/public-theme-lock";
import { resolveTemplateIntent } from "@/lib/waiver-packs";
import { MerciView } from "./merci-view";

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sid?: string; t?: string; borne?: string; email?: string }>;
}) {
  const { slug } = await params;
  const { sid, t, borne, email } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, title, business_id, fields, signer_name_label, starter_pack_id")
    .eq("public_slug", slug)
    .maybeSingle();

  let businessName: string | null = null;
  let logoUrl: string | null = null;
  let brandColor = DEFAULT_BRAND_COLOR;
  let brandAccent = DEFAULT_BRAND_COLOR;
  let brandFontId: string | null = null;
  let buttonRadius = resolveButtonRadius(null);
  let publicTheme = resolvePublicTheme(null);
  let thankYouTitle: string | null = null;
  let thankYouMessage: string | null = null;
  let thankYouButtonLabel: string | null = null;
  let thankYouButtonUrl: string | null = null;
  let signedAt: string | null = null;
  let reference: string | null = null;
  let pdfHref: string | null = null;
  let isLegalRep = false;

  if (template) {
    const fields = Array.isArray(template.fields) ? template.fields : [];
    isLegalRep =
      resolveTemplateIntent({
        starterPackId: template.starter_pack_id,
        fields: fields as { type: string; label?: string }[],
        signerNameLabel: template.signer_name_label,
      }).signerRole === "legal_representative";
    const { data: business } = await supabase
      .from("business")
      .select(
        "name, logo_url, brand_color, brand_font, brand_accent, brand_button_radius, public_theme, thank_you_title, thank_you_message, thank_you_button_label, thank_you_button_url",
      )
      .eq("id", template.business_id)
      .maybeSingle();
    businessName = business?.name ?? null;
    logoUrl = sanitizeLogoUrl(business?.logo_url);
    thankYouButtonUrl = sanitizeHttpUrl(business?.thank_you_button_url);
    brandColor = business?.brand_color || brandColor;
    brandAccent = resolveAccentColor(
      business?.brand_color,
      business?.brand_accent,
    );
    brandFontId = business?.brand_font ?? null;
    buttonRadius = resolveButtonRadius(business?.brand_button_radius);
    publicTheme = resolvePublicTheme(business?.public_theme);
    thankYouTitle = business?.thank_you_title ?? null;
    thankYouMessage = business?.thank_you_message ?? null;
    thankYouButtonLabel = business?.thank_you_button_label ?? null;

    if (sid) {
      const { data: submission } = await supabase
        .from("submission")
        .select("id, signed_at")
        .eq("id", sid)
        .eq("template_id", template.id)
        .maybeSingle();

      if (submission) {
        signedAt = submission.signed_at;
        reference = `PV-${submission.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

        const tokenOk = verifyPdfDownloadToken(t, {
          submissionId: submission.id,
          slug,
        });
        if (tokenOk && t) {
          pdfHref = buildThankYouPdfHref({
            slug,
            submissionId: submission.id,
            token: t,
          });
        }
      }
    }
  }

  const brandFont = resolveBrandFont(brandFontId);

  return (
    <>
      <PublicThemeScript theme={publicTheme} />
      <PublicThemeLock theme={publicTheme} />
      <BrandFontLink fontId={brandFont.id} />
      <div style={{ fontFamily: brandFont.family }}>
        <MerciView
          slug={slug}
          businessName={businessName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          brandAccent={brandAccent}
          buttonRadius={buttonRadius}
          thankYouTitle={thankYouTitle}
          thankYouMessage={thankYouMessage}
          thankYouButtonLabel={thankYouButtonLabel}
          thankYouButtonUrl={thankYouButtonUrl}
          signedAt={signedAt}
          reference={reference}
          pdfHref={pdfHref}
          borne={borne === "1"}
          isLegalRep={isLegalRep}
          emailFailed={email === "0"}
        />
      </div>
    </>
  );
}
