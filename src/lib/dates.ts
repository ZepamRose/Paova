/**
 * Shared French date formatting.
 *
 * These helpers were copy-pasted across dashboard components; a fix applied to
 * one copy silently left the others behind. Keep them here.
 */

/**
 * Relative time in French: "à l'instant", "il y a 12 min", "hier", then an
 * absolute short date past a week. Returns null for missing/invalid input so
 * callers can omit the line entirely.
 */
export function formatRelativeFr(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Short absolute date: "3 juil. 2026". */
export function formatShortDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Long absolute date: "3 juillet 2026". */
export function formatLongDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
