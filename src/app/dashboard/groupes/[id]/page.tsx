import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership, resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { CopyLinkButton } from "@/app/dashboard/copy-link-button";
import { GroupProgressBar } from "@/components/groups/group-progress";
import { detectRosterMode } from "@/lib/groups";
import {
  acceptsGroupSignatures,
  ensureGroupAccepting,
  parseOpeningHours,
} from "@/lib/groups/lifecycle";
import {
  computeSessionPhase,
  formatTimeRange,
} from "@/lib/session-time";
import { AddParticipantForm } from "../add-participant-form";
import { AddRosterForm } from "../add-roster-form";
import { SessionQrOverlay } from "../session-qr-overlay";
import { SessionStatusBadge } from "../session-status-badge";
import { PendingSubmitButton } from "../../pending-submit-button";
import { MemberRow } from "../member-row";
import { GroupExportButtons } from "../group-export-buttons";
import { LiveRefresh } from "../live-refresh";
import { EditSessionButton } from "./edit-session-button";
import { StationDetailView } from "../station-detail-view";
import {
  archiveGroup,
  setGroupStatus,
  unarchiveGroup,
} from "../actions";

// ─── Design tokens ───────────────────────────────────────────────────────────

const motion = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const btnSecondary = `inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3 text-[12.5px] font-semibold text-[var(--color-foreground)]/80 shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)]`;

const sectionLabel = "text-[10.5px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/80";

const card = "rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-4 shadow-[var(--elev-1)]";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "Aujourd'hui", "Demain", "Hier", ou date longue fr */
function sessionDateLabel(date: Date): string {
  const now = new Date();
  const d = (d: Date) => d.toDateString();
  if (d(date) === d(now)) return "Aujourd'hui";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d(date) === d(tomorrow)) return "Demain";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d(date) === d(yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

/** "14:03" */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });
}

export default async function SessionDetailPage({
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

  await resolveBusinessContext(supabase, user.id, user);
  const membership = await getActiveMembership(supabase, user.id);
  if (!membership) redirect("/onboarding");
  const canExport = hasCapability(membership.role, "export_data");
  const canManageGroups = hasCapability(membership.role, "manage_groups");

  const { data: business } = await supabase
    .from("business")
    .select("id, opening_hours")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: group } = await supabase
    .from("signing_group")
    .select(
      "id, name, public_token, status, template_id, created_at, closes_at, business_id, kind, start_time, end_time, duration_minutes, requires_signature, closing_mode, signature_mode",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard");

  await ensureGroupAccepting(supabase, group);

  const { data: fresh } = await supabase
    .from("signing_group")
    .select("status, closes_at, start_time, end_time, duration_minutes, requires_signature, closing_mode")
    .eq("id", group.id)
    .maybeSingle();

  const status = fresh?.status ?? group.status;
  const closesAt = fresh?.closes_at ?? group.closes_at;
  const startTime = fresh?.start_time ?? group.start_time;
  const endTime = fresh?.end_time ?? group.end_time;
  const durationMinutes = fresh?.duration_minutes ?? group.duration_minutes;
  const requiresSignature = fresh?.requires_signature ?? group.requires_signature;
  const closingMode = (fresh?.closing_mode ?? group.closing_mode ?? "manual") as import("@/lib/groups/lifecycle").ClosingMode;
  const accepting = acceptsGroupSignatures({ status, closes_at: closesAt });
  const signatureMode = group.signature_mode ?? "individual";

  // For representative mode: look up the representative submission
  const isRepMode = signatureMode === "group_representative";
  const { data: repSubmission } = isRepMode
    ? await supabase
        .from("submission")
        .select("id, signer_name, signed_at, representative_role")
        .eq("represented_group_id", group.id)
        .eq("signature_type", "group_representative")
        .maybeSingle()
    : { data: null };

  // Fetch template only if session requires signatures
  const { data: template } = group.template_id
    ? await supabase
        .from("waiver_template")
        .select("id, title, fields")
        .eq("id", group.template_id)
        .maybeSingle()
    : { data: null };

  // Fetch all templates for the edit modal
  const { data: allTemplates } = await supabase
    .from("waiver_template")
    .select("id, title")
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .order("title", { ascending: true });

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
  const waitingMembers = list.filter((m) => !m.signed_submission_id);
  const isExpress = group.kind === "express";
  const isStation = group.kind === "station";

  const publicUrl = `${env.appUrl}/g/${group.public_token}`;

  // Generate QR code only if signatures are required
  const qrDataUrl = requiresSignature ? await QRCode.toDataURL(publicUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  }) : "";

  // Station view: simplified interface for continuous signature collection
  if (isStation) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-8">
        <nav>
          <Link
            href="/dashboard"
            className="group inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Activités
          </Link>
        </nav>
        <StationDetailView
          stationId={group.id}
          stationName={group.name}
          templateTitle={template?.title ?? "Formulaire"}
          publicUrl={publicUrl}
          qrDataUrl={qrDataUrl}
          signaturesToday={total}
          totalSignatures={total}
        />
      </main>
    );
  }

  // Phase: calculated server-side for initial render, re-computed live client-side
  // by SessionStatusBadge.
  const allSigned = total > 0 && signed === total;
  const phase = computeSessionPhase(status, startTime, endTime, allSigned);
  const isArchived = phase === "archived";
  const isDone = phase === "done";

  // Session time header: "Aujourd'hui 14:00 – 15:30"
  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;
  const timeLabel =
    startDate && endDate
      ? `${sessionDateLabel(startDate)} ${formatTimeRange(startDate, endDate)}`
      : startDate
        ? sessionDateLabel(startDate)
        : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-8">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav>
        <Link
          href="/dashboard"
          className="group inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Activités
        </Link>
      </nav>

      {/* ── HERO : Fiche d’activité ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] p-6 shadow-[var(--elev-1)]">

        {/* Status line compacte — toutes les infos temporelles sur une ligne */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px]">
          <SessionStatusBadge
            dbStatus={status}
            startTime={startTime}
            endTime={endTime}
            allSigned={allSigned}
          />
          {timeLabel ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <span className="text-[var(--color-muted)]">{timeLabel}</span>
            </>
          ) : null}
          {durationMinutes && durationMinutes > 0 ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <span className="text-[var(--color-muted)]">
                {durationMinutes < 60
                  ? `${durationMinutes} min`
                  : durationMinutes % 60 === 0
                    ? `${Math.floor(durationMinutes / 60)}h`
                    : `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60}`
                }
              </span>
            </>
          ) : null}
          {isExpress ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_9%,transparent)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-brand)]">
                Express
              </span>
            </>
          ) : null}
        </div>

        {/* Nom de l’activité — hero statement */}
        <h1 className="mb-3 text-[2.5rem] font-bold leading-[1.1] tracking-tight text-[var(--color-foreground)] sm:text-[2.75rem]">
          {group.name}
        </h1>

        {/* Métriques clés — participants + signatures */}
        <div className="mb-5 flex flex-wrap items-center gap-3 text-[14px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-muted)]">👥</span>
            <span className="font-semibold text-[var(--color-foreground)]">{total}</span>
            <span className="text-[var(--color-muted)]">participant{total > 1 ? "s" : ""}</span>
          </div>
          {requiresSignature && isRepMode ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-muted)]">✍️</span>
                {repSubmission ? (
                  <span className="font-semibold text-[var(--color-brand)]">Représentant signé ✓</span>
                ) : (
                  <span className="text-[var(--color-muted)]">En attente du représentant</span>
                )}
              </div>
            </>
          ) : requiresSignature && total > 0 ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--color-muted)]">✍️</span>
                <span className="font-semibold text-[var(--color-foreground)]">{signed}/{total}</span>
                <span className="text-[var(--color-muted)]">signé{signed > 1 ? "s" : ""}</span>
              </div>
            </>
          ) : requiresSignature === false ? (
            <>
              <span className="text-[var(--color-muted)]/30">·</span>
              <span className="text-[var(--color-muted)]">Aucune décharge nécessaire</span>
            </>
          ) : null}
        </div>

        {/* ── Barre d'actions ─────────────────────────────────── */}
        {canManageGroups && !isArchived ? (
          <div className="border-t border-[color-mix(in_srgb,var(--color-border)_35%,transparent)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Action primaire */}
              <div className="flex flex-wrap items-center gap-2">
                {accepting && !isDone ? (
                  <form action={setGroupStatus} className="inline">
                    <input type="hidden" name="group_id" value={group.id} />
                    <input type="hidden" name="status" value="closed" />
                    <PendingSubmitButton
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-4 text-[13px] font-semibold text-[var(--color-surface)] shadow-sm transition-all duration-150 hover:bg-[var(--color-foreground)]/90 disabled:pointer-events-none disabled:opacity-60"
                      idle="Terminer maintenant"
                      pendingLabel="Fermeture…"
                    />
                  </form>
                ) : !accepting && !isDone ? (
                  <form action={setGroupStatus} className="inline">
                    <input type="hidden" name="group_id" value={group.id} />
                    <input type="hidden" name="status" value="open" />
                    <PendingSubmitButton
                      className={btnSecondary}
                      idle="Rouvrir"
                      pendingLabel="Réouverture…"
                    />
                  </form>
                ) : null}
                <EditSessionButton
                  session={{
                    id: group.id,
                    name: group.name,
                    closesAt,
                    startTime,
                    endTime,
                    durationMinutes,
                    closingMode,
                    requiresSignature,
                    templateId: group.template_id,
                  }}
                  templates={allTemplates ?? []}
                  openingHours={parseOpeningHours(business.opening_hours)}
                  hasSignatures={signed > 0 || (isRepMode && repSubmission !== null)}
                  className={btnSecondary}
                />
              </div>
              {/* Action destructive — droite */}
              <form action={archiveGroup} className="inline">
                <input type="hidden" name="group_id" value={group.id} />
                <PendingSubmitButton
                  className="text-[12px] font-medium text-[var(--color-muted)]/60 transition-colors duration-150 hover:text-[color-mix(in_srgb,#ef4444_65%,var(--color-foreground))] disabled:pointer-events-none disabled:opacity-50"
                  idle="Archiver"
                  pendingLabel="Archivage…"
                />
              </form>
            </div>
          </div>
        ) : canManageGroups && isArchived ? (
          <div className="border-t border-[color-mix(in_srgb,var(--color-border)_35%,transparent)] pt-4">
            <form action={unarchiveGroup} className="inline">
              <input type="hidden" name="group_id" value={group.id} />
              <PendingSubmitButton
                className={btnSecondary}
                idle="Désarchiver"
                pendingLabel="Désarchivage…"
              />
            </form>
          </div>
        ) : null}
      </section>

      {/* Confirmations */}
      {sp.saved ? (
        <p
          role="status"
          className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_23%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] px-3 py-2 text-[12.5px]"
        >
          Paramètres enregistrés.
        </p>
      ) : null}
      {sp.express ? (
        <p
          role="status"
          className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_23%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] px-3 py-2 text-[12.5px]"
        >
          Session express prête — le QR est disponible ci-dessous.
        </p>
      ) : null}

      {/* ── PARTICIPANTS ──────────────────────────────────────────────────── */}
      <section className={card}>
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/75">
            Qui participe ?
          </h2>
          {total > 0 ? (
            <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-foreground)]/70">
              {total}
            </span>
          ) : null}
        </div>

        {/* Liste des participants */}
        {total > 0 ? (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--color-border)_55%,transparent)] overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]">
            {list.map((m) => {
              const hasSigned = Boolean(m.signed_submission_id);
              return (
                <li
                  key={m.id}
                  className={`flex items-center justify-between gap-3 bg-[var(--color-surface)] px-3.5 py-2 transition-colors ${motion} hover:bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-surface))]`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {requiresSignature ? (
                      <span
                        aria-hidden
                        className={`shrink-0 text-[15px] transition-opacity ${motion} ${
                          hasSigned
                            ? "text-[var(--color-brand)] opacity-75"
                            : "text-[var(--color-muted)] opacity-35"
                        }`}
                      >
                        {hasSigned ? "✓" : "○"}
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-[var(--color-foreground)]">
                        {m.full_name}
                      </p>
                      {m.note ? (
                        <p className="truncate text-[11.5px] text-[var(--color-muted)]">
                          {m.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {hasSigned && m.signed_at && !isRepMode ? (
                    <span className="shrink-0 tabular-nums text-[11.5px] text-[var(--color-muted)]">
                      {fmtTime(m.signed_at)}
                    </span>
                  ) : hasSigned && isRepMode ? (
                    <span className="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--color-brand)_7%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-brand)]/80">
                      ✓ Couvert
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          /* ── État vide ── */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_20%,transparent)] py-6 px-6 text-center">
            {isExpress ? (
              <>
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
                  <span className="text-[18px]">👥</span>
                </div>
                <p className="text-[12.5px] text-[var(--color-muted)] leading-relaxed max-w-[280px]">
                  Les participants apparaîtront ici au fur et à mesure qu&apos;ils s&apos;inscrivent via le QR code.
                </p>
              </>
            ) : (
              <>
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
                  <span className="text-[18px]">👥</span>
                </div>
                <p className="mb-0.5 text-[13px] font-medium text-[var(--color-foreground)]/75">
                  Aucun participant pour le moment
                </p>
                <p className="text-[12px] text-[var(--color-muted)]">
                  Ajoutez des personnes manuellement ou partagez le lien d&apos;inscription.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Ajouter un participant ── */}
        {!isArchived && canManageGroups && !isExpress && !(isRepMode && repSubmission) ? (
          <div className="mt-4 space-y-2">
            {/* Ajout manuel en accordéon */}
            <details className="group rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_42%,var(--color-surface))]">
              <summary className="cursor-pointer list-none px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[var(--color-foreground)]/80">
                    + Ajouter un participant
                  </span>
                  <span className="text-[10.5px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] px-3 py-3">
                <AddParticipantForm groupId={group.id} />
              </div>
            </details>

            {/* Import CSV en accordéon */}
            <details className="group rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_42%,var(--color-surface))]">
              <summary className="cursor-pointer list-none px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/70">
                    Importer plusieurs participants (CSV)
                  </span>
                  <span className="text-[10.5px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] px-3 py-2.5">
                <p className="mb-2 text-[12px] text-[var(--color-muted)]">
                  Ajoutez plusieurs participants d&apos;un coup via un fichier CSV.
                </p>
                <AddRosterForm groupId={group.id} mode={rosterMode} />
              </div>
            </details>
          </div>
        ) : isRepMode && repSubmission && canManageGroups ? (
          <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_28%,var(--color-surface))] px-3 py-2">
            <p className="text-[12px] text-[var(--color-muted)]/85">
              🔒 Liste verrouillée — la signature du représentant couvre ce groupe précis.
            </p>
          </div>
        ) : null}
      </section>

      {/* ── MODULE SIGNATURES (conditionnel) ─────────────────────────────── */}
      {requiresSignature && template ? (
        <section className={`${card} border-l-[3px] border-l-[var(--color-brand)]`}>
          <div className="mb-3.5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]/75 mb-1.5">
                Décharges de responsabilité
              </h2>
              {template ? (
                <p className="text-[12.5px] text-[var(--color-muted)]">
                  Formulaire :{" "}
                  <Link
                    href={`/dashboard/waivers/${template.id}`}
                    className={`font-medium text-[var(--color-foreground)]/75 underline-offset-2 transition-colors ${motion} hover:text-[var(--color-brand)] hover:underline`}
                  >
                    {template.title}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Mode représentant ── */}
          {isRepMode ? (
            <div className="mb-3.5">
              {repSubmission ? (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))] px-3.5 py-2.5">
                  <p className="mb-0.5 text-[13px] font-semibold text-[var(--color-brand)]">
                    Représentant signé ✓
                  </p>
                  <p className="text-[12.5px] text-[var(--color-muted)]">
                    Signé par{" "}
                    <span className="font-medium text-[var(--color-foreground)]/80">
                      {repSubmission.signer_name}
                    </span>
                    {repSubmission.representative_role ? (
                      <span> · {repSubmission.representative_role}</span>
                    ) : null}
                    {repSubmission.signed_at ? (
                      <span> · {fmtTime(repSubmission.signed_at)}</span>
                    ) : null}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-[var(--color-muted)]/70">
                    Cette signature couvre l&apos;ensemble des {total} participants.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_20%,transparent)] px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold text-[var(--color-foreground)]/70">
                    En attente de signature
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                    Un représentant doit signer pour l&apos;ensemble du groupe via le lien QR.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── Mode individuel ── */
            <div className="mb-3.5">
              <p className="mb-1.5 text-[13px] font-semibold text-[var(--color-foreground)]">
                {signed === total && total > 0
                  ? `Tous les participants ont signé ✓`
                  : signed === 0 && total > 0
                  ? `Aucune signature reçue pour le moment`
                  : `${signed} signature${signed > 1 ? "s" : ""} reçue${signed > 1 ? "s" : ""} sur ${total}`}
              </p>
              <GroupProgressBar signed={signed} total={total} variant="dashboard" />
            </div>
          )}

          {/* Actions principales */}
          {!isDone && !isArchived && !(isRepMode && repSubmission) ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/60">
                Actions
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {requiresSignature ? (
                  <>
                    <SessionQrOverlay
                      qrDataUrl={qrDataUrl}
                      publicUrl={publicUrl}
                      sessionName={group.name}
                      className={`${btnSecondary} shadow-[var(--elev-2)] hover:shadow-[var(--elev-3)]`}
                    />
                    <CopyLinkButton url={publicUrl} size="sm" variant="icon" />
                  </>
                ) : null}
                {canExport && signed > 0 ? (
                  <div className="ml-auto">
                    <GroupExportButtons
                      groupId={group.id}
                      signedCount={signed}
                      className={btnSecondary}
                      compact
                      signatureMode={signatureMode}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Export représentant signé - pas de QR */}
          {!isDone && !isArchived && isRepMode && repSubmission && canExport ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/60">
                Exports
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <GroupExportButtons
                  groupId={group.id}
                  signedCount={signed}
                  className={btnSecondary}
                  compact
                  signatureMode={signatureMode}
                />
              </div>
            </div>
          ) : null}

          {/* Export pour sessions terminées */}
          {isDone && canExport && signed > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/60">
                Exports
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <GroupExportButtons
                  groupId={group.id}
                  signedCount={signed}
                  className={btnSecondary}
                  compact
                  signatureMode={signatureMode}
                />
              </div>
            </div>
          ) : null}

          {/* En attente de signature — mode individuel seulement */}
          {!isRepMode && waitingMembers.length > 0 && !isDone && !isArchived ? (
            <details className="group mt-4 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_42%,var(--color-surface))]">
              <summary className="cursor-pointer list-none px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/70">
                    En attente de signature ({waitingMembers.length})
                  </span>
                  <span className="text-[10.5px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)]">
                <ul className="divide-y divide-[color-mix(in_srgb,var(--color-border)_42%,transparent)]">
                  {waitingMembers.map((m) => (
                    <MemberRow
                      key={m.id}
                      groupId={group.id}
                      member={m}
                      canRemind={!isExpress && accepting && canManageGroups}
                      publicUrl={publicUrl}
                    />
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <LiveRefresh enabled={isExpress && !isDone && !isArchived} intervalMs={20_000} />
    </main>
  );
}
