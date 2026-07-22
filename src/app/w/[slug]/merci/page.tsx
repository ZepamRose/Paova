import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveBrandFont } from "@/lib/brand-fonts";
import { BrandFontLink } from "@/components/brand-font-link";
import { MerciView } from "./merci-view";

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sid?: string; borne?: string }>;
}) {
  const { slug } = await params;
  const { sid, borne } = await searchParams;
  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, title, business_id")
    .eq("public_slug", slug)
    .maybeSingle();

  let businessName: string | null = null;
  let logoUrl: string | null = null;
  let brandColor = "#5e926c";
  let brandFontId: string | null = null;
  let signedAt: string | null = null;
  let reference: string | null = null;

  if (template) {
    const { data: business } = await supabase
      .from("business")
      .select("name, logo_url, brand_color, brand_font")
      .eq("id", template.business_id)
      .maybeSingle();
    businessName = business?.name ?? null;
    logoUrl = business?.logo_url ?? null;
    brandColor = business?.brand_color || brandColor;
    brandFontId = business?.brand_font ?? null;

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
      }
    }
  }

  const brandFont = resolveBrandFont(brandFontId);

  return (
    <>
      <BrandFontLink fontId={brandFont.id} />
      <div style={{ fontFamily: brandFont.family }}>
        <MerciView
          slug={slug}
          businessName={businessName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          signedAt={signedAt}
          reference={reference}
          borne={borne === "1"}
        />
      </div>
    </>
  );
}
