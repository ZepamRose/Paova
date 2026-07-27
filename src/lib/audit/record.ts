import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { logError } from "@/lib/observability/log";
import type { RecordAuditEventInput } from "./types";

type DbClient = SupabaseClient<Database>;

/**
 * Append one audit event. Best-effort: never throws to the caller’s main flow.
 * Failures are logged so signing / CRUD keep working if the journal is down.
 */
export async function recordAuditEvent(
  client: DbClient,
  input: RecordAuditEventInput,
): Promise<void> {
  try {
    const payload = (input.payload ?? {}) as Json;
    const { error } = await client.from("audit_event").insert({
      business_id: input.businessId,
      actor_user_id: input.actorUserId ?? null,
      actor_kind: input.actorKind,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      template_id: input.templateId ?? null,
      submission_id: input.submissionId ?? null,
      event_type: input.eventType,
      payload,
    });
    if (error) {
      logError("audit.insert_failed", error.message, {
        eventType: input.eventType,
        businessId: input.businessId,
      });
    }
  } catch (err) {
    logError("audit.insert_failed", err, {
      eventType: input.eventType,
      businessId: input.businessId,
    });
  }
}
