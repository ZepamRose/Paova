"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  formatExpiresAt,
  isExpirationMode,
  isTemplateStatus,
  isValidTimezone,
  normalizeTimeInput,
  type ExpirationMode,
  type SignatureHoursConfig,
  type TemplateStatus,
} from "@/lib/templates";

export type UpdateSignatureHoursResult =
  | { ok: true; config: SignatureHoursConfig }
  | { ok: false; code: "invalid_hours" | "save_failed"; message: string };

export type UpdateExpirationResult =
  | {
      ok: true;
      mode: ExpirationMode;
      days: number | null;
      expiresAt: string | null;
      expiresLabel: string | null;
      isExpired: boolean;
    }
  | { ok: false; code: "invalid_expiration" | "save_failed"; message: string };
import { getPackById, resolveStarterPackId } from "@/lib/waiver-packs";
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
  const starterPackId = resolveStarterPackId(
    String(formData.get("starter_pack_id") ?? ""),
  );
  // Only ever hop back to a known internal flow (never an arbitrary
  // redirect target coming from client-controlled form data).
  const returnToRaw = String(formData.get("return_to") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/dashboard/groupes/new")
    ? returnToRaw
    : null;

  if (!title || !legalText) {
    redirect(
      `/dashboard/waivers/new?error=required${
        returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ""
      }`,
    );
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
      starter_pack_id: starterPackId,
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

  const pack = starterPackId ? getPackById(starterPackId) : undefined;

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: created.id,
    templateId: created.id,
    eventType: "template.created",
    payload: {
      title,
      version: 1,
      ...(pack
        ? { pack_id: pack.id, intent: pack.intent }
        : {}),
    },
  });

  if (returnTo) {
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${sep}template=${created.id}`);
  }

  redirect(`/dashboard/waivers/${created.id}`);
}

/** One-click create from a built-in pack (used by guided onboarding). */
export async function createFromPreset(formData: FormData) {
  const presetId = String(formData.get("preset_id") ?? "").trim();
  const preset = getPackById(presetId);
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
      starter_pack_id: preset.id,
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
    payload: {
      title: preset.title,
      version: 1,
      pack_id: preset.id,
      intent: preset.intent,
    },
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
    redirect("/dashboard?view=archived");
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

  redirect("/dashboard?view=archived");
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

  const returnTo = String(formData.get("return_to") ?? "");
  if (returnTo === "dashboard") {
    redirect("/dashboard");
  }
  redirect(`/dashboard/waivers/${id}`);
}

/** Update expiration settings for a template (does not change legal content). */
export async function updateTemplateExpiration(
  formData: FormData,
): Promise<UpdateExpirationResult> {
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
    return {
      ok: false,
      code: "invalid_expiration",
      message: "Indiquez un nombre de jours valide.",
    };
  }
  if (mode === "absolute_date" && !expiresAt) {
    return {
      ok: false,
      code: "invalid_expiration",
      message: "Choisissez une date d’expiration.",
    };
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
    return {
      ok: false,
      code: "save_failed",
      message: "Impossible d’enregistrer l’expiration. Réessayez.",
    };
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

  revalidatePath(`/dashboard/waivers/${id}`);
  revalidatePath("/dashboard");

  return {
    ok: true,
    mode,
    days: mode === "relative_days" ? days : null,
    expiresAt,
    expiresLabel: formatExpiresAt(expiresAt),
    isExpired: nextStatus === "expired",
  };
}

/** Update recurring signature opening hours (does not change status). */
export async function updateTemplateSignatureHours(
  formData: FormData,
): Promise<UpdateSignatureHoursResult> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "1";
  const timezoneRaw = String(formData.get("timezone") ?? "Europe/Paris").trim();
  const start = normalizeTimeInput(String(formData.get("start") ?? ""));
  const end = normalizeTimeInput(String(formData.get("end") ?? ""));
  const daysRaw = String(formData.get("days") ?? "");
  const days = daysRaw
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);

  if (!id) {
    redirect("/dashboard");
  }

  const timezone = isValidTimezone(timezoneRaw) ? timezoneRaw : "Europe/Paris";
  const uniqueDays = [...new Set(days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7])].sort(
    (a, b) => a - b,
  );

  if (enabled && (!start || !end)) {
    return {
      ok: false,
      code: "invalid_hours",
      message: "Indiquez une heure d’ouverture et de fermeture.",
    };
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
    .select("id, business_id, title")
    .eq("id", id)
    .maybeSingle();
  if (!template) {
    redirect("/dashboard");
  }

  const { error } = await supabase
    .from("waiver_template")
    .update({
      signature_hours_enabled: enabled,
      signature_timezone: timezone,
      signature_hours_start: enabled ? start : null,
      signature_hours_end: enabled ? end : null,
      signature_hours_days: uniqueDays,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      code: "save_failed",
      message: "Impossible d’enregistrer les horaires. Réessayez.",
    };
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
      signature_hours_enabled: enabled,
      signature_timezone: timezone,
      signature_hours_start: enabled ? start : null,
      signature_hours_end: enabled ? end : null,
      signature_hours_days: uniqueDays,
    },
  });

  const config: SignatureHoursConfig = {
    enabled,
    timezone,
    start: enabled ? (start ?? "09:00") : "09:00",
    end: enabled ? (end ?? "19:00") : "19:00",
    days: uniqueDays,
  };

  revalidatePath(`/dashboard/waivers/${id}`);
  revalidatePath("/dashboard");

  return { ok: true, config };
}

/** Best-effort audit when the owner downloads the QR PNG. */
export async function recordQrDownload(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, business_id, title, public_slug")
    .eq("id", id)
    .maybeSingle();
  if (!template) return;

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "template",
    entityId: id,
    templateId: id,
    eventType: "template.qr_downloaded",
    payload: { title: template.title, slug: template.public_slug },
  });

  revalidatePath(`/dashboard/waivers/${id}`);
}
