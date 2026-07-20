"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import type { Json } from "@/types/database.types";

type WaiverField = {
  key: string;
  label: string;
  type: "text" | "date" | "checkbox";
  required: boolean;
};

export async function submitWaiver(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const signature = String(formData.get("signature") ?? "");
  const signerName = String(formData.get("signer_name") ?? "").trim();
  const signerEmail = String(formData.get("signer_email") ?? "").trim();

  if (!slug) {
    redirect("/");
  }

  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, business_id, fields, is_active")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!template || !template.is_active) {
    redirect("/");
  }

  // Enforce the free-plan monthly limit (based on the business owner's plan).
  const { data: business } = await supabase
    .from("business")
    .select("owner_id")
    .eq("id", template.business_id)
    .maybeSingle();

  if (business) {
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

      if ((count ?? 0) >= FREE_MONTHLY_LIMIT) {
        redirect(`/w/${slug}?error=limit`);
      }
    }
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  if (!signerName) {
    redirect(`/w/${slug}?error=required`);
  }

  if (!signature) {
    redirect(`/w/${slug}?error=signature`);
  }

  const answers: Record<string, string | boolean> = {};
  for (const field of fields) {
    const raw = formData.get(`field_${field.key}`);
    if (field.type === "checkbox") {
      const checked = raw === "on" || raw === "true";
      if (field.required && !checked) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = checked;
    } else {
      const value = String(raw ?? "").trim();
      if (field.required && !value) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = value;
    }
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  const { error } = await supabase.from("submission").insert({
    template_id: template.id,
    business_id: template.business_id,
    signer_name: signerName,
    signer_email: signerEmail || null,
    answers: answers as unknown as Json,
    signature_url: signature,
    ip_address: ip,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/w/${slug}/merci`);
}
