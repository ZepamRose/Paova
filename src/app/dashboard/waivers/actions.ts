"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import { slugify, shortId } from "@/lib/slug";
import {
  insertTemplateVersion,
  templateContentChanged,
} from "@/lib/versions";
import {
  computeExpiresAt,
  effectiveTemplateStatus,
  isExpirationMode,
  isTemplateStatus,
  type ExpirationMode,
  type TemplateStatus,
} from "@/lib/templates";
import { getPresetById } from "@/lib/waiver-presets";
import type { Json } from "@/types/database.types";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "tel"
  | "date"
  | "checkbox"
  | "select"
  | "participants";

type WaiverField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

const ALLOWED_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "tel",
  "date",
  "checkbox",
  "select",
  "participants",
];

type IncomingField = Partial<WaiverField> & {
  key?: string;
  options?: unknown;
};

/** Parse and normalize the fields JSON, preserving existing keys when present. */
function normalizeFields(fieldsRaw: string): WaiverField[] {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(fieldsRaw);
  } catch {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((f, i) => {
      const field = f as IncomingField;
      const label = String(field?.label ?? "").trim();
      const type = field?.type;
      const existingKey = String(field?.key ?? "").trim();
      const normalizedType: FieldType =
        type && ALLOWED_TYPES.includes(type) ? type : "text";

      const base: WaiverField = {
        key: existingKey || slugify(label) || `field_${i}`,
        label,
        type: normalizedType,
        required: Boolean(field?.required),
      };

      if (normalizedType === "select") {
        const options = Array.isArray(field?.options)
          ? field.options
              .map((o) => String(o ?? "").trim())
              .filter((o) => o.length > 0)
          : [];
        base.options = options;
      }

      return base;
    })
    // A select with no options is unusable; drop labelless or empty selects.
    .filter(
      (f) =>
        f.label.length > 0 &&
        (f.type !== "select" || (f.options?.length ?? 0) > 0),
    );
}

export async function createTemplate(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const legalText = String(formData.get("legal_text") ?? "").trim();
  const fieldsRaw = String(formData.get("fields") ?? "[]");
  const signerNameLabel =
    String(formData.get("signer_name_label") ?? "").trim() || null;

  if (!title || !legalText) {
    redirect("/dashboard/waivers/new?error=required");
  }

  const fields = normalizeFields(fieldsRaw);

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

  const { data: created, error } = await supabase
    .from("waiver_template")
    .insert({
      business_id: business.id,
      title,
      legal_text: legalText,
      fields: fields as unknown as Json,
      signer_name_label: signerNameLabel,
      public_slug: publicSlug,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Création impossible");
  }

  const v1 = await insertTemplateVersion(supabase, {
    templateId: created.id,
    version: 1,
    content: {
      title,
      legal_text: legalText,
      fields: fields as unknown as Json,
      signer_name_label: signerNameLabel,
    },
    createdBy: user.id,
  });
  if (!v1) {
    throw new Error("Impossible d’enregistrer la version initiale");
  }

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: created.id,
    templateId: created.id,
    eventType: "template.created",
    payload: { title, version: 1 },
  });

  redirect(`/dashboard/waivers/${created.id}`);
}

/** One-click create from a built-in preset (used by guided onboarding). */
export async function createFromPreset(formData: FormData) {
  const presetId = String(formData.get("preset_id") ?? "").trim();
  const preset = getPresetById(presetId);
  if (!preset) {
    redirect("/onboarding/premiere-decharge?error=preset");
  }

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

  const fields = normalizeFields(JSON.stringify(preset.fields));
  const publicSlug = `${slugify(preset.title) || "decharge"}-${shortId()}`;

  const { data: created, error } = await supabase
    .from("waiver_template")
    .insert({
      business_id: business.id,
      title: preset.title,
      legal_text: preset.legalText,
      fields: fields as unknown as Json,
      signer_name_label: preset.signerNameLabel ?? null,
      public_slug: publicSlug,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Création impossible");
  }

  const v1 = await insertTemplateVersion(supabase, {
    templateId: created.id,
    version: 1,
    content: {
      title: preset.title,
      legal_text: preset.legalText,
      fields: fields as unknown as Json,
      signer_name_label: preset.signerNameLabel ?? null,
    },
    createdBy: user.id,
  });
  if (!v1) {
    throw new Error("Impossible d’enregistrer la version initiale");
  }

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: created.id,
    templateId: created.id,
    eventType: "template.created",
    payload: { title: preset.title, version: 1, preset_id: presetId },
  });

  redirect(`/dashboard/waivers/${created.id}?welcome=1`);
}

export async function updateTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const legalText = String(formData.get("legal_text") ?? "").trim();
  const fieldsRaw = String(formData.get("fields") ?? "[]");
  const signerNameLabel =
    String(formData.get("signer_name_label") ?? "").trim() || null;

  if (!id) {
    redirect("/dashboard");
  }
  if (!title || !legalText) {
    redirect(`/dashboard/waivers/${id}/edit?error=required`);
  }

  const fields = normalizeFields(fieldsRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS ("template_all_own") ensures only the owner's template can be updated.
  const { data: existing } = await supabase
    .from("waiver_template")
    .select("version, business_id, title, legal_text, fields, signer_name_label")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    redirect("/dashboard");
  }

  const nextContent = {
    title,
    legal_text: legalText,
    fields: fields as unknown as Json,
    signer_name_label: signerNameLabel,
  };

  const changed = templateContentChanged(
    {
      title: existing.title,
      legal_text: existing.legal_text,
      fields: existing.fields,
      signer_name_label: existing.signer_name_label,
    },
    nextContent,
  );

  // No meaningful change → no version bump, no audit noise.
  if (!changed) {
    redirect(`/dashboard/waivers/${id}`);
  }

  const nextVersion = (existing.version ?? 1) + 1;

  // Freeze the new version first so a failed history insert never leaves
  // the live template ahead of its archive.
  const published = await insertTemplateVersion(supabase, {
    templateId: id,
    version: nextVersion,
    content: nextContent,
    createdBy: user.id,
  });
  if (!published) {
    throw new Error("Impossible d’enregistrer la nouvelle version");
  }

  const { error } = await supabase
    .from("waiver_template")
    .update({
      title: nextContent.title,
      legal_text: nextContent.legal_text,
      fields: nextContent.fields,
      signer_name_label: nextContent.signer_name_label,
      version: nextVersion,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent(supabase, {
    businessId: existing.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType: "template.updated",
    payload: { title },
  });
  await recordAuditEvent(supabase, {
    businessId: existing.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType: "template.version_published",
    payload: { version: nextVersion, title },
  });

  redirect(`/dashboard/waivers/${id}`);
}

export async function deleteTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("waiver_template")
    .select("business_id, title, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    redirect("/dashboard");
  }

  // Already archived — treat as success.
  if (existing.deleted_at) {
    redirect("/dashboard");
  }

  const deletedAt = new Date().toISOString();

  // Soft-delete: archive the template. Submissions & proofs are retained.
  const { error } = await supabase
    .from("waiver_template")
    .update({
      status: "archived",
      deleted_at: deletedAt,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent(supabase, {
    businessId: existing.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType: "template.archived",
    payload: { title: existing.title, deleted_at: deletedAt },
  });

  redirect(`/dashboard/waivers/${id}`);
}

export async function toggleTemplateActive(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "status, deleted_at, business_id, title, expiration_mode, expiration_days, expires_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!template || !isTemplateStatus(template.status)) {
    redirect("/dashboard");
  }

  const current = effectiveTemplateStatus({
    status: template.status,
    expires_at: template.expires_at,
  });

  let nextStatus: TemplateStatus;
  const patch: {
    status: TemplateStatus;
    expires_at?: string | null;
    deleted_at?: string | null;
  } = { status: "open" };

  if (current === "open" && !template.deleted_at) {
    nextStatus = "inactive";
    patch.status = "inactive";
  } else {
    // inactive | expired | archived → reopen and clear soft-delete
    nextStatus = "open";
    patch.status = "open";
    patch.deleted_at = null;
  }

  const mode = isExpirationMode(template.expiration_mode)
    ? template.expiration_mode
    : "none";

  // When reopening with a relative window, restart the countdown from now.
  if (nextStatus === "open" && mode === "relative_days") {
    patch.expires_at = computeExpiresAt({
      mode: "relative_days",
      days: template.expiration_days,
      absoluteDate: null,
    });
  }

  const { error } = await supabase
    .from("waiver_template")
    .update(patch)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType:
      nextStatus === "open" ? "template.activated" : "template.deactivated",
    payload: { title: template.title, status: nextStatus },
  });

  redirect(`/dashboard/waivers/${id}`);
}

/** Update expiration settings for a template (does not change legal content). */
export async function updateTemplateExpiration(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const modeRaw = String(formData.get("expiration_mode") ?? "none");
  const daysRaw = String(formData.get("expiration_days") ?? "").trim();
  const absoluteRaw = String(formData.get("expires_on") ?? "").trim();

  if (!id) {
    redirect("/dashboard");
  }

  const mode: ExpirationMode = isExpirationMode(modeRaw) ? modeRaw : "none";
  const days =
    daysRaw !== "" && Number.isFinite(Number(daysRaw))
      ? Math.max(1, Math.min(3650, Math.floor(Number(daysRaw))))
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("business_id, title, status, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (!template || !isTemplateStatus(template.status)) {
    redirect("/dashboard");
  }

  const expiresAt = computeExpiresAt({
    mode,
    days,
    absoluteDate: mode === "absolute_date" ? absoluteRaw || null : null,
  });

  if (mode === "relative_days" && !days) {
    redirect(`/dashboard/waivers/${id}?tab=expiration&error=expiration`);
  }
  if (mode === "absolute_date" && !expiresAt) {
    redirect(`/dashboard/waivers/${id}?tab=expiration&error=expiration`);
  }

  let nextStatus = template.status as TemplateStatus;
  // If currently expired / past date and new expires_at is in the future (or none), reopen.
  if (
    mode === "none" ||
    (expiresAt && new Date(expiresAt).getTime() > Date.now())
  ) {
    if (template.status === "expired") {
      nextStatus = "open";
    }
  } else if (
    expiresAt &&
    new Date(expiresAt).getTime() <= Date.now() &&
    template.status === "open"
  ) {
    nextStatus = "expired";
  }

  const { error } = await supabase
    .from("waiver_template")
    .update({
      expiration_mode: mode,
      expiration_days: mode === "relative_days" ? days : null,
      expires_at: expiresAt,
      status: nextStatus,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType: "template.updated",
    payload: {
      title: template.title,
      expiration_mode: mode,
      expiration_days: mode === "relative_days" ? days : null,
      expires_at: expiresAt,
      status: nextStatus,
    },
  });

  if (nextStatus === "expired" && template.status !== "expired") {
    await recordAuditEvent(supabase, {
      businessId: template.business_id,
      actorUserId: user.id,
      actorKind: "owner",
      entityType: "template",
      entityId: id,
      templateId: id,
      eventType: "template.expired",
      payload: { title: template.title, expires_at: expiresAt },
    });
  }

  redirect(`/dashboard/waivers/${id}?tab=expiration`);
}
