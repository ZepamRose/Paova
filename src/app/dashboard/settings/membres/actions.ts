"use server";

import { redirect } from "next/navigation";
import { requireActionCapability } from "@/lib/auth/session";
import { sendMemberInvite } from "@/lib/email";
import { buildMemberInviteLoginUrl } from "@/lib/auth/invite-link";
import { logError } from "@/lib/observability/log";

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

async function requireMembersCapability(
  businessId: string,
  capability: "invite_employees" | "manage_members" | "transfer_ownership",
) {
  try {
    return await requireActionCapability(capability, businessId);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }
}

export async function inviteMember(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");

  if (!businessId || !email || !isInvitableRole(role)) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const { supabase, user, membership: ctx } = await requireMembersCapability(
    businessId,
    "invite_employees",
  );

  // Admin can only bring in employees — never other admins.
  if (ctx.role === "admin" && role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
  }

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
    invited_by: user.id,
  });

  if (error) {
    const duplicate = error.code === "23505";
    redirect(`/dashboard/settings/membres?error=${duplicate ? "duplicate" : "insert"}`);
  }

  const emailSent = await sendMemberInvite({
    to: email,
    businessName: business?.name ?? null,
    role,
    loginUrl: buildMemberInviteLoginUrl(email),
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

  const { supabase, membership: ctx } = await requireMembersCapability(
    businessId,
    "manage_members",
  );

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

  const { supabase, membership: ctx } = await requireMembersCapability(
    businessId,
    "manage_members",
  );

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

  const { supabase, membership: ctx } = await requireMembersCapability(
    businessId,
    "manage_members",
  );

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

  const { supabase, membership: ctx } = await requireMembersCapability(
    businessId,
    "invite_employees",
  );

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

  // Same hierarchy as inviteMember: admins may only resend employee invites.
  if (ctx.role === "admin" && target.role !== "employee") {
    redirect(`/dashboard/settings/membres?error=forbidden`);
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
    loginUrl: buildMemberInviteLoginUrl(target.invited_email),
  });

  redirect(
    `/dashboard/settings/membres?success=${emailSent ? "resent" : "invited_no_email"}`,
  );
}

/**
 * Hand the owner seat to another active member (migration 0039).
 * App gate is transfer_ownership (owner only); RPC re-checks.
 */
export async function transferOwnership(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");

  if (!businessId || !memberId) {
    redirect(`/dashboard/settings/membres?error=invalid`);
  }

  const { supabase } = await requireMembersCapability(
    businessId,
    "transfer_ownership",
  );

  const { error } = await supabase.rpc("transfer_business_ownership", {
    p_business_id: businessId,
    p_new_owner_member_id: memberId,
  });

  if (error) {
    logError("member.transfer_ownership_failed", error.message, {
      businessId,
      memberId,
    });
    redirect(`/dashboard/settings/membres?error=transfer`);
  }

  redirect(`/dashboard/settings/membres?success=transferred`);
}
