/**
 * resolveGroupSigningState — UNIQUE source of truth for group signing state.
 *
 * Every view in the application MUST call this function instead of computing
 * signed/covered state inline.  A single change here propagates everywhere.
 *
 * Rules
 * ─────
 * • individual mode   → coveredSigned = number of members with signed_submission_id
 * • group_representative mode, rep signed   → coveredSigned = total (all covered)
 * • group_representative mode, rep not yet signed → coveredSigned = 0
 */

export type GroupSigningState = {
  /** Raw signature_mode string from the DB */
  signatureMode: string;
  /** True when the session uses group_representative mode */
  isRepMode: boolean;
  /** True when the representative submission exists (rep mode only) */
  repSigned: boolean;
  /**
   * Number of participants considered "covered".
   * Pass this value as `signed` to any progress-bar / stat-badge component.
   */
  coveredSigned: number;
  /** Total number of participants */
  total: number;
  /** True when every participant is covered */
  allCovered: boolean;
  /** Short human-readable label for the signing status */
  statusLabel: string;
};

export function resolveGroupSigningState(group: {
  requires_signature: boolean;
  /** "individual" | "group_representative" | null/undefined → treated as "individual" */
  signature_mode?: string | null;
  /** Whether the representative submission exists (only meaningful in rep mode) */
  rep_signed?: boolean | null;
  /** Raw signed count from DB (individual mode) */
  signed: number;
  /** Total participant count */
  total: number;
}): GroupSigningState {
  const signatureMode = group.signature_mode ?? "individual";
  const isRepMode = signatureMode === "group_representative";
  const repSigned = isRepMode && group.rep_signed === true;

  // Core rule: in rep mode the representative covers everyone.
  const coveredSigned = isRepMode
    ? repSigned
      ? group.total
      : 0
    : group.signed;

  const allCovered = group.total > 0 && coveredSigned >= group.total;

  // Short status label
  let statusLabel: string;
  if (!group.requires_signature) {
    statusLabel =
      group.total === 0
        ? "Aucun participant"
        : `${group.total} participant${group.total > 1 ? "s" : ""}`;
  } else if (isRepMode) {
    statusLabel = repSigned
      ? "Représentant signé"
      : "En attente du représentant";
  } else if (group.total === 0) {
    statusLabel = "Aucun participant";
  } else {
    statusLabel = `${group.signed}/${group.total} signé${group.signed > 1 ? "s" : ""}`;
  }

  return { signatureMode, isRepMode, repSigned, coveredSigned, total: group.total, allCovered, statusLabel };
}
