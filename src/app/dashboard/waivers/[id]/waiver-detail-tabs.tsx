import Link from "next/link";

export type WaiverDetailTabId =
  | "signatures"
  | "contenu"
  | "expiration"
  | "versions"
  | "historique";

const TABS: { id: WaiverDetailTabId; label: string }[] = [
  { id: "signatures", label: "Signatures" },
  { id: "contenu", label: "Contenu" },
  { id: "expiration", label: "Expiration" },
  { id: "versions", label: "Versions" },
  { id: "historique", label: "Historique" },
];

export function isWaiverDetailTab(value: unknown): value is WaiverDetailTabId {
  return (
    typeof value === "string" &&
    TABS.some((tab) => tab.id === value)
  );
}

export function WaiverDetailTabs({
  templateId,
  active,
  counts,
}: {
  templateId: string;
  active: WaiverDetailTabId;
  counts?: Partial<Record<WaiverDetailTabId, number>>;
}) {
  return (
    <nav
      aria-label="Sections de la décharge"
      className="-mx-1 overflow-x-auto px-1"
    >
      <ul className="flex min-w-max gap-1 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,var(--color-background))] p-1">
        {TABS.map((tab) => {
          const selected = tab.id === active;
          const count = counts?.[tab.id];
          const href =
            tab.id === "signatures"
              ? `/dashboard/waivers/${templateId}`
              : `/dashboard/waivers/${templateId}?tab=${tab.id}`;

          return (
            <li key={tab.id}>
              <Link
                href={href}
                scroll={false}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium tracking-tight transition-[background-color,color,box-shadow] duration-200 ${
                  selected
                    ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-[var(--elev-1)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                }`}
                aria-current={selected ? "page" : undefined}
              >
                {tab.label}
                {typeof count === "number" ? (
                  <span
                    className={`tabular-nums text-[11px] ${
                      selected
                        ? "text-[var(--color-brand)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
