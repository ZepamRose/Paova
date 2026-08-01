import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Settings2 } from "lucide-react";
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
import { GroupSettingsForm } from "../group-settings-form";
import { MemberRow } from "../member-row";
import { GroupExportButtons } from "../group-export-buttons";
import { LiveRefresh } from "../live-refresh";
import {
  archiveGroup,
  setGroupStatus,
  unarchiveGroup,
} from "../actions";

// ─── Design tokens ───────────────────────────────────────────────────────────

const motion = "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";

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
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: group } = await supabase
    .from("signing_group")
    .select(
      "id, name, public_token, status, template_id, created_at, closes_at, business_id, kind, start_time, end_time, duration_minutes",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) redirect("/dashboard");

  await ensureGroupAccepting(supabase, group);

  const { data: fresh } = await supabase
    .from("signing_group")
    .select("status, closes_at, start_time, end_time, duration_minutes")
    .eq("id", group.id)
    .maybeSingle();

  const status = fresh?.status ?? group.status;
  const closesAt = fresh?.closes_at ?? group.closes_at;
  const startTime = fresh?.start_time ?? group.start_time;
  const endTime = fresh?.end_time ?? group.end_time;
  const durationMinutes = fresh?.duration_minutes ?? group.duration_minutes;
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
  const signedMembers = list.filter((m) => m.signed_submission_id);
  const waitingMembers = list.filter((m) => !m.signed_submission_id);
  const isExpress = group.kind === "express";

  const publicUrl = `${env.appUrl}/g/${group.public_token}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-7 sm:px-6 sm:py-8">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav>
        <Link
          href="/dashboard"
          className="group inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-muted)] transition-[color,transform] hover:text-[var(--color-foreground)]"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Sessions
        </Link>
      </nav>

      {/* ── Header — statut d’abord, nom ensuite ────────────────────────── */}
      <header className="flex flex-col gap-3">
        {/* 1. Statut + countdown */}
        <SessionStatusBadge
          dbStatus={status}
          startTime={startTime}
          endTime={endTime}
          allSigned={allSigned}
        />

        {/* 2. Nom */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[1.35rem] font-bold tracking-tight text-[var(--color-foreground)] sm:text-[1.45rem]">
            {group.name}
          </h1>
          {isExpress ? (
            <span className="rounded-md bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_20%,transparent)]">
              Express
            </span>
          ) : null}
        </div>

        {/* 3. Décharge (lien) · plage horaire */}
        <p className="text-[12.5px] text-[var(--color-muted)]">
          {template ? (
            <Link
              href={`/dashboard/waivers/${template.id}`}
              className="font-semibold text-[var(--color-foreground)]/75 underline-offset-2 hover:text-[var(--color-brand)] hover:underline"
            >
              {template.title}
            </Link>
          ) : (
            <span className="font-semibold text-[var(--color-foreground)]/75">
              Décharge
            </span>
          )}
          {timeLabel ? (
            <>
              <span className="mx-1.5 opacity-25">·</span>
              {timeLabel}
            </>
          ) : null}
        </p>

        {/* 4. Barre de progression */}
        <GroupProgressBar signed={signed} total={total} variant="dashboard" />

        {/* Confirmation settings saved */}
        {sp.saved ? (
          <p
            role="status"
            className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_23%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] px-3 py-2 text-[12.5px]"
          >
            Paramètres enregistrés.
          </p>
        ) : null}

        {/* Confirmation session express créée */}
        {sp.express ? (
          <p
            role="status"
            className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_23%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] px-3 py-2 text-[12.5px]"
          >
            Session express prête — affichez le QR.
          </p>
        ) : null}
      </header>

      {/* ── EN ATTENTE — surface de travail principale ───────────────────── */}
      {!isDone && !isArchived ? (
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionLabel}>
              En attente
              {waitingMembers.length > 0 ? (
                <span className="ml-1.5 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 font-bold tabular-nums text-[var(--color-foreground)]/70">
                  {waitingMembers.length}
                </span>
              ) : null}
            </h2>
            <div className="flex items-center gap-1.5">
              {/* QR — geste principal opérateur */}
              <SessionQrOverlay
                qrDataUrl={qrDataUrl}
                publicUrl={publicUrl}
                sessionName={group.name}
                className={btnSecondary}
              />
              {/* Copier lien — relancer V1 */}
              <CopyLinkButton url={publicUrl} size="sm" variant="icon" />
            </div>
          </div>

          {waitingMembers.length === 0 ? (
            <p className="mt-2.5 text-[12.5px] text-[var(--color-muted)]">
              {total === 0
                ? isExpress
                  ? "QR prêt — les participants signent ici au fur et à mesure."
                  : "Ajoutez des participants pour commencer le suivi."
                : "Tous les participants ont signé."}
            </p>
          ) : (
            <ul className="mt-2.5 divide-y divide-[color-mix(in_srgb,var(--color-border)_55%,transparent)] overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]">
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
          )}
        </section>
      ) : null}

      {/* ── SIGNÉS ────────────────────────────────────────────────────────── */}
      {signedMembers.length > 0 ? (
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionLabel}>
              Signés
              <span className="ml-1.5 rounded-md bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] px-1.5 py-0.5 font-bold tabular-nums text-[var(--color-brand)]">
                {signedMembers.length}
              </span>
            </h2>
            {/* En état DONE, le QR n’est plus utile — l’export prend le relai */}
            {isDone && canExport ? (
              <GroupExportButtons
                groupId={group.id}
                signedCount={signed}
                className={btnSecondary}
                compact
              />
            ) : null}
          </div>

          <ul className="mt-2.5 divide-y divide-[color-mix(in_srgb,var(--color-border)_55%,transparent)] overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]">
            {signedMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-3.5 py-2 opacity-70"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="shrink-0 text-[var(--color-brand)] opacity-70"
                  >
                    ✓
                  </span>
                  <p className="truncate text-[13.5px] font-semibold text-[var(--color-foreground)]">
                    {m.full_name}
                  </p>
                </div>
                {m.signed_at ? (
                  <span className="shrink-0 tabular-nums text-[11.5px] text-[var(--color-muted)]">
                    {fmtTime(m.signed_at)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Ajouter un participant ────────────────────────────────────────── */}
      {!isArchived && canManageGroups && !isExpress ? (
        <section className={card}>
          <h2 className={`${sectionLabel} mb-2.5`}>Ajouter un participant</h2>
          <AddParticipantForm groupId={group.id} />
          <details className="group mt-2.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_42%,var(--color-surface))]">
            <summary className="cursor-pointer list-none px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/70">
                  Import CSV
                </span>
                <span className="text-[10.5px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] px-3 py-2.5">
              <p className="mb-2 text-[12px] text-[var(--color-muted)]">
                Ajoutez plusieurs participants d&apos;un coup.
              </p>
              <AddRosterForm groupId={group.id} mode={rosterMode} />
            </div>
          </details>
        </section>
      ) : null}

      {/* ── Paramètres — déroulant, rôle gestion ──────────────────────────── */}
      {canManageGroups ? (
        <details className="group rounded-xl border border-[color-mix(in_srgb,var(--color-border)_58%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-1)]">
          <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Settings2
                  size={13}
                  strokeWidth={2}
                  className="text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="text-[12.5px] font-semibold text-[var(--color-foreground)]/80">
                  Paramètres
                </span>
              </span>
              <span className="text-[10.5px] text-[var(--color-muted)] transition-transform duration-150 group-open:rotate-180">
                ▾
              </span>
            </span>
          </summary>
          <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] px-4 pb-4 pt-2">
            <GroupSettingsForm
              groupId={group.id}
              name={group.name}
              closesAt={closesAt}
              startTime={startTime}
              endTime={endTime}
              durationMinutes={durationMinutes}
              disabled={isArchived}
            />
          </div>
        </details>
      ) : null}

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-4">
        {canExport && !isDone && signed > 0 ? (
          <GroupExportButtons
            groupId={group.id}
            signedCount={signed}
            className={btnSecondary}
            compact
          />
        ) : null}

        {canManageGroups && !isArchived ? (
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
                idle={accepting ? "Fermer la session" : "Rouvrir"}
                pendingLabel={accepting ? "Fermeture…" : "Réouverture…"}
              />
            </form>
            <form action={archiveGroup}>
              <input type="hidden" name="group_id" value={group.id} />
              <PendingSubmitButton
                className="text-[12.5px] font-semibold text-[var(--color-muted)] transition-colors hover:text-[color-mix(in_srgb,#ef4444_70%,var(--color-foreground))] disabled:pointer-events-none disabled:opacity-70"
                idle="Archiver"
                pendingLabel="Archivage…"
              />
            </form>
          </>
        ) : null}

        {canManageGroups && isArchived ? (
          <form action={unarchiveGroup}>
            <input type="hidden" name="group_id" value={group.id} />
            <PendingSubmitButton
              className={btnSecondary}
              idle="Désarchiver"
              pendingLabel="Désarchivage…"
            />
          </form>
        ) : null}
      </footer>

      <LiveRefresh enabled={isExpress && !isDone && !isArchived} intervalMs={20_000} />
    </main>
  );
}
