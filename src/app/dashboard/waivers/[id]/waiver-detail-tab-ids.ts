export type WaiverDetailTabId =
  | "signatures"
  | "contenu"
  | "historique"
  | "versions";

export const WAIVER_DETAIL_TABS: { id: WaiverDetailTabId; label: string }[] = [
  { id: "signatures", label: "Signatures" },
  { id: "contenu", label: "Contenu" },
  { id: "historique", label: "Historique" },
  { id: "versions", label: "Versions" },
];

export function isWaiverDetailTab(value: unknown): value is WaiverDetailTabId {
  return (
    typeof value === "string" &&
    WAIVER_DETAIL_TABS.some((tab) => tab.id === value)
  );
}

export function waiverDetailTabHref(
  templateId: string,
  tab: WaiverDetailTabId,
) {
  return tab === "signatures"
    ? `/dashboard/waivers/${templateId}`
    : `/dashboard/waivers/${templateId}?tab=${tab}`;
}
