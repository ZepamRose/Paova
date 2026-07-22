import {
  History,
  FilePlus2,
  FilePenLine,
  GitBranch,
  ToggleRight,
  ToggleLeft,
  TimerOff,
  Trash2,
  Eye,
  PenLine,
  BadgeCheck,
  FileDown,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import {
  AUDIT_EVENT_LABELS,
  type AuditEventType,
} from "@/lib/audit";

type TimelineEvent = {
  id: string;
  event_type: string;
  actor_kind: string;
  payload: unknown;
  created_at: string;
  submission_id: string | null;
};

function isAuditEventType(value: string): value is AuditEventType {
  return value in AUDIT_EVENT_LABELS;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function EventIcon({ type }: { type: string }) {
  const props = { size: 14, strokeWidth: 1.85, "aria-hidden": true as const };
  switch (type) {
    case "template.created":
      return <FilePlus2 {...props} />;
    case "template.updated":
      return <FilePenLine {...props} />;
    case "template.version_published":
      return <GitBranch {...props} />;
    case "template.activated":
      return <ToggleRight {...props} />;
    case "template.deactivated":
      return <ToggleLeft {...props} />;
    case "template.expired":
      return <TimerOff {...props} />;
    case "template.deleted":
      return <Trash2 {...props} />;
    case "template.link_viewed":
      return <Eye {...props} />;
    case "submission.started":
      return <PenLine {...props} />;
    case "submission.signed":
      return <BadgeCheck {...props} />;
    case "pdf.generated":
      return <FileDown {...props} />;
    case "pdf.downloaded":
      return <Download {...props} />;
    case "export.csv_generated":
      return <FileSpreadsheet {...props} />;
    default:
      return <History {...props} />;
  }
}

function actorLabel(kind: string) {
  if (kind === "owner") return "Vous";
  if (kind === "signer") return "Signataire";
  return "Système";
}

function detailLine(event: TimelineEvent): string | null {
  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};

  const parts: string[] = [];

  if (typeof payload.signer_name === "string" && payload.signer_name) {
    parts.push(payload.signer_name);
  }
  if (typeof payload.reference === "string" && payload.reference) {
    parts.push(payload.reference);
  }
  if (typeof payload.version === "number") {
    parts.push(`Version ${payload.version}`);
  }
  if (typeof payload.row_count === "number") {
    parts.push(
      `${payload.row_count} ligne${payload.row_count === 1 ? "" : "s"}`,
    );
  }
  if (payload.channel === "email_confirmation") {
    parts.push("Envoi email");
  }
  if (payload.channel === "dashboard_download") {
    parts.push("Espace pro");
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AuditTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="mt-5 text-[13px] leading-relaxed text-[var(--color-muted)]">
        Aucun événement pour le moment. Les actions sur cette décharge
        apparaîtront ici automatiquement.
      </p>
    );
  }

  const groups: { day: string; label: string; items: TimelineEvent[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.day !== key) {
      groups.push({
        day: key,
        label: formatDay(event.created_at),
        items: [event],
      });
    } else {
      last.items.push(event);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.day}>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)] first-letter:uppercase">
            {group.label}
          </p>
          <ol className="flex flex-col">
            {group.items.map((event, index) => {
              const label = isAuditEventType(event.event_type)
                ? AUDIT_EVENT_LABELS[event.event_type]
                : event.event_type;
              const detail = detailLine(event);
              const emphasize =
                event.event_type === "submission.signed" ||
                event.event_type === "template.version_published" ||
                event.event_type === "template.created";
              const isLast = index === group.items.length - 1;

              return (
                <li key={event.id} className="flex gap-3.5">
                  {/* Icon rail — stays fully inside the card, no negative offsets */}
                  <div className="relative flex w-8 shrink-0 flex-col items-center">
                    {!isLast ? (
                      <span
                        className="absolute top-8 bottom-0 w-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--color-surface)] ${
                        emphasize
                          ? "border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] text-[var(--color-brand)] shadow-[var(--elev-1)]"
                          : "border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] text-[var(--color-muted)]"
                      }`}
                    >
                      <EventIcon type={event.event_type} />
                    </span>
                  </div>

                  <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
                      <p
                        className={`text-sm tracking-tight ${
                          emphasize
                            ? "font-semibold text-[var(--color-foreground)]"
                            : "font-medium text-[var(--color-foreground)]"
                        }`}
                      >
                        {label}
                      </p>
                      <span className="text-[12px] text-[var(--color-muted)]">
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
                      {actorLabel(event.actor_kind)}
                      {detail ? ` · ${detail}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
