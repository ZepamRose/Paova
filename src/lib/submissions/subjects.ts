/**
 * Extract people listed in `participants` answers for ops views (jour J).
 * Same engine / JSON answers — no separate subject tables.
 */

export type SubmissionSubject = {
  name: string;
  dob: string | null;
  note: string | null;
};

export type SubjectsGroup = {
  fieldKey: string;
  fieldLabel: string;
  mode: "minors" | "participants";
  subjects: SubmissionSubject[];
};

type FieldLike = {
  key: string;
  label: string;
  type: string;
};

/** Exported so other domains (e.g. group roster import) can reuse the same heuristic. */
export function isMinorsFieldLabel(label: string): boolean {
  return /enfant|mineur|élève|eleve/.test(label.toLowerCase());
}

function formatDob(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : trimmed;
}

function parseSubjectItem(item: unknown): SubmissionSubject | null {
  if (!item || typeof item !== "object") return null;
  const row = item as { name?: unknown; dob?: unknown; note?: unknown };
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    dob: typeof row.dob === "string" ? formatDob(row.dob) : null,
    note: typeof row.note === "string" ? row.note.trim() || null : null,
  };
}

export function extractSubjectsFromAnswers(
  fields: FieldLike[],
  answers: Record<string, unknown> | null | undefined,
): SubjectsGroup[] {
  if (!answers) return [];

  const groups: SubjectsGroup[] = [];

  for (const field of fields) {
    if (field.type !== "participants") continue;
    const raw = answers[field.key];
    if (!Array.isArray(raw)) continue;

    const subjects = raw
      .map(parseSubjectItem)
      .filter((s): s is SubmissionSubject => Boolean(s));

    if (subjects.length === 0) continue;

    groups.push({
      fieldKey: field.key,
      fieldLabel: field.label,
      mode: isMinorsFieldLabel(field.label) ? "minors" : "participants",
      subjects,
    });
  }

  return groups;
}

/** Flat list of all subjects across participant fields. */
export function flattenSubjects(groups: SubjectsGroup[]): SubmissionSubject[] {
  return groups.flatMap((group) => group.subjects);
}

export function subjectsAreMinors(groups: SubjectsGroup[]): boolean {
  return groups.some((group) => group.mode === "minors");
}

/** Compact line for list rows, e.g. "Léa Martin, Tom Martin". */
export function formatSubjectsSummary(
  groups: SubjectsGroup[],
  options?: { maxNames?: number },
): string | null {
  const subjects = flattenSubjects(groups);
  if (subjects.length === 0) return null;

  const max = options?.maxNames ?? 4;
  const names = subjects.map((s) => s.name);
  if (names.length <= max) return names.join(", ");
  const rest = names.length - max;
  return `${names.slice(0, max).join(", ")} (+${rest})`;
}

export function formatSubjectsLabel(groups: SubjectsGroup[]): string {
  if (subjectsAreMinors(groups)) {
    const n = flattenSubjects(groups).length;
    return n <= 1 ? "Enfant" : "Enfants";
  }
  const n = flattenSubjects(groups).length;
  return n <= 1 ? "Participant" : "Participants";
}

/** Column / CSV header when context is known (or mixed). */
export function formatSubjectsColumnLabel(
  mode: "minors" | "participants" | "mixed",
): string {
  if (mode === "minors") return "Enfant(s)";
  if (mode === "participants") return "Participant(s)";
  return "Personnes concernées";
}

/** Short ops summary, e.g. "1 enfant concerné" / "3 enfants concernés". */
export function formatSubjectsContextSummary(
  groups: SubjectsGroup[],
): string | null {
  const n = flattenSubjects(groups).length;
  if (n === 0) return null;
  if (subjectsAreMinors(groups)) {
    return n === 1 ? "1 enfant concerné" : `${n} enfants concernés`;
  }
  return n === 1 ? "1 participant concerné" : `${n} participants concernés`;
}

/** Text used for client-side filtering on the waiver signatures list. */
export function subjectsSearchHaystack(groups: SubjectsGroup[]): string {
  return flattenSubjects(groups)
    .flatMap((s) => [s.name, s.dob ?? "", s.note ?? ""])
    .join(" ")
    .toLowerCase();
}
