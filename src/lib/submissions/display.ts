/**
 * Format submission answers for ops “view details” (without opening the PDF).
 */

export type DisplayField = {
  key: string;
  label: string;
  type: string;
};

export type AnswerDisplayRow =
  | {
      kind: "scalar";
      key: string;
      label: string;
      value: string;
    }
  | {
      kind: "checkbox";
      key: string;
      label: string;
      value: "Oui" | "Non";
    }
  | {
      kind: "subjects";
      key: string;
      label: string;
      subjects: { name: string; dob: string | null; note: string | null }[];
    };

function formatDob(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : trimmed;
}

function scalarValue(raw: unknown): string {
  if (raw == null) return "—";
  const text = String(raw).trim();
  return text || "—";
}

/** Ordered rows matching template fields (same semantics as PDF / CSV). */
export function buildAnswerDisplayRows(
  fields: DisplayField[],
  answers: Record<string, unknown> | null | undefined,
): AnswerDisplayRow[] {
  const data = answers ?? {};
  const rows: AnswerDisplayRow[] = [];

  for (const field of fields) {
    const raw = data[field.key];

    if (field.type === "participants") {
      const subjects = Array.isArray(raw)
        ? raw
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const p = item as { name?: unknown; dob?: unknown; note?: unknown };
              const name = String(p.name ?? "").trim();
              if (!name) return null;
              return {
                name,
                dob: typeof p.dob === "string" ? formatDob(p.dob) : null,
                note:
                  typeof p.note === "string" ? p.note.trim() || null : null,
              };
            })
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
        : [];

      rows.push({
        kind: "subjects",
        key: field.key,
        label: field.label,
        subjects,
      });
      continue;
    }

    if (field.type === "checkbox" || typeof raw === "boolean") {
      rows.push({
        kind: "checkbox",
        key: field.key,
        label: field.label,
        value: raw === true || raw === "true" ? "Oui" : "Non",
      });
      continue;
    }

    rows.push({
      kind: "scalar",
      key: field.key,
      label: field.label,
      value: scalarValue(raw),
    });
  }

  return rows;
}
