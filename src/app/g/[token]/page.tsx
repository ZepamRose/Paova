import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  clientIpFrom,
  peekRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  acceptsGroupSignatures,
  ensureGroupAccepting,
  formatClosesAt,
} from "@/lib/groups/lifecycle";
import { detectRosterMode } from "@/lib/groups";
import {
  resolveSignerNameLabel,
  resolveTemplateIntent,
} from "@/lib/waiver-packs";
import { GroupSignFlow } from "./group-sign-flow";
import { ExpressSignFlow } from "./express-sign-flow";
import { GroupRepresentativeSignFlow } from "./group-representative-sign-flow";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export default async function PublicGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const supabase = createServiceRoleClient();

  // This page exposes the full roster — participant names and dates of birth,
  // often minors — to anyone holding the link. Two counters guard it:
  //
  //  1. Failed lookups per IP (tight). A real visitor opens one valid link, so
  //     repeated misses mean somebody is guessing tokens. Checked BEFORE the
  //     query so an enumerator stops costing database work.
  //  2. Views of a valid link per (IP, token) (generous). A venue kiosk or a
  //     shared Wi-Fi legitimately reloads the same link many times, so this
  //     only stops sustained scraping of one group.
  const visitorIp = clientIpFrom(await headers());

  const misses = await peekRateLimit(supabase, {
    bucket: "group_token_miss",
    identifier: visitorIp,
    windowSeconds: RATE_LIMITS.groupTokenMiss.windowSeconds,
  });
  if (misses >= RATE_LIMITS.groupTokenMiss.maxHits) {
    notFound();
  }

  const { data: group } = await supabase
    .from("signing_group")
    .select(
      "id, name, status, template_id, business_id, public_token, closes_at, kind, requires_signature, signature_mode, start_time, end_time, duration_minutes",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!group) {
    await checkRateLimit(supabase, {
      bucket: "group_token_miss",
      identifier: visitorIp,
      windowSeconds: RATE_LIMITS.groupTokenMiss.windowSeconds,
      maxHits: RATE_LIMITS.groupTokenMiss.maxHits,
    });
    notFound();
  }

  const withinViewLimit = await checkRateLimit(supabase, {
    bucket: `group_view:${group.id}`,
    identifier: visitorIp,
    windowSeconds: RATE_LIMITS.groupView.windowSeconds,
    maxHits: RATE_LIMITS.groupView.maxHits,
  });
  if (!withinViewLimit) {
    notFound();
  }

  await ensureGroupAccepting(supabase, group);
  const { data: freshGroup } = await supabase
    .from("signing_group")
    .select("status, closes_at")
    .eq("id", group.id)
    .maybeSingle();
  const status = freshGroup?.status ?? group.status;
  const closesAt = freshGroup?.closes_at ?? group.closes_at;
  const accepting = acceptsGroupSignatures({ status, closes_at: closesAt });
  const closesLabel = formatClosesAt(closesAt);
  const isExpress = group.kind === "express";
  const isStation = group.kind === "station";

  // Sessions without signatures cannot be accessed via QR code
  if (!group.requires_signature || !group.template_id) {
    notFound();
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, title, legal_text, fields, signer_name_label, public_slug, status, deleted_at, starter_pack_id",
    )
    .eq("id", group.template_id)
    .maybeSingle();

  if (!template || template.deleted_at) notFound();

  const { data: business } = await supabase
    .from("business")
    .select("name, brand_color, logo_url")
    .eq("id", group.business_id)
    .maybeSingle();

  // Express groups never need the roster on this page (walk-in creates members
  // at submit time). Roster mode only loads unsigned members, capped.
  const ROSTER_UNSIGNED_LIMIT = 300;
  let unsigned: {
    id: string;
    full_name: string;
    dob: string | null;
    note: string | null;
  }[] = [];
  let rosterTruncated = false;

  if (!isExpress && !isStation) {
    const { count: unsignedCount } = await supabase
      .from("signing_group_member")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .is("signed_submission_id", null);

    const { data: members } = await supabase
      .from("signing_group_member")
      .select("id, full_name, dob, note")
      .eq("group_id", group.id)
      .is("signed_submission_id", null)
      .order("full_name", { ascending: true })
      .limit(ROSTER_UNSIGNED_LIMIT);

    unsigned = members ?? [];
    rosterTruncated = (unsignedCount ?? 0) > ROSTER_UNSIGNED_LIMIT;
  }

  const fields = (
    Array.isArray(template.fields) ? template.fields : []
  ) as unknown as WaiverField[];

  // For representative mode: check if already signed (server-side gate)
  let repAlreadySigned: {
    signer_name: string;
    signed_at: string | null;
    representative_role: string | null;
  } | null = null;
  if (group.signature_mode === "group_representative") {
    const { data: existingRep } = await supabase
      .from("submission")
      .select("signer_name, signed_at, representative_role")
      .eq("represented_group_id", group.id)
      .eq("signature_type", "group_representative")
      .maybeSingle();
    repAlreadySigned = existingRep ?? null;
  }

  const intent = resolveTemplateIntent({
    starterPackId: template.starter_pack_id,
    fields,
    signerNameLabel: template.signer_name_label,
  });
  const isLegalRep = intent.signerRole === "legal_representative";
  const signerNameLabel = resolveSignerNameLabel({
    signerNameLabel: template.signer_name_label,
    intent,
  });

  const rosterMode = detectRosterMode(
    fields.map((f) => ({ label: f.label, type: f.type })),
  );
  const askDob = isLegalRep && rosterMode === "minors";
  const participantLabel =
    intent.subjects === "minors" ? "Nom de l’enfant" : "Nom du participant";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-8 sm:px-6">
      <header className="mb-6">
        {business?.name ? (
          <p className="text-[13px] font-medium text-[var(--color-muted)]">
            {business.name}
          </p>
        ) : null}
        <h1 className="mt-1 text-[1.4rem] font-semibold tracking-tight text-[var(--color-foreground)]">
          {group.name}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-muted)]">
          {template.title}
          {closesLabel ? ` · à signer avant le ${closesLabel}` : ""}
        </p>
      </header>

      {sp.error === "members" ||
      sp.error === "closed" ||
      sp.error === "required" ? (
        <p className="mb-4 rounded-xl border border-[color-mix(in_srgb,#b45309_35%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-surface))] px-4 py-3 text-[13px] text-[var(--color-foreground)]">
          {sp.error === "closed"
            ? "Ce groupe n’accepte plus de signatures."
            : sp.error === "required"
              ? isLegalRep
                ? "Indiquez le nom de l’enfant pour continuer."
                : "Indiquez votre nom pour continuer."
              : "Un ou plusieurs participants sélectionnés ont déjà signé. Actualisez et réessayez."}
        </p>
      ) : null}

      {!accepting ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-[14px] text-[var(--color-muted)]">
          {closesLabel && status === "closed"
            ? `Les signatures pour ce groupe sont closes depuis le ${closesLabel}.`
            : "Ce groupe n’accepte plus de signatures pour le moment."}
        </div>
      ) : group.signature_mode === "group_representative" && repAlreadySigned ? (
        // ── Déjà signé : afficher la confirmation, bloquer le formulaire ──
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[var(--color-surface)] p-6 shadow-[var(--elev-2)]">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4L19 7" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mb-1 text-[1.15rem] font-semibold tracking-tight text-[var(--color-foreground)]">
            Cette activité a déjà été signée
          </h2>
          <p className="mb-5 text-[13.5px] text-[var(--color-muted)]">
            La décharge a été signée pour l&apos;ensemble du groupe.
          </p>
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_50%,var(--color-surface))] px-4 py-3 text-[13.5px]">
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-muted)]/70">
              Signée par
            </p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {repAlreadySigned.signer_name}
            </p>
            {repAlreadySigned.representative_role ? (
              <p className="text-[12.5px] text-[var(--color-muted)]">
                {repAlreadySigned.representative_role}
              </p>
            ) : null}
            {repAlreadySigned.signed_at ? (
              <p className="mt-1.5 text-[12.5px] text-[var(--color-muted)]">
                {new Date(repAlreadySigned.signed_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Brussels",
                })}{" "}
                à{" "}
                {new Date(repAlreadySigned.signed_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Brussels",
                })}
              </p>
            ) : null}
          </div>
          <p className="mt-4 text-[12.5px] text-[var(--color-muted)]">
            Cette signature couvre l&apos;ensemble des participants du groupe.
          </p>
        </div>
      ) : group.signature_mode === "group_representative" ? (
        // Mode représentant : formulaire de signature
        <GroupRepresentativeSignFlow
          groupId={group.id}
          groupName={group.name}
          groupToken={group.public_token}
          templateId={group.template_id!}
          slug={template.public_slug}
          legalText={template.legal_text}
          brandColor={business?.brand_color || "#6b8f71"}
          participantCount={unsigned.length}
          startTime={group.start_time}
        />
      ) : isExpress || isStation ? (
        <ExpressSignFlow
          groupToken={group.public_token}
          groupId={group.id}
          slug={template.public_slug}
          legalText={template.legal_text}
          fields={fields}
          signerNameLabel={signerNameLabel}
          brandColor={business?.brand_color || "#6b8f71"}
          askDob={askDob}
          participantLabel={participantLabel}
          isLegalRep={isLegalRep}
        />
      ) : unsigned.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-[14px] text-[var(--color-muted)]">
          Tous les participants de ce groupe ont déjà signé. Merci !
        </div>
      ) : (
        <>
          {rosterTruncated ? (
            <p className="mb-4 rounded-xl border border-[color-mix(in_srgb,#b45309_35%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-surface))] px-4 py-3 text-[13px] text-[var(--color-foreground)]">
              La liste affiche les {ROSTER_UNSIGNED_LIMIT} premiers participants
              en attente. Contactez l’organisateur si votre nom n’apparaît pas.
            </p>
          ) : null}
          <GroupSignFlow
            groupToken={group.public_token}
            groupId={group.id}
            slug={template.public_slug}
            legalText={template.legal_text}
            fields={fields}
            signerNameLabel={signerNameLabel}
            brandColor={business?.brand_color || "#6b8f71"}
            isLegalRep={isLegalRep}
            members={unsigned.map((m) => ({
              id: m.id,
              full_name: m.full_name,
              dob: m.dob,
              note: m.note,
            }))}
          />
        </>
      )}
    </main>
  );
}
