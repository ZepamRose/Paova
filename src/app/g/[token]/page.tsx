import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
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

  const { data: group } = await supabase
    .from("signing_group")
    .select(
      "id, name, status, template_id, business_id, public_token, closes_at, kind",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!group) notFound();

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

  const { data: members } = await supabase
    .from("signing_group_member")
    .select("id, full_name, dob, note, signed_submission_id")
    .eq("group_id", group.id)
    .order("full_name", { ascending: true });

  const fields = (
    Array.isArray(template.fields) ? template.fields : []
  ) as unknown as WaiverField[];

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

  const unsigned = (members ?? []).filter((m) => !m.signed_submission_id);

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
      ) : isExpress ? (
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
      )}
    </main>
  );
}
