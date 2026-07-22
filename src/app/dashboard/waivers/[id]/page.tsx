import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import {
  Share2,
  ScrollText,
  ListChecks,
  PenLine,
  Download,
  Calendar,
  Users,
  Clock,
  History,
  GitBranch,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  effectiveTemplateStatus,
  ensureTemplateNotStale,
  formatExpiresAt,
  isExpirationMode,
  isTemplateStatus,
  type ExpirationMode,
} from "@/lib/templates";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "../../copy-link-button";
import { DeleteWaiverButton } from "../../delete-waiver-button";
import { toggleTemplateActive } from "../actions";
import { SubmissionsList } from "./submissions-list";
import { ExportCsvButton } from "./export-csv-button";
import { AuditTimeline } from "./audit-timeline";
import { VersionHistory } from "./version-history";
import { ExpirationSettings } from "./expiration-settings";
import {
  isWaiverDetailTab,
  WaiverDetailTabs,
  type WaiverDetailTabId,
} from "./waiver-detail-tabs";

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
const motion = `duration-200 ${ease}`;

const card =
  `rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[var(--color-surface)] p-6 shadow-[var(--elev-2)] transition-[box-shadow,border-color] ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_62%,var(--color-muted))] hover:shadow-[var(--elev-3)] sm:p-7`;

/** Primary “Partage” card — one step above secondary cards, same radius/padding. */
const cardFeatured =
  `rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand))] p-6 shadow-[var(--elev-hover)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] transition-[box-shadow,border-color,ring-color] ${motion} hover:border-[color-mix(in_srgb,var(--color-brand)_38%,var(--color-border))] hover:shadow-[var(--elev-hover)] hover:ring-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] sm:p-7 dark:bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-brand))] dark:ring-[color-mix(in_srgb,var(--color-brand)_14%,transparent)]`;

const btnSecondary =
  `inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_72%,var(--color-foreground))] bg-[var(--color-surface)] px-4 text-sm font-medium tracking-tight shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,opacity] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_42%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-65`;

const badgeFine =
  `inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-medium leading-4 tracking-[0.01em] transition-[background-color,color,box-shadow] ${motion}`;

const metaChip =
  `inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_58%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_75%,var(--color-surface-2))] px-2.5 py-1 text-[12px] text-[var(--color-muted)] shadow-[var(--elev-1)] transition-[border-color,background-color,box-shadow] ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_45%,var(--color-muted))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)]`;

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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_17%,var(--color-surface))] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_24%,transparent),var(--elev-1)] dark:bg-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-surface))] dark:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_30%,transparent)]"
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
      <div className="flex min-w-0 items-start gap-3.5">
        <SectionIcon>{icon}</SectionIcon>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--color-foreground)]">
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
  searchParams: Promise<{ welcome?: string; error?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { welcome, error, tab: tabParam } = await searchParams;
  const activeTab: WaiverDetailTabId = isWaiverDetailTab(tabParam)
    ? tabParam
    : "signatures";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, legal_text, fields, public_slug, status, expiration_mode, expiration_days, expires_at, deleted_at, version, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!template || !isTemplateStatus(template.status)) {
    notFound();
  }

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
  const expiresLabel = formatExpiresAt(template.expires_at);

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  const { data: submissions } = await supabase
    .from("submission")
    .select("id, signer_name, signer_email, signed_at")
    .eq("template_id", template.id)
    .order("signed_at", { ascending: false });

  const { data: auditEvents } = await supabase
    .from("audit_event")
    .select(
      "id, event_type, actor_kind, payload, created_at, submission_id",
    )
    .eq("template_id", template.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: versionRows } = await supabase
    .from("waiver_template_version")
    .select(
      "id, version, title, legal_text, fields, signer_name_label, created_at",
    )
    .eq("template_id", template.id)
    .order("version", { ascending: false });

  const { data: proofVersionCounts } = await supabase
    .from("signature_proof")
    .select("template_version")
    .eq("template_id", template.id);

  const signaturesByVersion = new Map<number, number>();
  for (const row of proofVersionCounts ?? []) {
    const v = row.template_version;
    signaturesByVersion.set(v, (signaturesByVersion.get(v) ?? 0) + 1);
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

  const submissionCount = submissions?.length ?? 0;
  const lastSignedAt = submissions?.[0]?.signed_at ?? null;

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-5 py-10 sm:gap-7 sm:px-6 sm:py-12">
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
          href="/dashboard"
          className={`w-fit text-sm text-[var(--color-muted)] transition-colors ${motion} hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
        >
          ← Retour au tableau de bord
        </Link>

        <div className="flex flex-col">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[2rem]">
                {template.title}
              </h1>
              <StatusBadge status={displayStatus} />
              <span
                className={`${badgeFine} gap-1 bg-[color-mix(in_srgb,var(--color-surface-2)_70%,var(--color-surface))] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_60%,transparent)]`}
              >
                <GitBranch size={11} strokeWidth={1.85} aria-hidden />
                Version {template.version ?? 1}
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">
              Décharge de responsabilité
              {expiresLabel
                ? ` · expire le ${expiresLabel}`
                : expirationMode === "none"
                  ? " · sans expiration"
                  : ""}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
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
              {submissionCount} signature{submissionCount === 1 ? "" : "s"}
            </span>
            {lastSignedAt ? (
              <span className={metaChip}>
                <Clock
                  size={12}
                  strokeWidth={1.85}
                  className="opacity-70"
                  aria-hidden
                />
                Dernière signature le {formatDate(lastSignedAt)}
              </span>
            ) : null}
          </div>

          {/* Action bar */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/dashboard/waivers/${template.id}/edit`}
                className={btnSecondary}
              >
                Modifier
              </Link>
              <form action={toggleTemplateActive}>
                <input type="hidden" name="id" value={template.id} />
                <button type="submit" className={btnSecondary}>
                  {toggleLabel}
                </button>
              </form>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span
                className="hidden h-5 w-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] sm:block"
                aria-hidden
              />
              {!template.deleted_at ? (
                <DeleteWaiverButton
                  id={template.id}
                  title={template.title}
                  submissionCount={submissionCount}
                  variant="full"
                />
              ) : null}
            </div>
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

      {!canAcceptSignatures ? (
        <p
          role="status"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3 text-[13px] leading-relaxed text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          {displayStatus === "archived"
            ? "Cette décharge est archivée : elle n’apparaît plus dans le tableau de bord et n’accepte plus de signatures. Les signatures existantes sont conservées. Utilisez Restaurer pour la réactiver."
            : displayStatus === "expired"
              ? "Cette décharge est expirée : le lien public n’accepte plus de nouvelles signatures. Ajustez l’expiration ou réouvrez-la."
              : "Cette décharge est désactivée : le lien public n’accepte plus de nouvelles signatures."}
        </p>
      ) : null}

      {/* Partage — always visible */}
      <section className={`${cardFeatured} animate-fade-up-delay`}>
        <SectionHeader
          icon={<Share2 size={17} strokeWidth={1.85} />}
          title="Partage"
          description="Diffusez le lien ou affichez le QR code à l’accueil."
        />

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <span className={labelCaps}>Lien public</span>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className={`min-w-0 flex-1 truncate rounded-xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_88%,var(--color-surface-2))] px-4 py-3 font-mono text-[13px] text-[var(--color-brand)] shadow-[var(--elev-1)] transition-[border-color,background-color,box-shadow] ${motion} hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
              >
                {publicUrl}
              </a>
              <CopyLinkButton url={publicUrl} />
            </div>
            <p className={textCaption}>
              Vos participants ouvrent ce lien et signent depuis leur téléphone.
            </p>
          </div>

          <div
            className={`flex w-full flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_62%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_50%,var(--color-background))] p-4 shadow-[var(--elev-2)] sm:mx-auto sm:w-auto lg:mx-0 lg:w-[12.5rem] lg:shrink-0 dark:bg-[color-mix(in_srgb,var(--color-surface-2)_65%,var(--color-background))]`}
          >
            <span className={labelCaps}>QR code</span>
            <div className="mx-auto overflow-hidden rounded-xl border border-black/[0.06] bg-white p-3 shadow-[var(--elev-2)] dark:border-white/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR code de la décharge"
                className="h-[8.5rem] w-[8.5rem]"
              />
            </div>
            <a
              href={qrDataUrl}
              download={`qr-${template.public_slug}.png`}
              className={`${btnSecondary} w-full justify-center`}
            >
              <Download size={15} strokeWidth={1.85} aria-hidden />
              Télécharger
            </a>
          </div>
        </div>
      </section>

      <WaiverDetailTabs
        templateId={template.id}
        active={activeTab}
        counts={{
          signatures: submissionCount,
          versions: versions.length,
          historique: auditEvents?.length ?? 0,
        }}
      />

      {activeTab === "signatures" ? (
        <section className={card}>
          <SectionHeader
            icon={<PenLine size={17} strokeWidth={1.85} />}
            title="Signatures collectées"
            description={
              submissionCount === 0
                ? "Les signatures apparaîtront ici dès qu’un participant aura signé."
                : `${submissionCount} signature${submissionCount === 1 ? "" : "s"} enregistrée${submissionCount === 1 ? "" : "s"}.`
            }
            action={
              submissionCount > 0 ? (
                <ExportCsvButton
                  href={`/dashboard/waivers/${template.id}/submissions/export`}
                  className={btnSecondary}
                />
              ) : null
            }
          />

          {submissionCount > 0 ? (
            <p
              role="note"
              className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-background))] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-muted)]"
            >
              Les signatures et preuves restent conservées même si vous archivez
              cette décharge. Exportez le CSV ou téléchargez les PDF pour vos
              dossiers.
            </p>
          ) : null}

          <div className="mt-5">
            <SubmissionsList
              templateId={template.id}
              submissions={submissions ?? []}
            />
          </div>
        </section>
      ) : null}

      {activeTab === "contenu" ? (
        <div className="flex flex-col gap-5">
          <section className={card}>
            <SectionHeader
              icon={<ScrollText size={17} strokeWidth={1.85} />}
              title="Texte juridique"
              description="Le contenu lu et accepté par vos participants."
              action={
                <Link
                  href={`/dashboard/waivers/${template.id}/edit`}
                  className={btnSecondary}
                >
                  Modifier
                </Link>
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
              icon={<ListChecks size={17} strokeWidth={1.85} />}
              title="Champs demandés"
              description="Informations collectées lors de la signature."
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
      ) : null}

      {activeTab === "expiration" ? (
        <section className={card}>
          <SectionHeader
            icon={<Timer size={17} strokeWidth={1.85} />}
            title="Expiration"
            description="Contrôlez jusqu’à quand de nouvelles signatures sont acceptées."
          />
          {expiresLabel ? (
            <p className={`mt-5 ${textSecondary}`}>
              Expiration effective :{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {expiresLabel}
              </span>
            </p>
          ) : (
            <p className={`mt-5 ${textSecondary}`}>
              Aucune date d&apos;expiration définie.
            </p>
          )}
          <ExpirationSettings
            templateId={template.id}
            initialMode={expirationMode}
            initialDays={template.expiration_days}
            initialExpiresAt={template.expires_at}
          />
        </section>
      ) : null}

      {activeTab === "versions" ? (
        <section className={card}>
          <SectionHeader
            icon={<GitBranch size={17} strokeWidth={1.85} />}
            title="Versions"
            description="Chaque signature reste liée à la version exacte acceptée."
          />
          <VersionHistory versions={versions} />
        </section>
      ) : null}

      {activeTab === "historique" ? (
        <section className={card}>
          <SectionHeader
            icon={<History size={17} strokeWidth={1.85} />}
            title="Historique"
            description="Journal des événements liés à cette décharge."
          />
          <AuditTimeline events={auditEvents ?? []} />
        </section>
      ) : null}
    </main>
  );
}
