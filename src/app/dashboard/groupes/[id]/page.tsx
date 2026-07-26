import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Share2, Users, Settings2, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { CopyLinkButton } from "@/app/dashboard/copy-link-button";
import { GroupIcon } from "@/components/groups/group-icon";
import {
  GroupProgressBar,
  GroupStatBadges,
} from "@/components/groups/group-progress";
import { detectRosterMode } from "@/lib/groups";
import {
  acceptsGroupSignatures,
  ensureGroupAccepting,
  formatClosesAt,
} from "@/lib/groups/lifecycle";
import { AddParticipantForm } from "../add-participant-form";
import { AddRosterForm } from "../add-roster-form";
import { QrPreview } from "../qr-preview";
import { PendingSubmitButton } from "../../pending-submit-button";
import { GroupSettingsForm } from "../group-settings-form";
import { MemberRow } from "../member-row";
import { RemindPendingButton } from "../remind-pending-button";
import { GroupExportButtons } from "../group-export-buttons";
import {
  archiveGroup,
  setGroupStatus,
  unarchiveGroup,
} from "../actions";

const motion = "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";

const card =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[var(--elev-2)] sm:p-5";

const cardFeatured =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_93%,var(--color-brand))] p-4 shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_8%,transparent)] sm:p-5";

const cardSoft =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_58%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-background))] p-3.5 sm:p-4";

const btnSecondary = `inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3.5 text-[13px] font-medium text-[var(--color-foreground)]/82 shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)]`;

const labelCaps =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]";

export default async function GroupeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; express?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) redirect("/onboarding");
  const canExport = hasCapability(membership.role, "export_data");
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: group } = await supabase
    .from("signing_group")
    .select(
      "id, name, public_token, status, template_id, created_at, closes_at, business_id, kind",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard/groupes");

  await ensureGroupAccepting(supabase, group);

  const { data: fresh } = await supabase
    .from("signing_group")
    .select("status, closes_at")
    .eq("id", group.id)
    .maybeSingle();
  const status = fresh?.status ?? group.status;
  const closesAt = fresh?.closes_at ?? group.closes_at;
  const accepting = acceptsGroupSignatures({ status, closes_at: closesAt });

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, title, fields")
    .eq("id", group.template_id)
    .maybeSingle();

  const templateFields = (
    Array.isArray(template?.fields) ? template.fields : []
  ) as { label?: unknown; type?: unknown }[];
  const rosterMode = detectRosterMode(
    templateFields
      .map((f) => ({
        label: typeof f.label === "string" ? f.label : "",
        type: typeof f.type === "string" ? f.type : "",
      }))
      .filter((f) => f.label),
  );

  const { data: members } = await supabase
    .from("signing_group_member")
    .select(
      "id, full_name, dob, parent_email, note, signed_submission_id, signed_at, reminder_sent_at",
    )
    .eq("group_id", group.id)
    .order("full_name", { ascending: true });

  const list = members ?? [];
  const signed = list.filter((m) => m.signed_submission_id).length;
  const total = list.length;
  const pending = Math.max(0, total - signed);
  const signedMembers = list.filter((m) => m.signed_submission_id);
  const waitingMembers = list.filter((m) => !m.signed_submission_id);
  const pendingWithEmail = waitingMembers.filter((m) =>
    Boolean(m.parent_email?.includes("@")),
  ).length;
  const closesLabel = formatClosesAt(closesAt);
  const isExpress = group.kind === "express";

  const publicUrl = `${env.appUrl}/g/${group.public_token}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  const statusLabel =
    status === "archived"
      ? "Archivé"
      : accepting
        ? "Ouvert"
        : "Fermé";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-5 py-8 sm:gap-5 sm:px-6 sm:py-9">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard/groupes"
          className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-0.5"
          >
            ←
          </span>
          Groupes
        </Link>

        {sp.express ? (
          <p
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-3.5 py-2 text-[13px]"
          >
            Groupe express prêt — affichez le QR à l&apos;accueil.
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface-2))] text-[var(--color-brand)]">
                {isExpress ? (
                  <Zap size={16} strokeWidth={1.9} aria-hidden />
                ) : (
                  <GroupIcon size={16} />
                )}
              </span>
              <h1 className="text-[1.4rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.5rem]">
                {group.name}
              </h1>
              {isExpress ? (
                <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                  Express
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
              {template ? (
                <Link
                  href={`/dashboard/waivers/${template.id}`}
                  className="font-medium text-[var(--color-foreground)]/80 underline-offset-2 hover:text-[var(--color-brand)] hover:underline"
                >
                  {template.title}
                </Link>
              ) : (
                "Décharge"
              )}
              <span className="mx-1.5 text-[var(--color-muted)]/40">·</span>
              {statusLabel}
              {closesLabel ? (
                <>
                  <span className="mx-1.5 text-[var(--color-muted)]/40">·</span>
                  Clôture {closesLabel}
                </>
              ) : null}
            </p>
            <GroupStatBadges
              className="mt-2.5"
              total={total}
              signed={signed}
              status={status}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {status === "archived" ? (
              <form action={unarchiveGroup}>
                <input type="hidden" name="group_id" value={group.id} />
                <PendingSubmitButton
                  className={btnSecondary}
                  idle="Désarchiver"
                  pendingLabel="Désarchivage…"
                />
              </form>
            ) : (
              <>
                <form action={setGroupStatus}>
                  <input type="hidden" name="group_id" value={group.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={accepting ? "closed" : "open"}
                  />
                  <PendingSubmitButton
                    className={btnSecondary}
                    idle={accepting ? "Fermer" : "Rouvrir"}
                    pendingLabel={accepting ? "Fermeture…" : "Réouverture…"}
                  />
                </form>
                <form action={archiveGroup}>
                  <input type="hidden" name="group_id" value={group.id} />
                  <PendingSubmitButton
                    className="px-1 text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-70"
                    idle="Archiver"
                    pendingLabel="…"
                  />
                </form>
              </>
            )}
          </div>
        </div>

        {sp.saved ? (
          <p
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-3.5 py-2 text-[13px]"
          >
            Paramètres enregistrés.
          </p>
        ) : null}

        <GroupProgressBar signed={signed} total={total} />
      </header>

      {/* Partage — primary surface */}
      <section className={cardFeatured} id="lien">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)]">
            <Share2 size={14} strokeWidth={1.85} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Partage
            </h2>
            <p className="text-[12.5px] text-[var(--color-muted)]">
              {isExpress
                ? "Affichez le QR — chacun entre son nom et signe."
                : "Lien ou QR pour faire signer sur place."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={labelCaps}>Lien public</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className={`min-w-0 flex-1 truncate rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_72%,var(--color-surface-2))] px-3.5 py-2.5 font-mono text-[13px] text-[var(--color-brand)] shadow-[var(--elev-1)] transition-[border-color,background-color,box-shadow] ${motion} hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
              >
                {publicUrl}
              </a>
              <CopyLinkButton url={publicUrl} />
            </div>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-5">
            <div className="flex w-full flex-col gap-2 justify-self-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] p-3 sm:justify-self-start">
              <span className={labelCaps}>QR code</span>
              <QrPreview
                dataUrl={qrDataUrl}
                filename={`groupe-${group.public_token}.png`}
                downloadClassName={`${btnSecondary} h-9 w-full justify-center text-[13px]`}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-3 pt-0.5">
              <div>
                <p className={`${labelCaps} mb-1.5`}>
                  {isExpress ? "En direct" : "Relances"}
                </p>
                <p className="text-[13px] leading-snug text-[var(--color-muted)]">
                  {isExpress
                    ? total === 0
                      ? "En attente des premières signatures…"
                      : `${signed} signé${signed > 1 ? "s" : ""} · actualisation auto`
                    : pending === 0
                      ? "Tous les participants ont signé."
                      : `${pending} en attente${pendingWithEmail > 0 ? ` · ${pendingWithEmail} avec e-mail` : ""}.`}
                </p>
                {!isExpress && accepting ? (
                  <RemindPendingButton
                    groupId={group.id}
                    pendingWithEmail={pendingWithEmail}
                    className={`${btnSecondary} h-9`}
                  />
                ) : null}
                {!isExpress && !accepting ? (
                  <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">
                    Groupe fermé — relances désactivées.
                  </p>
                ) : null}
              </div>
              {template ? (
                <Link
                  href={`/dashboard/waivers/${template.id}`}
                  className="text-[13px] font-medium text-[var(--color-brand)] underline-offset-2 hover:underline"
                >
                  Voir les signatures de la décharge →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Participants — main work surface */}
      <section className={card} id="participants">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-foreground)]/70">
              <Users size={14} strokeWidth={1.85} aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                Participants
              </h2>
              <p className="text-[12.5px] text-[var(--color-muted)]">
                {isExpress
                  ? total === 0
                    ? "Les noms apparaissent ici au fur et à mesure des signatures."
                    : `${signed} signature${signed > 1 ? "s" : ""} collectée${signed > 1 ? "s" : ""}`
                  : total === 0
                    ? "Ajoutez des noms pour démarrer le suivi."
                    : `${pending} en attente · ${signed} signé${signed > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        {!isExpress ? (
          <div className="mt-3.5">
            <AddParticipantForm groupId={group.id} />
          </div>
        ) : null}

        {waitingMembers.length === 0 && signedMembers.length === 0 ? (
          <p className="mt-3.5 text-[13px] text-[var(--color-muted)]">
            {isExpress
              ? "Personne n’a encore signé — le QR est prêt."
              : "Aucun participant pour le moment."}
          </p>
        ) : (
          <ul className="mt-3.5 divide-y divide-[color-mix(in_srgb,var(--color-border)_60%,transparent)] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)]">
            {[...(isExpress ? signedMembers : waitingMembers), ...(isExpress ? waitingMembers : signedMembers)].map(
              (m) => (
                <MemberRow
                  key={m.id}
                  groupId={group.id}
                  member={m}
                  canRemind={!isExpress && accepting}
                />
              ),
            )}
          </ul>
        )}

        {!isExpress ? (
          <details className="group mt-3.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_40%,var(--color-surface))]">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                  Import CSV
                </span>
                <span className="text-[11px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-3.5 py-3">
              <p className="mb-2.5 text-[12.5px] text-[var(--color-muted)]">
                Ajoutez plusieurs participants d&apos;un coup.
              </p>
              <AddRosterForm groupId={group.id} mode={rosterMode} />
            </div>
          </details>
        ) : null}
      </section>

      {/* Secondary tools — quieter, collapsed by default */}
      <section className={cardSoft} id="outils">
        <div className="flex flex-col gap-2.5">
          <details className="group rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)]">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Settings2
                    size={14}
                    strokeWidth={1.85}
                    className="text-[var(--color-muted)]"
                    aria-hidden
                  />
                  <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                    Paramètres
                  </span>
                  <span className="hidden text-[12px] text-[var(--color-muted)] sm:inline">
                    Nom · clôture
                  </span>
                </span>
                <span className="text-[11px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] px-3.5 pb-3.5 pt-1">
              <GroupSettingsForm
                groupId={group.id}
                name={group.name}
                closesAt={closesAt}
                disabled={status === "archived"}
              />
            </div>
          </details>

          {canExport ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] px-3.5 py-3">
              <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                Export
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                Liste CSV ou preuves PDF des signatures.
              </p>
              <GroupExportButtons
                groupId={group.id}
                signedCount={signed}
                className={btnSecondary}
                compact
              />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
