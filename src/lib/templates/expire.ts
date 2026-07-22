import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { recordAuditEvent } from "@/lib/audit";
import {
  acceptsSignatures,
  effectiveTemplateStatus,
  type TemplateLifecycle,
} from "./status";

type DbClient = SupabaseClient<Database>;

type ExpirableTemplate = TemplateLifecycle & {
  id: string;
  business_id: string;
  title?: string | null;
};

/**
 * If the template is past its expires_at while still `open`, persist `expired`
 * and audit the transition. Returns the effective status after the check.
 */
export async function ensureTemplateNotStale(
  client: DbClient,
  template: ExpirableTemplate,
): Promise<{
  status: ReturnType<typeof effectiveTemplateStatus>;
  acceptsSignatures: boolean;
}> {
  const effective = effectiveTemplateStatus(template);
  if (effective !== "expired" || template.status === "expired") {
    return {
      status: effective,
      acceptsSignatures: acceptsSignatures({
        ...template,
        status: effective === "expired" ? "expired" : template.status,
      }),
    };
  }

  const { error } = await client
    .from("waiver_template")
    .update({ status: "expired" })
    .eq("id", template.id)
    .eq("status", "open");

  if (error) {
    console.error("Failed to mark template expired:", error.message);
  } else {
    await recordAuditEvent(client, {
      businessId: template.business_id,
      actorKind: "system",
      entityType: "template",
      entityId: template.id,
      templateId: template.id,
      eventType: "template.expired",
      payload: {
        title: template.title ?? null,
        expires_at: template.expires_at,
      },
    });
  }

  return { status: "expired", acceptsSignatures: false };
}
