export const TEMPLATE_STATUSES = [
  "open",
  "inactive",
  "expired",
  "archived",
] as const;

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const EXPIRATION_MODES = [
  "none",
  "relative_days",
  "absolute_date",
] as const;

export type ExpirationMode = (typeof EXPIRATION_MODES)[number];

export type TemplateLifecycle = {
  status: TemplateStatus;
  expiration_mode: ExpirationMode;
  expiration_days: number | null;
  expires_at: string | null;
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  open: "Ouverte",
  inactive: "Désactivée",
  expired: "Expirée",
  archived: "Archivée",
};

/** True when the public form may accept a new signature right now. */
export function acceptsSignatures(
  template: Pick<TemplateLifecycle, "status" | "expires_at">,
  now: Date = new Date(),
): boolean {
  if (template.status !== "open") return false;
  if (!template.expires_at) return true;
  return new Date(template.expires_at).getTime() > now.getTime();
}

/** Status to display, accounting for a past expires_at while still marked open. */
export function effectiveTemplateStatus(
  template: Pick<TemplateLifecycle, "status" | "expires_at">,
  now: Date = new Date(),
): TemplateStatus {
  if (
    template.status === "open" &&
    template.expires_at &&
    new Date(template.expires_at).getTime() <= now.getTime()
  ) {
    return "expired";
  }
  return template.status;
}

export function isTemplateStatus(value: unknown): value is TemplateStatus {
  return (
    typeof value === "string" &&
    (TEMPLATE_STATUSES as readonly string[]).includes(value)
  );
}

export function isExpirationMode(value: unknown): value is ExpirationMode {
  return (
    typeof value === "string" &&
    (EXPIRATION_MODES as readonly string[]).includes(value)
  );
}

/** Compute expires_at from mode settings. */
export function computeExpiresAt(input: {
  mode: ExpirationMode;
  days: number | null;
  absoluteDate: string | null; // YYYY-MM-DD
  from?: Date;
}): string | null {
  const from = input.from ?? new Date();
  if (input.mode === "none") return null;
  if (input.mode === "relative_days") {
    const days = input.days ?? 0;
    if (days < 1) return null;
    const d = new Date(from.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  }
  // absolute_date — end of the chosen calendar day (UTC)
  if (!input.absoluteDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.absoluteDate)) {
    return null;
  }
  return `${input.absoluteDate}T23:59:59.999Z`;
}

export function formatExpiresAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
