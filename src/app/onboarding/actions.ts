"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/onboarding?error=name");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Invitees must not create a parallel "owner" space — claim first.
  const existing = await resolveBusinessContext(supabase, user.id, user);
  if (existing) {
    redirect("/dashboard");
  }

  const { error } = await supabase
    .from("business")
    .insert({ owner_id: user.id, name });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/onboarding/premiere-decharge");
}
