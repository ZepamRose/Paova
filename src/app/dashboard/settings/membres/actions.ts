"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/permissions";
import { sendMemberInvite } from "@/lib/email";
import { buildMemberInviteLoginUrl } from "@/lib/auth/invite-link";

function isInvitableRole(value: string): value is "admin" | "employee" {
  return value === "admin" || value === "employee";
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function inviteMember(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");

  if (!businessId || !email || !isInvitableRole(role)) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const supabase = await createClient();
  let ctx;
  try {
    ctx = await requireCapability(supabase, businessId, "invite_employees");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

  // Admin can only bring in employees — never other admins.
  if (ctx.role === "admin" && role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("business")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();

  const { error } = await supabase.from("business_member").insert({
    business_id: businessId,
    invited_email: email,
    role,
    status: "invited",
    invited_by: user?.id ?? null,
  });

  if (error) {
    const duplicate = error.code === "23505";
    redirect(`/dashboard/settings/membres?error=${duplicate ? "duplicate" : "insert"}`);
  }

  // Await with timeout (inside sendEmail): on serverless, fire-and-forget after
  // redirect is dropped when the response finishes — invite row without email.
  const emailSent = await sendMemberInvite({
    to: email,
    businessName: business?.name ?? null,
    role,
    loginUrl: await buildMemberInviteLoginUrl(email),
  });

  redirect(
    `/dashboard/settings/membres?success=${emailSent ? "invited" : "invited_no_email"}`,
  );
}

export async function removeMember(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!businessId || !memberId) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const supabase = await createClient();
  const ctx = await requireCapability(supabase, businessId, "manage_members");

  const { data: target } = await supabase
    .from("business_member")
    .select("role")
    .eq("id", memberId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!target) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }
  if (target.role === "owner") {
    redirect(`/dashboard/settings/membres?error=owner`);
  }
  // Admins manage collaborators only — not other admins.
  if (ctx.role === "admin" && target.role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

  const { error } = await supabase
    .from("business_member")
    .delete()
    .eq("id", memberId)
    .eq("business_id", businessId);

  if (error) {
    redirect(`/dashboard/settings/membres?error=delete`);
  }

  redirect(`/dashboard/settings/membres?success=removed`);
}

export async function changeMemberRole(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!businessId || !memberId || !isInvitableRole(role)) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const supabase = await createClient();
  const ctx = await requireCapability(supabase, businessId, "manage_members");

  // Only the owner can assign or keep the admin role.
  if (ctx.role === "admin" && role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

  const { data: target } = await supabase
    .from("business_member")
    .select("role")
    .eq("id", memberId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!target) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }
  if (target.role === "owner") {
    redirect(`/dashboard/settings/membres?error=owner`);
  }
  if (ctx.role === "admin" && target.role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

  const { error } = await supabase
    .from("business_member")
    .update({ role })
    .eq("id", memberId)
    .eq("business_id", businessId);

  if (error) {
    redirect(`/dashboard/settings/membres?error=update`);
  }

  redirect(`/dashboard/settings/membres?success=updated`);
}

export async function setMemberStatus(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (
    !businessId ||
    !memberId ||
    (status !== "active" && status !== "disabled")
  ) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const supabase = await createClient();
  const ctx = await requireCapability(supabase, businessId, "manage_members");

  const { data: target } = await supabase
    .from("business_member")
    .select("role, status")
    .eq("id", memberId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!target) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }
  if (target.role === "owner") {
    redirect(`/dashboard/settings/membres?error=owner`);
  }
  if (ctx.role === "admin" && target.role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }
  if (target.status === "invited") {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const { error } = await supabase
    .from("business_member")
    .update({ status })
    .eq("id", memberId)
    .eq("business_id", businessId);

  if (error) {
    redirect(`/dashboard/settings/membres?error=update`);
  }

  redirect(
    `/dashboard/settings/membres?success=${status === "disabled" ? "disabled" : "reactivated"}`,
  );
}

export async function resendInvite(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!businessId || !memberId) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const supabase = await createClient();
  await requireCapability(supabase, businessId, "invite_employees");

  const { data: target } = await supabase
    .from("business_member")
    .select("role, status, invited_email")
    .eq("id", memberId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (
    !target ||
    target.status !== "invited" ||
    !target.invited_email ||
    !isInvitableRole(target.role)
  ) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const { data: business } = await supabase
    .from("business")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();

  const emailSent = await sendMemberInvite({
    to: target.invited_email,
    businessName: business?.name ?? null,
    role: target.role,
    loginUrl: await buildMemberInviteLoginUrl(target.invited_email),
  });

  redirect(
    `/dashboard/settings/membres?success=${emailSent ? "resent" : "invited_no_email"}`,
  );
}
