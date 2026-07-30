/**
 * "Dernière activité" — the one temporal fact worth a column.
 *
 * It replaces Statut and Ajouté le together. "Actif" only ever restated what
 * the absence of a pending badge already said, and a join date answers a
 * question nobody asks twice. What a manager actually wants to know is whether
 * an account is still in use — and that is the last sign-in.
 *
 * Pending invites short-circuit: they have no sign-in to report, and "jamais
 * connecté" would read as a problem rather than as a normal waiting state.
 */
export type MemberActivityInput = {
  status: string;
  lastSignInAt: string | null;
};

const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Calendar days between two instants, ignoring the time of day. */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function formatMemberActivity(
  input: MemberActivityInput,
  now: Date = new Date(),
): string {
  if (input.status === "invited") return "Invitation en attente";
  if (input.status === "disabled") return "Accès désactivé";

  const raw = (input.lastSignInAt ?? "").trim();
  if (!raw) return "Jamais connecté";

  const seen = new Date(raw);
  if (Number.isNaN(seen.getTime())) return "Jamais connecté";

  const days = calendarDaysBetween(seen, now);
  // A clock skew or a sign-in mid-request can land microseconds in the future;
  // reading "dans 0 jour" would be absurd, so treat it as just now.
  if (days <= 0) return `Aujourd'hui à ${TIME_FMT.format(seen)}`;
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 14) return "Il y a une semaine";
  if (days < 31) return `Il y a ${Math.floor(days / 7)} semaines`;
  return DATE_FMT.format(seen);
}

/** True when the row deserves the muted treatment rather than a live one. */
export function isDormantActivity(input: MemberActivityInput): boolean {
  return input.status !== "active" || !input.lastSignInAt;
}
