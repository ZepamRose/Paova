"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createGroupPublicToken,
  defaultExpressGroupName,
  parseRosterCsv,
} from "@/lib/groups";
import {
  ensureGroupAccepting,
  parseClosesOn,
  parseScheduledAt,
} from "@/lib/groups/lifecycle";
import { sendGroupReminder } from "@/lib/email";
import { env } from "@/lib/env";
import { logError } from "@/lib/observability/log";
// membership resolved via requireBusiness → session helpers

const REMINDER_COOLDOWN_MS = 30 * 60 * 1000;

async function requireBusiness(
  capability?: "create_groups" | "manage_groups",
) {
  const { requireActionCapability, getDashboardSession } = await import(
    "@/lib/auth/session"
  );
  const session = capability
    ? await requireActionCapability(capability)
    : await getDashboardSession();

  const { data: business } = await session.supabase
    .from("business")
    .select("id, name, brand_color, email_from_name")
    .eq("id", session.membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  return { supabase: session.supabase, business, membership: session.membership };
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value || !value.includes("@") || value.length > 160) return null;
  return value;
}

export async function createSigningGroup(formData: FormData) {
  const { supabase, business } = await requireBusiness("create_groups");
  const name = String(formData.get("name") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "").trim();
  const rosterRaw = String(formData.get("roster") ?? "");
  const closesAt = parseClosesOn(String(formData.get("closes_on") ?? ""));
  const scheduledAt = parseScheduledAt(
    String(formData.get("scheduled_at") ?? ""),
  );

  // V2: Parse session time fields
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const endTimeRaw = String(formData.get("end_time") ?? "").trim();
  const durationMinutesRaw = String(formData.get("duration_minutes") ?? "").trim();

  const startTime = startTimeRaw ? parseScheduledAt(startTimeRaw) : null;
  const endTime = endTimeRaw ? parseScheduledAt(endTimeRaw) : null;
  const durationMinutes = durationMinutesRaw ? parseInt(durationMinutesRaw, 10) : null;

  if (!name || !templateId) {
    redirect(
      `/dashboard/groupes/new?error=required${templateId ? `&template=${templateId}` : ""}`,
    );
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id")
    .eq("id", templateId)
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!template) {
    redirect(
      `/dashboard/groupes/new?error=template${templateId ? `&template=${templateId}` : ""}`,
    );
  }

  const members = parseRosterCsv(rosterRaw);
  const token = createGroupPublicToken();

  const { data: group, error } = await supabase
    .from("signing_group")
    .insert({
      business_id: business.id,
      template_id: templateId,
      name,
      public_token: token,
      status: "open",
      kind: "roster",
      scheduled_at: scheduledAt,
      closes_at: closesAt,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes && durationMinutes > 0 ? durationMinutes : null,
    })
    .select("id")
    .single();

  if (error || !group) {
    redirect(`/dashboard/groupes/new?error=create&template=${templateId}`);
  }

  if (members.length > 0) {
    const { error: memErr } = await supabase.from("signing_group_member").insert(
      members.map((m) => ({
        group_id: group.id,
        full_name: m.full_name,
        dob: m.dob || null,
        parent_email: m.parent_email || null,
        note: m.note || null,
      })),
    );
    if (memErr) {
      // Do not leave an empty "success" group — operators would share a dead QR.
      logError("group.members_insert_failed", memErr.message, {
        groupId: group.id,
        businessId: business.id,
      });
      await supabase.from("signing_group").delete().eq("id", group.id);
      redirect(
        `/dashboard/groupes/new?error=members&template=${templateId}`,
      );
    }
  }

  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/waivers/${templateId}`);
  redirect(`/dashboard/groupes/${group.id}`);
}

/**
 * Walk-in session: one décharge, no roster. Staff shares the QR immediately;
 * each arrival enters their name and signs.
 */
export async function createExpressGroup(formData: FormData) {
  const { supabase, business } = await requireBusiness("create_groups");
  const templateId = String(formData.get("template_id") ?? "").trim();
  const nameRaw = String(formData.get("name") ?? "").trim();
  const name = (nameRaw || defaultExpressGroupName()).slice(0, 120);
  const returnTo = String(formData.get("return_to") ?? "").trim();

  if (!templateId) {
    redirect("/dashboard/groupes/express?error=required");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, status")
    .eq("id", templateId)
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!template || template.status === "archived") {
    redirect(
      `/dashboard/groupes/express?error=template${templateId ? `&template=${templateId}` : ""}`,
    );
  }

  const token = createGroupPublicToken();
  const { data: group, error } = await supabase
    .from("signing_group")
    .insert({
      business_id: business.id,
      template_id: templateId,
      name,
      public_token: token,
      status: "open",
      kind: "express",
    })
    .select("id")
    .single();

  if (error || !group) {
    logError("group.express_create_failed", error?.message, {
      businessId: business.id,
      templateId,
    });
    redirect(
      `/dashboard/groupes/express?error=create&template=${templateId}`,
    );
  }

  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/waivers/${templateId}`);
  if (returnTo.startsWith("/dashboard/")) {
    redirect(`/dashboard/groupes/${group.id}?express=1`);
  }
  redirect(`/dashboard/groupes/${group.id}?express=1`);
}

export type AddMembersState = {
  error: "roster" | "add" | null;
  count?: number;
};

/**
 * Bound to `useActionState` on both add-participant forms. We used to signal
 * errors via a `?error=` query param + redirect, but that string persists in
 * the URL until the *next* navigation — so a stale error kept showing even
 * after a later, successful submission. Returning state instead ties the
 * message to that exact submission, and lets us also report a success count.
 */
export async function addGroupMembers(
  _prevState: AddMembersState,
  formData: FormData,
): Promise<AddMembersState> {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const rosterRaw = String(formData.get("roster") ?? "");
  const singleName = String(formData.get("full_name") ?? "").trim();

  const { data: group } = await supabase
    .from("signing_group")
    .select("id")
    .eq("id", groupId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!group) redirect("/dashboard/groupes");

  const fromCsv = parseRosterCsv(rosterRaw);
  const members =
    fromCsv.length > 0
      ? fromCsv
      : singleName
        ? [
            {
              full_name: singleName,
              dob: String(formData.get("dob") ?? "").trim() || null,
              parent_email: normalizeEmail(
                String(formData.get("parent_email") ?? ""),
              ),
              note: String(formData.get("note") ?? "").trim() || null,
            },
          ]
        : [];

  if (members.length === 0) {
    return { error: "roster" };
  }

  const { error } = await supabase.from("signing_group_member").insert(
    members.map((m) => ({
      group_id: groupId,
      full_name: m.full_name,
      dob: m.dob || null,
      parent_email: m.parent_email || null,
      note: m.note || null,
    })),
  );

  if (error) {
    return { error: "add" };
  }

  revalidatePath(`/dashboard/groupes/${groupId}`);
  return { error: null, count: members.length };
}

export async function updateGroupSettings(formData: FormData) {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const nextCloses = parseClosesOn(String(formData.get("closes_on") ?? ""));

  // V2: Parse session time fields
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const endTimeRaw = String(formData.get("end_time") ?? "").trim();
  const durationMinutesRaw = String(formData.get("duration_minutes") ?? "").trim();

  const startTime = startTimeRaw ? parseScheduledAt(startTimeRaw) : null;
  const endTime = endTimeRaw ? parseScheduledAt(endTimeRaw) : null;
  const durationMinutes = durationMinutesRaw ? parseInt(durationMinutesRaw, 10) : null;

  if (!groupId || !name) {
    redirect(`/dashboard/groupes/${groupId}?error=settings`);
  }

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, status")
    .eq("id", groupId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard/groupes");

  await supabase
    .from("signing_group")
    .update({
      name: name.slice(0, 120),
      closes_at: nextCloses,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes && durationMinutes > 0 ? durationMinutes : null,
    })
    .eq("id", groupId)
    .eq("business_id", business.id);

  // If a future deadline was set on a closed (non-archived) group, reopen.
  if (
    group.status === "closed" &&
    nextCloses &&
    new Date(nextCloses).getTime() > Date.now()
  ) {
    await supabase
      .from("signing_group")
      .update({ status: "open" })
      .eq("id", groupId)
      .eq("business_id", business.id);
  }

  revalidatePath(`/dashboard/groupes/${groupId}`);
  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");
  redirect(`/dashboard/groupes/${groupId}?saved=1`);
}

export type UpdateMemberState = {
  error: "required" | "save" | null;
  ok?: boolean;
};

export async function updateGroupMember(
  _prev: UpdateMemberState,
  formData: FormData,
): Promise<UpdateMemberState> {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const dob = String(formData.get("dob") ?? "").trim() || null;
  const parentEmail = normalizeEmail(String(formData.get("parent_email") ?? ""));
  const note = String(formData.get("note") ?? "").trim() || null;

  const { data: group } = await supabase
    .from("signing_group")
    .select("id")
    .eq("id", groupId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard/groupes");

  const { data: member } = await supabase
    .from("signing_group_member")
    .select("id, signed_submission_id")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!member) return { error: "save" };

  if (!fullName) return { error: "required" };

  // Signed members keep identity frozen; contact fields stay editable.
  const patch = member.signed_submission_id
    ? { parent_email: parentEmail, note }
    : {
        full_name: fullName.slice(0, 160),
        dob,
        parent_email: parentEmail,
        note,
      };

  const { error } = await supabase
    .from("signing_group_member")
    .update(patch)
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) return { error: "save" };

  revalidatePath(`/dashboard/groupes/${groupId}`);
  return { error: null, ok: true };
}

export type RemindState = {
  error: "closed" | "empty" | "send" | "cooldown" | null;
  sent?: number;
  skipped?: number;
};

export async function sendGroupReminders(
  _prev: RemindState,
  formData: FormData,
): Promise<RemindState> {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();
  const force = String(formData.get("force") ?? "") === "1";

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, business_id, name, status, closes_at, public_token, template_id")
    .eq("id", groupId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard/groupes");

  const accepting = await ensureGroupAccepting(supabase, group);
  if (!accepting) {
    return { error: "closed" };
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("title")
    .eq("id", group.template_id)
    .maybeSingle();

  let membersQuery = supabase
    .from("signing_group_member")
    .select("id, full_name, parent_email, reminder_sent_at, signed_submission_id")
    .eq("group_id", groupId)
    .is("signed_submission_id", null);

  if (memberId) {
    membersQuery = membersQuery.eq("id", memberId);
  }

  const { data: members } = await membersQuery;
  const withEmail = (members ?? []).filter((m) => normalizeEmail(m.parent_email));

  if (withEmail.length === 0) {
    return { error: "empty" };
  }

  const now = Date.now();
  const eligible = force
    ? withEmail
    : withEmail.filter((m) => {
        if (!m.reminder_sent_at) return true;
        return now - new Date(m.reminder_sent_at).getTime() >= REMINDER_COOLDOWN_MS;
      });

  if (eligible.length === 0) {
    return { error: "cooldown", skipped: withEmail.length };
  }

  // One email per parent address, listing all their pending children.
  const byEmail = new Map<string, typeof eligible>();
  for (const m of eligible) {
    const email = normalizeEmail(m.parent_email)!;
    const list = byEmail.get(email) ?? [];
    list.push(m);
    byEmail.set(email, list);
  }

  const signUrl = `${env.appUrl}/g/${group.public_token}`;
  let sent = 0;
  const sentMemberIds: string[] = [];

  for (const [to, list] of byEmail) {
    const ok = await sendGroupReminder({
      to,
      recipientNames: list.map((m) => m.full_name),
      businessName: business.name,
      groupName: group.name,
      waiverTitle: template?.title ?? "Décharge",
      signUrl,
      brandColor: business.brand_color || "#6b8f71",
      fromName: business.email_from_name || business.name,
    });
    if (ok) {
      sent += 1;
      sentMemberIds.push(...list.map((m) => m.id));
    }
  }

  if (sentMemberIds.length > 0) {
    const stamped = new Date().toISOString();
    await supabase
      .from("signing_group_member")
      .update({ reminder_sent_at: stamped })
      .in("id", sentMemberIds);
  }

  if (sent === 0) {
    return { error: "send" };
  }

  revalidatePath(`/dashboard/groupes/${groupId}`);
  return {
    error: null,
    sent,
    skipped: withEmail.length - eligible.length,
  };
}

export async function setGroupStatus(formData: FormData) {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (status !== "open" && status !== "closed") {
    redirect(`/dashboard/groupes/${groupId}`);
  }

  const patch: { status: string; closes_at?: string | null } = { status };

  // Reopening a group past its deadline would instantly auto-close again —
  // clear the deadline so "Rouvrir" actually sticks.
  if (status === "open") {
    const { data: current } = await supabase
      .from("signing_group")
      .select("closes_at")
      .eq("id", groupId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (
      current?.closes_at &&
      new Date(current.closes_at).getTime() <= Date.now()
    ) {
      patch.closes_at = null;
    }
  }

  await supabase
    .from("signing_group")
    .update(patch)
    .eq("id", groupId)
    .eq("business_id", business.id);

  revalidatePath(`/dashboard/groupes/${groupId}`);
  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");
}

/** Archive a group — hides it from active lists, keeps history/signatures intact. */
export async function archiveGroup(formData: FormData) {
  const { supabase, business } = await requireBusiness("manage_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();

  const { data: updated, error } = await supabase
    .from("signing_group")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("business_id", business.id)
    .select("id");

  if (error || !updated?.length) {
    redirect(`/dashboard/groupes?error=archive`);
  }

  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");
  redirect("/dashboard/groupes");
}

/** Restore an archived group back to "closed" so it reappears in the active list. */
export async function unarchiveGroup(formData: FormData) {
  const { supabase, business } = await requireBusiness("manage_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();

  await supabase
    .from("signing_group")
    .update({ status: "closed", archived_at: null })
    .eq("id", groupId)
    .eq("business_id", business.id);

  revalidatePath(`/dashboard/groupes/${groupId}`);
  revalidatePath("/dashboard/groupes");
  revalidatePath("/dashboard");

  if (returnTo === "dashboard") redirect("/dashboard");
  if (returnTo === "groupes") redirect("/dashboard/groupes");
}

export async function deleteGroupMember(formData: FormData) {
  const { supabase, business } = await requireBusiness("create_groups");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const memberId = String(formData.get("member_id") ?? "").trim();

  const { data: group } = await supabase
    .from("signing_group")
    .select("id")
    .eq("id", groupId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard/groupes");

  await supabase
    .from("signing_group_member")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId)
    .is("signed_submission_id", null);

  revalidatePath(`/dashboard/groupes/${groupId}`);
}
