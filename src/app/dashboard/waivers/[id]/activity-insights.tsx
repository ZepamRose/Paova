import { formatRelativeActivityFr } from "@/lib/audit";
import type { TemplateActivityStats } from "@/lib/audit";

function Insight({
  label,
  primary,
  detail,
}: {
  label: string;
  primary: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-surface-2)_42%,var(--color-background))] px-3.5 py-3.5 transition-[background-color,transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--color-surface-2)_58%,var(--color-background))] hover:shadow-[var(--elev-1)]">
      <p className="text-[1.35rem] font-semibold tracking-tight tabular-nums leading-none text-[var(--color-foreground)]">
        {primary}
      </p>
      <p className="mt-2 text-[12px] font-medium leading-snug text-[var(--color-foreground)]/75">
        {label}
      </p>
      <p className="mt-1 text-[11.5px] leading-snug text-[var(--color-muted)]/85">
        {detail}
      </p>
    </div>
  );
}

export function ActivityInsights({
  activity,
  currentVersionCreatedAt,
  className,
}: {
  activity: TemplateActivityStats;
  currentVersionCreatedAt: string | null;
  className?: string;
}) {
  const lastView = formatRelativeActivityFr(activity.lastLinkViewedAt);
  const lastSig = formatRelativeActivityFr(activity.lastSignatureAt);
  const lastEdit = formatRelativeActivityFr(activity.lastUpdatedAt);

  const versionDays = currentVersionCreatedAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(currentVersionCreatedAt).getTime()) /
            86_400_000,
        ),
      )
    : null;

  const items: { label: string; primary: string; detail: string }[] = [
    {
      label: "Visites du lien",
      primary: activity.linkViews === 0 ? "0" : `${activity.linkViews}`,
      detail:
        activity.linkViews === 0
          ? "Pas encore ouvert"
          : lastView
            ? `Dernière ${lastView}`
            : "Activité récente",
    },
    {
      label: "Dernière signature",
      primary: lastSig ?? "—",
      detail: lastSig ? "Signature reçue" : "En attente",
    },
    {
      label: "Dernière modification",
      primary: lastEdit
        ? lastEdit
        : versionDays === null
          ? "—"
          : versionDays === 0
            ? "Aujourd’hui"
            : `Il y a ${versionDays} j`,
      detail: lastEdit
        ? "Contenu ou réglages"
        : versionDays === null
          ? "Aucun changement"
          : "Version actuelle",
    },
  ];

  return (
    <div className={className ?? "grid gap-2 sm:grid-cols-3"}>
      {items.map((item) => (
        <Insight
          key={item.label}
          label={item.label}
          primary={item.primary}
          detail={item.detail}
        />
      ))}
    </div>
  );
}
