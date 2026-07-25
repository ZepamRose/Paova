import {
  AUDIT_EVENT_LABELS,
  type AuditEventType,
} from "./types";

export type ActivityEvent = {
  event_type: string;
  created_at: string;
  payload?: unknown;
};

export type TemplateActivityStats = {
  linkViews: number;
  lastLinkViewedAt: string | null;
  qrDownloads: number;
  lastQrDownloadAt: string | null;
  signaturesStarted: number;
  lastSignatureAt: string | null;
  pdfDownloads: number;
  lastUpdatedAt: string | null;
};

function isAuditEventType(value: string): value is AuditEventType {
  return value in AUDIT_EVENT_LABELS;
}

export function resolveAuditTitle(
  eventType: string,
  payload: unknown,
): string {
  const p =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  if (eventType === "template.updated") {
    if (
      "signature_hours_enabled" in p ||
      "signature_hours_start" in p ||
      "signature_timezone" in p
    ) {
      return "Horaires modifiés";
    }
    if ("expiration_mode" in p || "expires_at" in p || "expiration_days" in p) {
      return "Expiration modifiée";
    }
  }

  if (eventType === "pdf.generated") {
    if (p.channel === "email_confirmation") return "PDF envoyé";
    if (p.channel === "dashboard_download") return "PDF téléchargé";
  }

  if (isAuditEventType(eventType)) {
    return AUDIT_EVENT_LABELS[eventType];
  }
  return eventType;
}

export function resolveAuditDescription(
  eventType: string,
  actorKind: string,
  payload: unknown,
): string | null {
  const p =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const actor =
    actorKind === "owner"
      ? "Par vous"
      : actorKind === "signer"
        ? "Par un signataire"
        : "Automatique";

  const bits: string[] = [];

  if (eventType === "template.updated") {
    if ("signature_hours_enabled" in p) {
      const enabled = Boolean(p.signature_hours_enabled);
      bits.push(
        enabled
          ? "Horaires automatiques mis à jour"
          : "Horaires automatiques désactivés",
      );
    } else if ("expiration_mode" in p) {
      bits.push("Paramètres d'expiration enregistrés");
    } else if (typeof p.title === "string" && p.title) {
      bits.push(`« ${p.title} »`);
    }
  }

  if (eventType === "template.version_published") {
    if (typeof p.version === "number") {
      bits.push(`Version ${p.version} figée`);
    } else {
      bits.push("Contenu juridique versionné");
    }
  }

  if (eventType === "submission.signed") {
    if (typeof p.signer_name === "string" && p.signer_name) {
      bits.push(p.signer_name);
    }
    if (typeof p.reference === "string" && p.reference) {
      bits.push(`Réf. ${p.reference}`);
    }
  }

  if (eventType === "submission.started") {
    bits.push("Début de remplissage");
  }

  if (eventType === "template.qr_downloaded") {
    bits.push("Fichier PNG");
  }

  if (eventType === "pdf.generated" || eventType === "pdf.downloaded") {
    if (p.channel === "email_confirmation") {
      bits.push("Envoyé au signataire");
    } else if (
      p.channel === "dashboard_download" ||
      eventType === "pdf.downloaded"
    ) {
      bits.push("Depuis l'espace pro");
    }
    if (typeof p.signer_name === "string" && p.signer_name) {
      bits.push(p.signer_name);
    }
  }

  if (eventType === "export.csv_generated") {
    if (typeof p.row_count === "number") {
      bits.push(
        `${p.row_count} signature${p.row_count === 1 ? "" : "s"}`,
      );
    }
  }

  if (eventType === "export.zip_generated") {
    if (typeof p.pdf_count === "number") {
      bits.push(`${p.pdf_count} PDF`);
    }
  }

  if (eventType === "template.created") {
    bits.push("Première version disponible");
  }

  if (eventType === "template.activated") {
    bits.push("Le lien accepte à nouveau les signatures");
  }

  if (eventType === "template.deactivated") {
    bits.push("Le lien n'accepte plus de nouvelles signatures");
  }

  if (eventType === "template.archived") {
    bits.push("Retirée du tableau de bord");
  }

  if (eventType === "template.expired") {
    bits.push("Nouvelles signatures refusées");
  }

  if (eventType === "template.deleted") {
    bits.push("Suppression définitive");
  }

  if (bits.length === 0) {
    return actor;
  }
  return `${actor} · ${bits.join(" · ")}`;
}

export type TimelineCategory =
  | "signature"
  | "share"
  | "version"
  | "system";

export function resolveTimelineCategory(
  eventType: string,
  payload: unknown,
): TimelineCategory {
  const p =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  if (
    eventType === "submission.signed" ||
    eventType === "submission.started" ||
    eventType === "pdf.generated" ||
    eventType === "pdf.downloaded" ||
    eventType === "export.csv_generated" ||
    eventType === "export.zip_generated"
  ) {
    return "signature";
  }

  if (
    eventType === "template.link_viewed" ||
    eventType === "template.qr_downloaded"
  ) {
    return "share";
  }

  if (
    eventType === "template.version_published" ||
    (eventType === "template.updated" &&
      !("signature_hours_enabled" in p) &&
      !("expiration_mode" in p))
  ) {
    return "version";
  }

  return "system";
}

export function deriveTemplateActivity(
  events: ActivityEvent[],
): TemplateActivityStats {
  let linkViews = 0;
  let lastLinkViewedAt: string | null = null;
  let qrDownloads = 0;
  let lastQrDownloadAt: string | null = null;
  let signaturesStarted = 0;
  let lastSignatureAt: string | null = null;
  let pdfDownloads = 0;
  let lastUpdatedAt: string | null = null;

  for (const event of events) {
    switch (event.event_type) {
      case "template.link_viewed":
        linkViews += 1;
        if (!lastLinkViewedAt) lastLinkViewedAt = event.created_at;
        break;
      case "template.qr_downloaded":
        qrDownloads += 1;
        if (!lastQrDownloadAt) lastQrDownloadAt = event.created_at;
        break;
      case "submission.started":
        signaturesStarted += 1;
        break;
      case "submission.signed":
        if (!lastSignatureAt) lastSignatureAt = event.created_at;
        break;
      case "pdf.downloaded":
        pdfDownloads += 1;
        break;
      case "pdf.generated": {
        const p =
          event.payload && typeof event.payload === "object"
            ? (event.payload as Record<string, unknown>)
            : {};
        // Email sends only — dashboard downloads use pdf.downloaded.
        if (p.channel === "email_confirmation") pdfDownloads += 1;
        break;
      }
      case "template.updated":
      case "template.version_published":
      case "template.activated":
      case "template.deactivated":
        if (!lastUpdatedAt) lastUpdatedAt = event.created_at;
        break;
      default:
        break;
    }
  }

  return {
    linkViews,
    lastLinkViewedAt,
    qrDownloads,
    lastQrDownloadAt,
    signaturesStarted,
    lastSignatureAt,
    pdfDownloads,
    lastUpdatedAt,
  };
}

export function formatRelativeActivityFr(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
