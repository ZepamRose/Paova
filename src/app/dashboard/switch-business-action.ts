"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { getBusinessContext } from "@/lib/auth/permissions";
import { setActiveBusinessId } from "@/lib/auth/active-business";

/** Switch the dashboard tenant (cookie) to another active seat. */
export async function switchActiveBusiness(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "").trim();
  if (!businessId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await resolveBusinessContext(supabase, user.id, user);
  const seat = await getBusinessContext(supabase, businessId, user.id);
  if (!seat) {
    redirect("/dashboard");
  }

  await setActiveBusinessId(businessId);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
