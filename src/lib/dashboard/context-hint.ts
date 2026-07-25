import {
  configFromTemplateRow,
  effectiveTemplateStatus,
  isTemplateStatus,
  isWithinSignatureHours,
} from "@/lib/templates";

export type WaiverHintSource = {
  status: string;
  expires_at: string | null;
  deleted_at: string | null;
  version?: number | null;
  signature_hours_enabled?: boolean | null;
  signature_timezone?: string | null;
  signature_hours_start?: string | null;
  signature_hours_end?: string | null;
  signature_hours_days?: number[] | null;
};

/** Permanent badge only (version). Status stays on StatusBadge. */
export function permanentVersionBadge(
  row: Pick<WaiverHintSource, "version">,
): string | null {
  const version = row.version ?? 1;
  return version >= 2 ? `Version ${version}` : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

/**
 * One contextual meta fragment (text, not badge).
 * Temporal / situational only — never duplicates permanent badges.
 */
export function pickWaiverMetaContext(
  row: WaiverHintSource,
  opts: {
    archivedView: boolean;
    lastSignedAt: string | null | undefined;
    outsideHours: boolean;
  },
): string | null {
  if (opts.archivedView) return null;

  if (row.expires_at) {
    const expires = new Date(row.expires_at).getTime();
    const msLeft = expires - Date.now();
    if (msLeft > 0 && msLeft <= 24 * 60 * 60 * 1000) {
      return "Expire demain";
    }
    if (msLeft > 0 && msLeft <= 7 * 24 * 60 * 60 * 1000) {
      const days = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
      return days === 1 ? "Expire demain" : `Expire dans ${days} j`;
    }
  }

  if (opts.outsideHours) {
    return "Hors horaires — lien fermé";
  }

  if (
    row.signature_hours_enabled &&
    isTemplateStatus(row.status) &&
    effectiveTemplateStatus({
      status: row.status,
      expires_at: row.expires_at,
    }) === "open"
  ) {
    const hoursConfig = configFromTemplateRow(row);
    if (hoursConfig.enabled && isWithinSignatureHours(hoursConfig)) {
      return "Horaires actifs";
    }
  }

  return null;
}

export function formatLastSignedMeta(
  lastSignedAt: string | null | undefined,
  opts: {
    ready: boolean;
    formatRelative: (iso: string) => string | null;
    formatShort: (iso: string) => string;
  },
): string {
  if (!lastSignedAt) return "Jamais signée";
  if (!opts.ready) {
    return `Dernière signature ${opts.formatShort(lastSignedAt)}`;
  }
  if (isSameDay(lastSignedAt, startOfToday())) {
    return "Dernière signature aujourd’hui";
  }
  const relative = opts.formatRelative(lastSignedAt);
  return relative
    ? `Dernière signature ${relative}`
    : `Dernière signature ${opts.formatShort(lastSignedAt)}`;
}
