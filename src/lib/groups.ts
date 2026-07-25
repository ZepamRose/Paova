import { shortId } from "@/lib/slug";
import { isMinorsFieldLabel } from "@/lib/submissions/subjects";

export type GroupMemberInput = {
  full_name: string;
  dob?: string | null;
  parent_email?: string | null;
  note?: string | null;
};

export type RosterMode = "minors" | "participants";

type TemplateFieldLike = { label: string; type: string };

/**
 * A décharge with a "Liste de participants" field whose label mentions
 * children (classe, activité enfant…) implies a roster of minors — the CSV
 * should ask for a date of birth. Any other décharge (team building, contrat
 * de location, événement adulte…) is a roster of adults: no date of birth.
 */
export function detectRosterMode(
  fields: TemplateFieldLike[] | null | undefined,
): RosterMode {
  const participantsField = (fields ?? []).find(
    (f) => f.type === "participants",
  );
  if (participantsField && isMinorsFieldLabel(participantsField.label)) {
    return "minors";
  }
  return "participants";
}

export const ROSTER_CSV_FILENAME = "modele-participants-paova.csv";

/** Human-friendly CSV template for roster import, adapted to the roster mode. */
export function buildRosterCsvTemplate(mode: RosterMode): string {
  if (mode === "minors") {
    return `Nom,Prénom,Email,Date de naissance
Dupont,Léa,parent.lea@email.com,12/03/2015
Martin,Tom,parent.tom@email.com,01/08/2014
Bernard,Inès,,15/11/2016
`;
  }
  return `Nom,Prénom,Email
Dupont,Léa,lea.dupont@email.com
Martin,Tom,tom.martin@email.com
Bernard,Inès,
`;
}

export function rosterColumnsHint(mode: RosterMode): string {
  return mode === "minors"
    ? "Colonnes : Nom, Prénom, Email, Date de naissance. Une ligne par participant."
    : "Colonnes : Nom, Prénom, Email. Une ligne par participant.";
}

export function rosterPastePlaceholder(mode: RosterMode): string {
  return mode === "minors"
    ? `Nom,Prénom,Email,Date de naissance\nDupont,Léa,parent.lea@email.com,12/03/2015`
    : `Nom,Prénom,Email\nDupont,Léa,lea.dupont@email.com`;
}

/** Public token for /g/[token] links. */
export function createGroupPublicToken(): string {
  return `g${shortId(12)}`;
}

/** Normalize a person name for search (accent-insensitive, lowercased). */
export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function memberMatchesQuery(
  fullName: string,
  query: string,
): boolean {
  const q = normalizePersonName(query);
  if (!q) return false;
  const name = normalizePersonName(fullName);
  if (name.includes(q)) return true;
  const parts = q.split(" ").filter(Boolean);
  return parts.every((part) => name.includes(part));
}

function headerKey(value: string): string {
  return normalizePersonName(value).replace(/'/g, "").replace(/\s+/g, "");
}

export type ParsedRoster = {
  members: GroupMemberInput[];
  /** Non-empty data rows that produced no usable name and were dropped. */
  skippedRows: number;
  /** Whether a recognizable header row (Nom, Email, Date de naissance…) was found. */
  headerDetected: boolean;
  /** The first data line has more than one column, but no header was recognized —
   * likely means email/dob columns exist but were silently ignored. */
  unrecognizedColumns: boolean;
};

function parseRosterCsvDetailedInternal(raw: string): ParsedRoster {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) {
    return {
      members: [],
      skippedRows: 0,
      headerDetected: false,
      unrecognizedColumns: false,
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return {
      members: [],
      skippedRows: 0,
      headerDetected: false,
      unrecognizedColumns: false,
    };
  }

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const first = splitLine(lines[0]!);
  const headerish = first.map(headerKey);
  const looksLikeHeader = headerish.some((h) =>
    [
      "nom",
      "name",
      "prenom",
      "fullname",
      "email",
      "dob",
      "naissance",
      "datedenaissance",
      "note",
      "lastname",
      "firstname",
    ].includes(h) || h.includes("naissance"),
  );

  let start = 0;
  let idxName = -1;
  let idxFirst = -1;
  let idxLast = -1;
  let idxDob = -1;
  let idxEmail = -1;
  let idxNote = -1;

  if (looksLikeHeader) {
    start = 1;
    headerish.forEach((h, i) => {
      if (h === "prenom" || h === "firstname" || h === "first") idxFirst = i;
      else if (
        h === "lastname" ||
        h === "last" ||
        h === "family" ||
        h === "nomdefamille"
      ) {
        idxLast = i;
      } else if (h === "nom" || h === "name") {
        // French “Nom” = family name when Prénom is also present
        idxName = i;
      } else if (h === "fullname") {
        idxName = i;
      } else if (
        h === "dob" ||
        h === "naissance" ||
        h === "date" ||
        h === "datenaissance" ||
        h.includes("naissance")
      ) {
        idxDob = i;
      } else if (h === "email" || h === "mail" || h === "parent") idxEmail = i;
      else if (h === "note" || h === "allergie" || h === "commentaire") idxNote = i;
    });

    // Nom + Prénom → combine; Nom alone → full name
    if (idxFirst >= 0 && idxName >= 0 && idxLast < 0) {
      idxLast = idxName;
      idxName = -1;
    }
    if (idxName < 0 && idxFirst < 0 && idxLast < 0) idxName = 0;
  } else {
    idxName = 0;
  }

  const out: GroupMemberInput[] = [];
  let skippedRows = 0;
  for (let li = start; li < lines.length; li++) {
    const cells = splitLine(lines[li]!);
    let fullName = "";
    if (idxFirst >= 0 || idxLast >= 0) {
      fullName = [cells[idxFirst] ?? "", cells[idxLast] ?? ""]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
    }
    if (!fullName && idxName >= 0) {
      fullName = (cells[idxName] ?? "").trim();
    }
    if (!fullName) {
      skippedRows += 1;
      continue;
    }
    out.push({
      full_name: fullName,
      dob: idxDob >= 0 ? (cells[idxDob] || null) : null,
      parent_email: idxEmail >= 0 ? (cells[idxEmail] || null) : null,
      note: idxNote >= 0 ? (cells[idxNote] || null) : null,
    });
  }

  return {
    members: out,
    skippedRows,
    headerDetected: looksLikeHeader,
    unrecognizedColumns: !looksLikeHeader && first.length > 1,
  };
}

/**
 * Parse a simple CSV roster.
 * Accepts header row (optional): Nom, Prénom, Email, Date de naissance, note
 * Or a single name column with full name.
 */
export function parseRosterCsv(raw: string): GroupMemberInput[] {
  return parseRosterCsvDetailedInternal(raw).members;
}

/** Same parsing, plus signals used to surface friendly import warnings. */
export function parseRosterCsvDetailed(raw: string): ParsedRoster {
  return parseRosterCsvDetailedInternal(raw);
}

export function downloadRosterCsvTemplate(mode: RosterMode = "participants") {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildRosterCsvTemplate(mode)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ROSTER_CSV_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export type GroupKind = "roster" | "express";

export function isGroupKind(value: unknown): value is GroupKind {
  return value === "roster" || value === "express";
}

/** Auto name for a walk-in session, e.g. "Groupe express — 25 juil. 14:32". */
export function defaultExpressGroupName(now: Date = new Date()): string {
  const when = now.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Groupe express — ${when}`;
}
