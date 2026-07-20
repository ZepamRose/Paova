"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, shortId } from "@/lib/slug";
import type { Json } from "@/types/database.types";

type FieldType = "text" | "date" | "checkbox";

type WaiverField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
};

const ALLOWED_TYPES: FieldType[] = ["text", "date", "checkbox"];

export async function createTemplate(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const legalText = String(formData.get("legal_text") ?? "").trim();
  const fieldsRaw = String(formData.get("fields") ?? "[]");

  if (!title || !legalText) {
    redirect("/dashboard/waivers/new?error=required");
  }

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(fieldsRaw);
  } catch {
    parsed = [];
  }

  const fields: WaiverField[] = Array.isArray(parsed)
    ? parsed
        .map((f, i) => {
          const label = String((f as WaiverField)?.label ?? "").trim();
          const type = (f as WaiverField)?.type;
          return {
            key: slugify(label) || `field_${i}`,
            label,
            type: ALLOWED_TYPES.includes(type) ? type : "text",
            required: Boolean((f as WaiverField)?.required),
          };
        })
        .filter((f) => f.label.length > 0)
    : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    redirect("/onboarding");
  }

  const publicSlug = `${slugify(title) || "decharge"}-${shortId()}`;

  const { error } = await supabase.from("waiver_template").insert({
    business_id: business.id,
    title,
    legal_text: legalText,
    fields: fields as unknown as Json,
    public_slug: publicSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}
