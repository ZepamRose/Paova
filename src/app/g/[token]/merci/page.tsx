import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveBrandFont } from "@/lib/brand-fonts";
import {
  DEFAULT_BRAND_COLOR,
  resolveAccentColor,
  resolveButtonRadius,
  resolvePublicTheme,
  sanitizeLogoUrl,
} from "@/lib/branding";
import { BrandFontLink } from "@/components/brand-font-link";
import {
  PublicThemeLock,
  PublicThemeScript,
} from "@/components/public-theme-lock";
import { GroupMerciView } from "./group-merci-view";

export default async function GroupThankYouPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, name, business_id, signature_mode")
    .eq("public_token", token)
    .maybeSingle();

  let businessName: string | null = null;
  let logoUrl: string | null = null;
  let brandColor = DEFAULT_BRAND_COLOR;
  let brandAccent = DEFAULT_BRAND_COLOR;
  let brandFontId: string | null = null;
  let buttonRadius = resolveButtonRadius(null);
  let publicTheme = resolvePublicTheme(null);
  let groupName = "";
  let representativeName: string | null = null;
  let signedAt: string | null = null;

  if (group) {
    groupName = group.name;
    
    const { data: business } = await supabase
      .from("business")
      .select(
        "name, logo_url, brand_color, brand_font, brand_accent, brand_button_radius, public_theme",
      )
      .eq("id", group.business_id)
      .maybeSingle();
    
    businessName = business?.name ?? null;
    logoUrl = sanitizeLogoUrl(business?.logo_url);
    brandColor = business?.brand_color || brandColor;
    brandAccent = resolveAccentColor(
      business?.brand_color,
      business?.brand_accent,
    );
    brandFontId = business?.brand_font ?? null;
    buttonRadius = resolveButtonRadius(business?.brand_button_radius);
    publicTheme = resolvePublicTheme(business?.public_theme);

    // Get representative signature if in group_representative mode
    if (group.signature_mode === "group_representative") {
      const { data: submission } = await supabase
        .from("submission")
        .select("signer_name, signed_at")
        .eq("represented_group_id", group.id)
        .eq("signature_type", "group_representative")
        .maybeSingle();

      if (submission) {
        representativeName = submission.signer_name;
        signedAt = submission.signed_at;
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
        <GroupMerciView
          token={token}
          businessName={businessName}
          groupName={groupName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          brandAccent={brandAccent}
          buttonRadius={buttonRadius}
          representativeName={representativeName}
          signedAt={signedAt}
        />
      </div>
    </>
  );
}
