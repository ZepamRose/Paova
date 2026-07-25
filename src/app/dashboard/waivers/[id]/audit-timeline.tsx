import {
  History,
  FilePlus2,
  FilePenLine,
  GitBranch,
  ToggleRight,
  ToggleLeft,
  TimerOff,
  Archive,
  Eye,
  PenLine,
  BadgeCheck,
  FileDown,
  Download,
  FileSpreadsheet,
  CalendarClock,
  QrCode,
} from "lucide-react";
import {
  isTimelineStoryEvent,
  resolveAuditDescription,
  resolveAuditTitle,
  resolveTimelineCategory,
  type TimelineCategory,
} from "@/lib/audit";
import { ScrollablePanel } from "./scrollable-panel";

type TimelineEvent = {
  id: string;
  event_type: string;
  actor_kind: string;
  payload: unknown;
  created_at: string;
  submission_id: string | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
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

/** Drop redundant PDF pairs already stored (généré + téléchargé). */
function dedupePdfPairs(events: TimelineEvent[]): TimelineEvent[] {
  const skip = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    if (a.event_type !== "pdf.downloaded" || !a.submission_id) continue;

    for (let j = i + 1; j < Math.min(i + 4, events.length); j++) {
      const b = events[j];
      if (
        b.event_type === "pdf.generated" &&
        b.submission_id === a.submission_id
      ) {
        const dt =
          Math.abs(
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          ) / 1000;
        if (dt < 30) {
          skip.add(b.id);
          break;
        }
      }
    }
  }

  return events.filter((e) => !skip.has(e.id));
}

function EventIcon({ type, payload }: { type: string; payload: unknown }) {
  const props = { size: 14, strokeWidth: 1.85, "aria-hidden": true as const };
  const p =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  if (
    type === "template.updated" &&
    ("signature_hours_enabled" in p || "signature_timezone" in p)
  ) {
    return <CalendarClock {...props} />;
  }

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
    case "template.archived":
      return <Archive {...props} />;
    case "template.link_viewed":
      return <Eye {...props} />;
    case "template.qr_downloaded":
      return <QrCode {...props} />;
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

function isEmphasized(type: string, payload: unknown): boolean {
  if (
    type === "submission.signed" ||
    type === "template.version_published" ||
    type === "template.created"
  ) {
    return true;
  }
  const p =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  if (
    type === "template.updated" &&
    ("signature_hours_enabled" in p || "expiration_mode" in p)
  ) {
    return true;
  }
  return false;
}

/** Very subtle icon-ring tint by category — not a rainbow UI. */
function categoryRingClass(
  category: TimelineCategory,
  emphasize: boolean,
): string {
  if (emphasize) {
    return "border-[color-mix(in_srgb,var(--color-brand)_38%,var(--color-border))] text-[var(--color-brand)] shadow-[var(--elev-1)]";
  }
  switch (category) {
    case "signature":
      return "border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] text-[color-mix(in_srgb,var(--color-brand)_72%,var(--color-muted))]";
    case "share":
      return "border-[color-mix(in_srgb,var(--color-border)_88%,#64748b)] text-[color-mix(in_srgb,var(--color-muted)_88%,#64748b)]";
    case "version":
      return "border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] text-[color-mix(in_srgb,var(--color-muted)_70%,var(--color-foreground))]";
    default:
      return "border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] text-[var(--color-muted)]";
  }
}

export function AuditTimeline({ events }: { events: TimelineEvent[] }) {
  const storyRaw = events.filter((e) => isTimelineStoryEvent(e.event_type));
  const storyEvents = dedupePdfPairs(storyRaw);
  const omittedCount = events.length - storyRaw.length;

  if (storyEvents.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,var(--color-background))] px-5 py-8 text-center">
        <p className="text-sm font-medium tracking-tight">
          Aucun événement pour l&apos;instant
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-muted)]">
          Les actions importantes — signatures, versions, exports — apparaîtront
          ici. Les simples consultations du lien restent dans les statistiques.
        </p>
      </div>
    );
  }

  const groups: { day: string; label: string; items: TimelineEvent[] }[] = [];
  for (const event of storyEvents) {
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
    <div className="mt-5 flex flex-col gap-3">
      <ScrollablePanel>
        <div className="flex flex-col gap-7 pr-1">
          {groups.map((group) => (
            <div key={group.day}>
              <p className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)] first-letter:uppercase">
                {group.label}
              </p>
              <ol className="flex flex-col">
                {group.items.map((event, index) => {
                  const title = resolveAuditTitle(
                    event.event_type,
                    event.payload,
                  );
                  const description = resolveAuditDescription(
                    event.event_type,
                    event.actor_kind,
                    event.payload,
                  );
                  const emphasize = isEmphasized(
                    event.event_type,
                    event.payload,
                  );
                  const category = resolveTimelineCategory(
                    event.event_type,
                    event.payload,
                  );
                  const isLast = index === group.items.length - 1;

                  return (
                    <li key={event.id} className="flex gap-3.5">
                      <div className="relative flex w-9 shrink-0 flex-col items-center">
                        {!isLast ? (
                          <span
                            className="absolute top-9 bottom-0 w-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]"
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--color-surface)] ${categoryRingClass(category, emphasize)}`}
                        >
                          <EventIcon
                            type={event.event_type}
                            payload={event.payload}
                          />
                        </span>
                      </div>

                      <div
                        className={`min-w-0 flex-1 ${isLast ? "pb-0.5" : "pb-5"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 pt-1">
                          <p
                            className={`text-[14px] tracking-tight ${
                              emphasize
                                ? "font-semibold text-[var(--color-foreground)]"
                                : "font-medium text-[var(--color-foreground)]"
                            }`}
                          >
                            {title}
                          </p>
                          <time
                            dateTime={event.created_at}
                            className="shrink-0 text-[12px] font-medium tabular-nums text-[var(--color-muted)]"
                          >
                            {formatTime(event.created_at)}
                          </time>
                        </div>
                        {description ? (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                            {description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </ScrollablePanel>

      {omittedCount > 0 ? (
        <p className="text-[12px] text-[var(--color-muted)]/75">
          Les visites du lien ne sont pas listées ici — elles restent dans les
          statistiques.
        </p>
      ) : null}
    </div>
  );
}
