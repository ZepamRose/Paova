import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";
import { recordAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@/lib/audit";
import {
  configFromTemplateRow,
  ensureTemplateNotStale,
  isExpirationMode,
  isTemplateStatus,
  isWithinSignatureHours,
  type ExpirationMode,
} from "@/lib/templates";

const ALLOWED: AuditEventType[] = [
  "template.link_viewed",
  "submission.started",
];

/** Debounce window to avoid flooding the journal from reloads / bots. */
const DEBOUNCE_MS: Record<string, number> = {
  "template.link_viewed": 15 * 60 * 1000,
  "submission.started": 30 * 60 * 1000,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: { type?: string } = {};
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = body.type as AuditEventType | undefined;
  if (!eventType || !ALLOWED.includes(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Anonymous endpoint: cap before touching the database further.
  const beaconIp = clientIpFrom(await headers());
  const withinLimit = await checkRateLimit(supabase, {
    bucket: `public_event:${slug}`,
    identifier: beaconIp,
    windowSeconds: RATE_LIMITS.publicEvent.windowSeconds,
    maxHits: RATE_LIMITS.publicEvent.maxHits,
  });
  if (!withinLimit) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, status, expiration_mode, expiration_days, expires_at, deleted_at, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("public_slug", slug)
    .maybeSingle();

  if (
    !template ||
    !isTemplateStatus(template.status) ||
    template.deleted_at
  ) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const expirationMode: ExpirationMode = isExpirationMode(
    template.expiration_mode,
  )
    ? template.expiration_mode
    : "none";

  const lifecycle = await ensureTemplateNotStale(supabase, {
    id: template.id,
    business_id: template.business_id,
    title: template.title,
    status: template.status,
    expiration_mode: expirationMode,
    expiration_days: template.expiration_days,
    expires_at: template.expires_at,
  });
  if (!lifecycle.acceptsSignatures) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const hoursConfig = configFromTemplateRow(template);
  if (!isWithinSignatureHours(hoursConfig)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const ip = beaconIp;

  const since = new Date(
    Date.now() - (DEBOUNCE_MS[eventType] ?? 15 * 60 * 1000),
  ).toISOString();

  // Soft debounce: skip if the same event was already logged recently for this
  // template (optionally matching IP when available).
  const { data: recent } = await supabase
    .from("audit_event")
    .select("id, payload")
    .eq("template_id", template.id)
    .eq("event_type", eventType)
    .gte("created_at", since)
    .limit(20);
  if (recent && recent.length > 0) {
    if (!ip) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    const sameIp = recent.some((row) => {
      const payload = row.payload as { ip?: string } | null;
      return payload?.ip === ip;
    });
    if (sameIp) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorKind: "signer",
    entityType: eventType.startsWith("submission") ? "submission" : "template",
    entityId: template.id,
    templateId: template.id,
    eventType,
    payload: { ip, slug },
  });

  return NextResponse.json({ ok: true });
}
