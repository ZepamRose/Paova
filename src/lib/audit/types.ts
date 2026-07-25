import type { Json } from "@/types/database.types";

/** Controlled catalogue of auditable events (Phase 1). */
export type AuditEventType =
  | "template.created"
  | "template.updated"
  | "template.version_published"
  | "template.activated"
  | "template.deactivated"
  | "template.expired"
  | "template.deleted"
  | "template.archived"
  | "template.link_viewed"
  | "template.qr_downloaded"
  | "submission.started"
  | "submission.signed"
  | "pdf.generated"
  | "pdf.downloaded"
  | "export.csv_generated"
  | "export.zip_generated";

export type AuditActorKind = "owner" | "signer" | "system";

export type AuditEntityType = "template" | "submission" | "proof" | "export";

export type RecordAuditEventInput = {
  businessId: string;
  actorUserId?: string | null;
  actorKind: AuditActorKind;
  entityType: AuditEntityType;
  entityId?: string | null;
  templateId?: string | null;
  submissionId?: string | null;
  eventType: AuditEventType;
  payload?: Record<string, Json | undefined>;
};

export type AuditEventRow = {
  id: string;
  business_id: string;
  actor_user_id: string | null;
  actor_kind: AuditActorKind;
  entity_type: AuditEntityType;
  entity_id: string | null;
  template_id: string | null;
  submission_id: string | null;
  event_type: AuditEventType;
  payload: Json;
  created_at: string;
};

/**
 * French labels for the timeline UI.
 * Pattern: [Sujet] + [verbe au passé] — même logique partout.
 */
export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  "template.created": "Décharge créée",
  "template.updated": "Décharge modifiée",
  "template.version_published": "Version publiée",
  "template.activated": "Décharge activée",
  "template.deactivated": "Décharge désactivée",
  "template.expired": "Décharge expirée",
  "template.deleted": "Décharge supprimée",
  "template.archived": "Décharge archivée",
  "template.link_viewed": "Lien consulté",
  "template.qr_downloaded": "QR téléchargé",
  "submission.started": "Formulaire ouvert",
  "submission.signed": "Signature validée",
  "pdf.generated": "PDF envoyé",
  "pdf.downloaded": "PDF téléchargé",
  "export.csv_generated": "Signatures exportées",
  "export.zip_generated": "PDF du groupe exportés",
};

/** High-signal events for the story timeline (visits/starts stay in KPIs). */
export const TIMELINE_STORY_EVENTS = new Set<AuditEventType>([
  "template.created",
  "template.updated",
  "template.version_published",
  "template.activated",
  "template.deactivated",
  "template.expired",
  "template.deleted",
  "template.archived",
  "template.qr_downloaded",
  "submission.signed",
  "pdf.generated",
  "pdf.downloaded",
  "export.csv_generated",
  "export.zip_generated",
]);

export function isTimelineStoryEvent(eventType: string): boolean {
  return TIMELINE_STORY_EVENTS.has(eventType as AuditEventType);
}
