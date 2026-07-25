"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clampText,
  formFlag,
  normalizeHexColor,
  resolveEnabledLocales,
  resolvePublicHeaderStyle,
  resolvePublicTheme,
  sanitizeCustomDomain,
  sanitizeHttpUrl,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/branding";

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

  if (!name) {
    redirect("/dashboard/settings?error=name");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("business")
    .update({
      name,
      brand_color: brandColor,
      brand_accent: brandAccent,
      public_theme: publicTheme,
      tagline,
      contact_address: contactAddress,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      website_url: websiteUrl,
      thank_you_title: thankYouTitle,
      thank_you_message: thankYouMessage,
      thank_you_button_label: thankYouButtonLabel,
      thank_you_button_url: thankYouButtonUrl,
      custom_domain: customDomain,
      public_header_style: publicHeaderStyle,
      public_show_logo: formFlag(formData.get("public_show_logo"), true),
      public_show_name: formFlag(formData.get("public_show_name"), true),
      public_show_tagline: formFlag(formData.get("public_show_tagline"), true),
      public_show_contact: formFlag(formData.get("public_show_contact"), true),
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
      enabled_locales: locales,
    })
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard/settings?success=1");
}

/** Save the public URL of an uploaded logo to the owner's business. */
export async function updateLogo(logoUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("business")
    .update({ logo_url: logoUrl })
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

/** Remove the logo reference from the owner's business. */
export async function removeLogo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("business")
    .update({ logo_url: null })
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}
