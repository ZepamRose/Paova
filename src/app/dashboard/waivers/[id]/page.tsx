import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import {
  Share2,
  ScrollText,
  ListChecks,
  PenLine,
  Calendar,
  Users,
  History,
  GitBranch,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { getBusinessContext, hasCapability } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import {
  configFromTemplateRow,
  describeNextSignatureOpen,
  ensureTemplateNotStale,
  formatExpiresAt,
  formatSignatureHoursSummary,
  isExpirationMode,
  isTemplateStatus,
  isWithinSignatureHours,
  type ExpirationMode,
} from "@/lib/templates";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "../../copy-link-button";
import { DeleteWaiverButton } from "../../delete-waiver-button";
import { ToggleStatusForm } from "../../toggle-status-form";
import { SubmissionsList } from "./submissions-list";
import { ExportCsvButton } from "./export-csv-button";
import { AuditTimeline } from "./audit-timeline";
import { VersionHistory } from "./version-history";
import { WaiverDetailTabs } from "./waiver-detail-tabs";
import { ActivityInsights } from "./activity-insights";
import { AvailabilitySection } from "./availability-section";
import {
  summarizeExpiration,
  summarizeHours,
} from "./availability-summary";
import { QrPreview } from "./qr-preview";
import {
  isWaiverDetailTab,
  type WaiverDetailTabId,
} from "./waiver-detail-tab-ids";
import {
  extractSubjectsFromAnswers,
  formatSubjectsLabel,
  formatSubjectsSummary,
  subjectsSearchHaystack,
} from "@/lib/submissions";
import { getPackById, resolveTemplateIntent } from "@/lib/waiver-packs";
import {
  deriveTemplateActivity,
  formatRelativeActivityFr,
  isTimelineStoryEvent,
} from "@/lib/audit";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

const TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  textarea: "Texte long",
  number: "Nombre",
  tel: "Téléphone",
  date: "Date",
  checkbox: "Case à cocher",
  select: "Liste déroulante",
  participants: "Liste de participants",
};

/** Shared motion — keep every interactive surface on the same curve. */
const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

const card =
  `rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[var(--elev-3)] ring-1 ring-black/[0.02] transition-[box-shadow,border-color] ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_58%,var(--color-muted))] hover:shadow-[var(--elev-hover)] dark:ring-white/[0.04] sm:p-7`;

/** Primary “Partage” card — one step above secondary cards, same radius/padding. */
const cardFeatured =
  `rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-brand)_26%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-brand))] p-6 shadow-[var(--elev-3)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] transition-[box-shadow,border-color,ring-color] ${motion} hover:border-[color-mix(in_srgb,var(--color-brand)_34%,var(--color-border))] hover:shadow-[var(--elev-hover)] hover:ring-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] sm:p-7 dark:bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-brand))] dark:ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]`;

const btnPrimary =
  `inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-medium tracking-tight text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter,box-shadow,opacity] ${motion} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-65`;

const btnSecondary =
  `inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-4 text-sm font-medium tracking-tight text-[var(--color-foreground)]/82 shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,color,opacity] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_88%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-65`;

const badgeFine =
  `inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-4 tracking-tight transition-[background-color,color,box-shadow] ${motion}`;

const metaChip =
  `inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_48%,var(--color-surface))] px-2.5 py-1 text-[12px] text-[var(--color-muted)] transition-[border-color,background-color] ${motion}`;

const textSecondary = "text-[13px] leading-relaxed text-[var(--color-muted)]";
const textCaption =
  "text-[12px] leading-relaxed text-[var(--color-muted)]";
const labelCaps =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function FieldIcon({ type }: { type: string }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "email":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "tel":
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "checkbox":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "date":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "select":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "number":
      return (
        <svg {...common}>
          <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
        </svg>
      );
    case "textarea":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "participants":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <SectionIcon>{icon}</SectionIcon>
        <div className="min-w-0 pt-px">
          <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.1rem]">
            {title}
          </h2>
          {description ? (
            <p className={`mt-1 ${textSecondary}`}>{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export default async function WaiverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    welcome?: string;
    error?: string;
    tab?: string;
    page?: string;
  }>;
}) {
  const { id } = await params;
  const { welcome, error, tab: tabParam, page: pageParam } = await searchParams;
  const activeTab: WaiverDetailTabId = isWaiverDetailTab(tabParam)
    ? tabParam
    : "signatures";
  const PAGE_SIZE = 40;
  const pageRaw = Number.parseInt(pageParam ?? "1", 10);
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const availabilityInitiallyOpen =
    tabParam === "horaires" || error === "horaires"
      ? ("hours" as const)
      : tabParam === "expiration" || error === "expiration"
        ? ("expiration" as const)
        : null;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Claim pending invites before role checks (avoids owner-of-solo-space races).
  await resolveBusinessContext(supabase, user.id, user);

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, legal_text, fields, signer_name_label, starter_pack_id, public_slug, status, expiration_mode, expiration_days, expires_at, deleted_at, version, created_at, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("id", id)
    .maybeSingle();

  if (!template || !isTemplateStatus(template.status)) {
    notFound();
  }

  const membership = await getBusinessContext(supabase, template.business_id, user.id);
  if (!membership) {
    notFound();
  }
  const canExport = hasCapability(membership.role, "export_data");
  const canManageWaivers = hasCapability(membership.role, "manage_waivers");
  const canManageGroups = hasCapability(membership.role, "manage_groups");

  const expirationMode: ExpirationMode = isExpirationMode(
    template.expiration_mode,
  )
    ? template.expiration_mode
    : "none";

  // Persist lazy expiry when the owner opens the detail page.
  const lifecycle = await ensureTemplateNotStale(supabase, {
    id: template.id,
    business_id: template.business_id,
    title: template.title,
    status: template.status,
    expiration_mode: expirationMode,
    expiration_days: template.expiration_days,
    expires_at: template.expires_at,
  });
  const displayStatus = template.deleted_at
    ? "archived"
    : lifecycle.status;

  const hoursConfig = configFromTemplateRow(template);
  const withinHours = isWithinSignatureHours(hoursConfig);
  const hoursSummary = formatSignatureHoursSummary(hoursConfig);
  const nextOpenHint = describeNextSignatureOpen(hoursConfig);

  const canAcceptSignatures =
    !template.deleted_at && displayStatus === "open";
  const toggleLabel =
    displayStatus === "open"
      ? "Désactiver"
      : displayStatus === "archived"
        ? "Restaurer"
        : displayStatus === "expired"
          ? "Réouvrir"
          : "Activer";
  const togglePendingLabel =
    displayStatus === "open"
      ? "Désactivation…"
      : displayStatus === "archived"
        ? "Restauration…"
        : displayStatus === "expired"
          ? "Réouverture…"
          : "Activation…";
  const expiresLabel = formatExpiresAt(template.expires_at);

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const templateIntent = resolveTemplateIntent({
    starterPackId: template.starter_pack_id,
    fields,
    signerNameLabel: template.signer_name_label,
  });
  const isParentalContext =
    templateIntent.signerRole === "legal_representative" ||
    templateIntent.subjects === "minors";
  const starterPack = template.starter_pack_id
    ? getPackById(template.starter_pack_id)
    : undefined;

  const [
    { count: submissionCountExact },
    { data: proofVersionCounts },
    { data: latestSubmission },
  ] = await Promise.all([
      supabase
        .from("submission")
        .select("id", { count: "exact", head: true })
        .eq("template_id", template.id),
      supabase.rpc("template_proof_version_counts", {
        p_template_id: template.id,
      }),
      supabase
        .from("submission")
        .select("signed_at")
        .eq("template_id", template.id)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const submissionCount = submissionCountExact ?? 0;
  const totalPages = Math.max(1, Math.ceil(submissionCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: submissionRows } = await supabase
    .from("submission")
    .select("id, signer_name, signer_email, signed_at, answers")
    .eq("template_id", template.id)
    .order("signed_at", { ascending: false })
    .range(from, to);

  const submissions = (submissionRows ?? []).map((row) => {
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const groups = extractSubjectsFromAnswers(fields, answers);
    return {
      id: row.id,
      signer_name: row.signer_name,
      signer_email: row.signer_email,
      signed_at: row.signed_at,
      subjectsSummary: formatSubjectsSummary(groups),
      subjectsLabel: groups.length > 0 ? formatSubjectsLabel(groups) : null,
      subjectsSearch: subjectsSearchHaystack(groups),
      answers,
    };
  });

  const { data: auditEvents } = await supabase
    .from("audit_event")
    .select(
      "id, event_type, actor_kind, payload, created_at, submission_id",
    )
    .eq("template_id", template.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: versionRows } = await supabase
    .from("waiver_template_version")
    .select(
      "id, version, title, legal_text, fields, signer_name_label, created_at",
    )
    .eq("template_id", template.id)
    .order("version", { ascending: false });

  const signaturesByVersion = new Map<number, number>();
  for (const row of proofVersionCounts ?? []) {
    signaturesByVersion.set(
      row.template_version,
      Number(row.signature_count),
    );
  }

  const versions = (versionRows ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    legal_text: row.legal_text,
    fields: row.fields,
    signer_name_label: row.signer_name_label,
    created_at: row.created_at,
    signature_count: signaturesByVersion.get(row.version) ?? 0,
    is_current: row.version === template.version,
  }));

  const publicUrl = `${env.appUrl}/w/${template.public_slug}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 512,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  const lastSignedAt = latestSubmission?.signed_at ?? null;
  const activity = deriveTemplateActivity(auditEvents ?? []);
  const currentVersion = versions.find((v) => v.is_current) ?? versions[0];
  const lastUpdateRelative = formatRelativeActivityFr(activity.lastUpdatedAt);

  const builtInFields: {
    key: string;
    label: string;
    type: string;
    required: boolean;
    hint?: string;
  }[] = [
    {
      key: "_name",
      label: "Nom du signataire",
      type: "text",
      required: true,
      hint: "Toujours requis",
    },
    {
      key: "_email",
      label: "Email",
      type: "email",
      required: false,
    },
  ];

  const hoursGlance = summarizeHours(hoursConfig);
  const expirationGlance = summarizeExpiration({
    mode: expirationMode,
    expiresAt: template.expires_at,
    expiresLabel,
    isExpired: displayStatus === "expired",
  });
  const outsideHours =
    canAcceptSignatures && hoursConfig.enabled && !withinHours;

  const { data: templateGroups } = await supabase
    .from("signing_group")
    .select("id, name, status")
    .eq("template_id", template.id)
    .eq("business_id", template.business_id)
    .order("created_at", { ascending: false });

  const groupsForTemplate = templateGroups ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-7 px-5 py-10 sm:gap-8 sm:px-6 sm:py-12">
      {welcome === "1" ? (
        <section className="animate-fade-up rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[var(--color-surface)] p-5 shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Bienvenue
          </p>
          <h2 className="mt-1.5 text-[1.05rem] font-semibold tracking-tight">
            Votre première décharge est prête
          </h2>
          <p className={`mt-1.5 ${textSecondary}`}>
            Prochaines étapes pour l&apos;utiliser dès aujourd&apos;hui :
          </p>
          <ol className="mt-3.5 flex list-decimal flex-col gap-2 pl-5 text-[13px] leading-relaxed text-[var(--color-foreground)]">
            <li>Copiez le lien public ou téléchargez le QR code</li>
            <li>Faites un test de signature depuis votre téléphone</li>
            <li>
              (Optionnel) Ajoutez votre logo dans{" "}
              <Link
                href="/dashboard/settings"
                className="font-medium text-[var(--color-brand)] underline-offset-2 hover:underline"
              >
                Réglages
              </Link>
            </li>
          </ol>
        </section>
      ) : null}

      <header className="animate-fade-up flex flex-col gap-5">
        <Link
          href={
            template.deleted_at ? "/dashboard?view=archived" : "/dashboard"
          }
          className={`group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] ${motion} hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
        >
          <span
            aria-hidden
            className={`transition-transform ${motion} group-hover:-translate-x-0.5`}
          >
            ←
          </span>
          {template.deleted_at ? "Archivées" : "Tableau de bord"}
        </Link>

        <div className="flex flex-col">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
                {template.title}
              </h1>
              <StatusBadge status={displayStatus} />
              <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium tracking-tight text-[var(--color-muted)]">
                v{template.version ?? 1}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
              {starterPack ? starterPack.label : "Décharge de responsabilité"}
            </p>
          </div>

          <div className="mt-3.5 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={metaChip}>
                <Calendar
                  size={12}
                  strokeWidth={1.85}
                  className="opacity-70"
                  aria-hidden
                />
                Créée le {formatDate(template.created_at)}
              </span>
              <span className={metaChip}>
                <Users
                  size={12}
                  strokeWidth={1.85}
                  className="opacity-70"
                  aria-hidden
                />
                {submissionCount === 0
                  ? "Aucune signature"
                  : `${submissionCount} signature${submissionCount === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {lastSignedAt ? (
                <span>
                  Dernière signature{" "}
                  <span className="font-medium text-[var(--color-foreground)]/75">
                    {formatRelativeActivityFr(lastSignedAt) ??
                      `le ${formatDate(lastSignedAt)}`}
                  </span>
                </span>
              ) : (
                <span>En attente de la première signature</span>
              )}
              {lastUpdateRelative ? (
                <>
                  <span
                    className="text-[var(--color-muted)]/40"
                    aria-hidden
                  >
                    ·
                  </span>
                  <span>
                    Modifiée{" "}
                    <span className="font-medium text-[var(--color-foreground)]/75">
                      {lastUpdateRelative}
                    </span>
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] pt-5">
            {canManageWaivers ? (
              <>
            <div className="flex flex-wrap items-center gap-2">
              {!template.deleted_at ? (
                <Link
                  href={`/dashboard/waivers/${template.id}/edit`}
                  className={btnPrimary}
                >
                  Modifier
                </Link>
              ) : null}
              <ToggleStatusForm
                id={template.id}
                label={toggleLabel}
                pendingLabel={togglePendingLabel}
                className={btnSecondary}
              />
            </div>
            <div className="ml-auto">
              {!template.deleted_at ? (
                <DeleteWaiverButton
                  id={template.id}
                  title={template.title}
                  submissionCount={submissionCount}
                  variant="quiet"
                />
              ) : null}
            </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {error === "expiration" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Vérifiez les paramètres d&apos;expiration (jours ou date requis).
        </p>
      ) : null}

      {error === "horaires" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Indiquez une heure d&apos;ouverture et de fermeture valides.
        </p>
      ) : null}

      {!canAcceptSignatures ? (
        <p
          role="status"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] leading-relaxed text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          {displayStatus === "archived"
            ? "Cette décharge est archivée : elle n’accepte plus de signatures. Retrouvez-la dans Archivées sur le tableau de bord. Les signatures existantes sont conservées — utilisez Restaurer pour la réactiver."
            : displayStatus === "expired"
              ? "Cette décharge est expirée : le lien public n’accepte plus de nouvelles signatures. Ajustez l’expiration ou réouvrez-la."
              : "Cette décharge est désactivée : le lien public n’accepte plus de nouvelles signatures."}
        </p>
      ) : null}

      {outsideHours ? (
        <div
          role="status"
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-3.5 py-2.5 shadow-[var(--elev-1)] sm:px-4"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-foreground)]/65">
              <CalendarClock size={14} strokeWidth={1.85} aria-hidden />
            </span>
            <div className="min-w-0 pt-px">
              <p className="text-[13.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {nextOpenHint
                  ? `Hors horaires · rouvre ${nextOpenHint}`
                  : "Hors horaires · signatures temporairement fermées"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
                La décharge reste ouverte de votre côté
                {hoursSummary ? ` · ${hoursSummary}` : ""}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Partage — always visible */}
      <section className={`${cardFeatured} animate-fade-up-delay`}>
        <SectionHeader
          icon={<Share2 size={16} strokeWidth={1.85} />}
          title="Partage"
          description="Lien ou QR code pour faire signer."
        />

        <div className="mt-5 flex flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-2">
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

          <div className="grid items-stretch gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-5">
            <div className={`flex w-full flex-col gap-2.5 justify-self-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] p-3.5 shadow-[var(--elev-1)] transition-[border-color,box-shadow,transform] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] hover:shadow-[var(--elev-2)] sm:justify-self-start`}>
              <span className={labelCaps}>QR code</span>
              <QrPreview
                templateId={template.id}
                dataUrl={qrDataUrl}
                filename={`qr-${template.public_slug}.png`}
                downloadClassName={`${btnSecondary} h-9 w-full justify-center text-[13px]`}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              <div>
                <p className={`${labelCaps} mb-2.5`}>Activité</p>
                <ActivityInsights
                  activity={activity}
                  currentVersionCreatedAt={currentVersion?.created_at ?? null}
                  className="grid gap-2 sm:grid-cols-3"
                />
              </div>

              <a
                href="#disponibilite"
                className={`group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-background))] px-3.5 py-2.5 transition-[border-color,background-color,box-shadow,transform] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
              >
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Horaires
                  </span>
                  <span className="mt-0.5 block text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
                    {hoursGlance.primary}
                    {hoursGlance.secondary ? (
                      <span className="font-normal text-[var(--color-muted)]">
                        {" "}
                        · {hoursGlance.secondary}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span
                  className="hidden h-8 w-px bg-[color-mix(in_srgb,var(--color-border)_60%,transparent)] sm:block"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Expiration
                  </span>
                  <span
                    className={`mt-0.5 block text-[13px] font-medium tracking-tight ${
                      expirationGlance.tone === "warning"
                        ? "text-[color-mix(in_srgb,#b45309_88%,var(--color-foreground))]"
                        : "text-[var(--color-foreground)]"
                    }`}
                  >
                    {expirationGlance.primary}
                  </span>
                </span>
                <span className="ml-auto text-[12px] font-medium text-[var(--color-brand)] opacity-80 transition-opacity duration-[180ms] group-hover:opacity-100">
                  Ajuster →
                </span>
              </a>
            </div>
          </div>

          {!template.deleted_at ? (
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-brand)]">
                  <Users size={14} strokeWidth={1.85} aria-hidden />
                </span>
                <span className={labelCaps}>Mode groupe</span>
              </div>
              <p className={`mt-2 max-w-xl ${textSecondary}`}>
                Un groupe permet d&apos;utiliser cette décharge pour plusieurs
                participants. Chacun retrouve automatiquement sa fiche lors de
                la signature.
              </p>

              {groupsForTemplate.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {groupsForTemplate.slice(0, 4).map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/dashboard/groupes/${g.id}`}
                        className={`flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-background))] px-3.5 py-2.5 text-[13px] transition-[border-color,background-color,box-shadow,transform] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
                      >
                        <span className="min-w-0 truncate font-medium text-[var(--color-foreground)]">
                          {g.name}
                        </span>
                        <span className="shrink-0 text-[12px] text-[var(--color-muted)]">
                          {g.status === "open" ? "Ouvert" : "Fermé"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {canManageGroups ? (
                <div className="mt-3.5 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/groupes/new?template=${template.id}`}
                    className={btnSecondary}
                  >
                    {groupsForTemplate.length > 0
                      ? "Nouveau groupe"
                      : "Créer un groupe"}
                  </Link>
                  {groupsForTemplate.length > 4 ? (
                    <Link
                      href="/dashboard/groupes"
                      className="text-[13px] font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
                    >
                      Voir tous les groupes
                    </Link>
                  ) : null}
                </div>
                <Link
                  href={`/dashboard/groupes/express?template=${template.id}`}
                  className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-foreground)]/75 underline-offset-2 transition-colors hover:text-[var(--color-brand)] hover:underline"
                >
                  Groupe express
                  <span className="font-normal text-[var(--color-muted)]">
                    · sans liste
                  </span>
                </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {canManageWaivers ? (
      <AvailabilitySection
        templateId={template.id}
        hoursConfig={hoursConfig}
        expirationMode={expirationMode}
        expirationDays={template.expiration_days}
        expiresAt={template.expires_at}
        expiresLabel={expiresLabel}
        isExpired={displayStatus === "expired"}
        initiallyOpen={availabilityInitiallyOpen}
      />
      ) : null}
      <WaiverDetailTabs
        templateId={template.id}
        initialTab={activeTab}
        counts={{
          signatures: submissionCount,
          versions: versions.length,
          historique: (auditEvents ?? []).filter((e) =>
            isTimelineStoryEvent(e.event_type),
          ).length,
        }}
        panels={{
          signatures: (
        <section className={card}>
          <SectionHeader
            icon={<PenLine size={16} strokeWidth={1.85} />}
            title="Signatures"
            description={
              submissionCount === 0
                ? isParentalContext
                  ? "Aucune autorisation pour le moment."
                  : "Aucune signature pour le moment."
                : `${submissionCount} signature${submissionCount === 1 ? "" : "s"}${
                    lastSignedAt
                      ? ` · dernière ${formatRelativeActivityFr(lastSignedAt) ?? ""}`
                      : ""
                  }${
                    isParentalContext ? " · recherche possible par enfant" : ""
                  }`
            }
            action={
              submissionCount > 0 && canExport ? (
                <ExportCsvButton
                  href={`/dashboard/waivers/${template.id}/submissions/export`}
                  label="Exporter"
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_9%,var(--color-surface))] px-3.5 text-[13px] font-medium tracking-tight text-[color-mix(in_srgb,var(--color-brand)_92%,var(--color-foreground))] shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,color] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-65`}
                />
              ) : null
            }
          />

          <div className="mt-5">
            <SubmissionsList
              templateId={template.id}
              fields={fields.map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
              }))}
              groups={groupsForTemplate.map((g) => ({ id: g.id, name: g.name }))}
              submissions={submissions ?? []}
              page={currentPage}
              totalCount={submissionCount}
              pageSize={PAGE_SIZE}
              emptyContext={{
                createdAt: template.created_at,
                publicUrl,
                lastLinkViewedAt: activity.lastLinkViewedAt,
                linkViewCount: activity.linkViews,
              }}
              canErase={hasCapability(membership.role, "delete_submission")}
            />
          </div>
        </section>
          ),
          contenu: (
        <div className="flex flex-col gap-5">
          <section className={card}>
            <SectionHeader
              icon={<ScrollText size={16} strokeWidth={1.85} />}
              title="Texte juridique"
              description="Texte lu et accepté à la signature."
              action={
                canManageWaivers && !template.deleted_at ? (
                  <Link
                    href={`/dashboard/waivers/${template.id}/edit`}
                    className={btnSecondary}
                  >
                    Modifier
                  </Link>
                ) : null
              }
            />
            <div className="mt-5 max-h-[22rem] overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_62%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_60%,var(--color-surface-2))] px-5 py-5 sm:px-6 dark:bg-[color-mix(in_srgb,var(--color-background)_40%,var(--color-surface-2))]">
              <p className="whitespace-pre-wrap text-[14.5px] leading-[1.75] text-[var(--color-foreground)]/88">
                {template.legal_text}
              </p>
            </div>
          </section>

          <section className={card}>
            <SectionHeader
              icon={<ListChecks size={16} strokeWidth={1.85} />}
              title="Champs demandés"
              description="Informations collectées sur le formulaire."
            />
            <ul className="mt-5 flex flex-col gap-2">
              {[...builtInFields, ...fields].map((f) => {
                const typeLabel =
                  "hint" in f && f.hint
                    ? f.hint
                    : TYPE_LABELS[f.type] ?? f.type;
                const required = f.required;
                const options =
                  "options" in f && f.type === "select" && f.options?.length
                    ? f.options
                    : null;

                return (
                  <li
                    key={f.key}
                    className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] px-3.5 py-3"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-surface))] text-[var(--color-brand)]"
                      aria-hidden
                    >
                      <FieldIcon type={f.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium tracking-tight">
                          {f.label}
                        </span>
                        <span
                          className={`${badgeFine} ${
                            required
                              ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-brand)_88%,var(--color-foreground))] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
                              : "bg-[color-mix(in_srgb,var(--color-surface-2)_70%,var(--color-surface))] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
                          }`}
                        >
                          {required ? "Obligatoire" : "Optionnel"}
                        </span>
                      </div>
                      <p className={`mt-0.5 ${textCaption}`}>
                        {typeLabel}
                        {options ? ` · ${options.join(", ")}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
          ),
          historique: (
        <section className={card}>
          <SectionHeader
            icon={<History size={16} strokeWidth={1.85} />}
            title="Historique"
            description="Actions importantes sur cette décharge."
          />
          <AuditTimeline events={auditEvents ?? []} />
        </section>
          ),
          versions: (
        <section className={card}>
          <SectionHeader
            icon={<GitBranch size={16} strokeWidth={1.85} />}
            title="Versions"
            description="Chaque signature reste liée à la version acceptée."
          />
          <VersionHistory versions={versions} />
        </section>
          ),
        }}
      />
    </main>
  );
}
