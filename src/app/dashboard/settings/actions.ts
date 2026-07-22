"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBrandFontId, DEFAULT_BRAND_FONT } from "@/lib/brand-fonts";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function updateBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brandColorRaw = String(formData.get("brand_color") ?? "").trim();
  const brandColor = HEX_COLOR.test(brandColorRaw) ? brandColorRaw : "#111827";
  const brandFontRaw = String(formData.get("brand_font") ?? "").trim();
  const brandFont = isBrandFontId(brandFontRaw)
    ? brandFontRaw
    : DEFAULT_BRAND_FONT;

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
    .update({ name, brand_color: brandColor, brand_font: brandFont })
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
