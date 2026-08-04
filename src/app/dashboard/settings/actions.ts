"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActionCapability } from "@/lib/auth/session";
import { isPro } from "@/lib/plan";
import {
  clampText,
  formFlag,
  normalizeHexColor,
  resolveEnabledLocales,
  resolvePublicHeaderStyle,
  resolvePublicTheme,
  sanitizeCustomDomain,
  sanitizeHttpUrl,
  sanitizeLogoUrl,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/branding";

/**
 * Resolve the business the caller may edit. Filtering on `owner_id` alone
 * silently updated zero rows for admins; this fails loudly instead and keeps
 * the single source of truth in the capability matrix.
 */
async function requireEditableBusinessId(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  businessId: string;
}> {
  const { supabase, membership } =
    await requireActionCapability("edit_business_info");
  return { supabase, businessId: membership.businessId };
}

/** Subscription tier of the tenant (billing lives on `business`, see 0031). */
async function businessIsPro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business")
    .select("plan, subscription_status")
    .eq("id", businessId)
    .maybeSingle();
  return isPro(data);
}

function parseEnabledLocales(raw: string): SupportedLocale[] {
  const fromCsv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return resolveEnabledLocales(fromCsv);
}

export async function updateBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brandColor = normalizeHexColor(
    String(formData.get("brand_color") ?? ""),
    "#111827",
  );
  const accentRaw = String(formData.get("brand_accent") ?? "").trim();
  const brandAccent =
    accentRaw && accentRaw.toLowerCase() !== brandColor
      ? normalizeHexColor(accentRaw, brandColor)
      : null;
  const publicTheme = resolvePublicTheme(
    String(formData.get("public_theme") ?? ""),
  );
  const publicHeaderStyle = resolvePublicHeaderStyle(
    String(formData.get("public_header_style") ?? ""),
  );

  const tagline = clampText(formData.get("tagline"), 120);
  const contactAddress = clampText(formData.get("contact_address"), 200);
  const contactPhone = clampText(formData.get("contact_phone"), 40);
  const contactEmail = clampText(formData.get("contact_email"), 120);
  const websiteUrl = sanitizeHttpUrl(formData.get("website_url"));
  const thankYouTitle = clampText(formData.get("thank_you_title"), 80);
  const thankYouMessage = clampText(formData.get("thank_you_message"), 400);
  const thankYouButtonLabel = clampText(
    formData.get("thank_you_button_label"),
    40,
  );
  const thankYouButtonUrl = sanitizeHttpUrl(
    formData.get("thank_you_button_url"),
  );
  const customDomain = sanitizeCustomDomain(formData.get("custom_domain"));

  const emailFromName = clampText(formData.get("email_from_name"), 80);
  const emailSubjectTemplate = clampText(
    formData.get("email_subject_template"),
    160,
  );
  const emailSignature = clampText(formData.get("email_signature"), 400);
  const emailFooter = clampText(formData.get("email_footer"), 240);

  const enabledLocales = parseEnabledLocales(
    String(formData.get("enabled_locales") ?? "fr"),
  );

  // Prefer the CSV field; also accept individual locale_* toggles if present.
  const fromToggles = SUPPORTED_LOCALES.filter(
    (code) => formData.get(`locale_${code}`) === "1",
  );
  const locales =
    fromToggles.length > 0 ? resolveEnabledLocales(fromToggles) : enabledLocales;

  // Opening hours — stored as JSON if provided, otherwise leave unchanged
  const openingHoursRaw = String(formData.get("opening_hours") ?? "").trim();
  let openingHours: Record<string, unknown> | null | undefined = undefined; // undefined = don't update
  if (openingHoursRaw) {
    try {
      const parsed = JSON.parse(openingHoursRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        openingHours = parsed;
      }
    } catch {
      // malformed JSON — skip the field
    }
  }

  if (!name) {
    redirect("/dashboard/settings?error=name");
  }

  const { supabase, businessId } = await requireEditableBusinessId();
  const pro = await businessIsPro(supabase, businessId);

  const brandingFields = pro
    ? {
        brand_color: brandColor,
        brand_accent: brandAccent,
        public_theme: publicTheme,
        public_header_style: publicHeaderStyle,
        thank_you_title: thankYouTitle,
        thank_you_message: thankYouMessage,
        thank_you_button_label: thankYouButtonLabel,
        thank_you_button_url: thankYouButtonUrl,
        custom_domain: customDomain,
        pdf_show_logo: formFlag(formData.get("pdf_show_logo"), true),
        pdf_show_name: formFlag(formData.get("pdf_show_name"), true),
        pdf_show_contact: formFlag(formData.get("pdf_show_contact"), true),
        pdf_show_website: formFlag(formData.get("pdf_show_website"), false),
        pdf_show_phone: formFlag(formData.get("pdf_show_phone"), true),
        pdf_show_footer: formFlag(formData.get("pdf_show_footer"), true),
        email_from_name: emailFromName,
        email_subject_template: emailSubjectTemplate,
        email_signature: emailSignature,
        email_footer: emailFooter,
        email_show_logo: formFlag(formData.get("email_show_logo"), true),
      }
    : {};

  const { error } = await supabase
    .from("business")
    .update({
      name,
      tagline,
      contact_address: contactAddress,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      website_url: websiteUrl,
      public_show_logo: formFlag(formData.get("public_show_logo"), true),
      public_show_name: formFlag(formData.get("public_show_name"), true),
      public_show_tagline: formFlag(formData.get("public_show_tagline"), true),
      public_show_contact: formFlag(formData.get("public_show_contact"), true),
      enabled_locales: locales,
      // Only include opening_hours if it was actually submitted
      ...(openingHours !== undefined ? { opening_hours: openingHours as import("@/types/database.types").Json } : {}),
      ...brandingFields,
    })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard/settings?success=1");
}

/** Save the public URL of an uploaded logo to the owner's business. */
export async function updateLogo(logoUrl: string) {
  const safeLogoUrl = sanitizeLogoUrl(logoUrl);
  if (!safeLogoUrl) {
    redirect("/dashboard/settings?error=logo");
  }

  const { supabase, businessId } = await requireEditableBusinessId();
  if (!(await businessIsPro(supabase, businessId))) {
    redirect("/dashboard/settings?error=pro_required");
  }

  const { error } = await supabase
    .from("business")
    .update({ logo_url: safeLogoUrl })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

/** Remove the logo reference from the owner's business. */
export async function removeLogo() {
  const { supabase, businessId } = await requireEditableBusinessId();

  const { error } = await supabase
    .from("business")
    .update({ logo_url: null })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}
