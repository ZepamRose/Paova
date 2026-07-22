type FieldLike = {
  key: string;
  type?: string;
};

/** Pull a phone value from typed tel fields or phone-like answer strings. */
export function extractPhone(
  fields: FieldLike[],
  answers: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    if (field.type === "tel") {
      const raw = answers[field.key];
      const value = String(raw ?? "").trim();
      if (value) return value;
    }
  }

  for (const [key, raw] of Object.entries(answers)) {
    if (key.startsWith("__")) continue;
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      return value;
    }
  }

  return null;
}

/** Flatten answer values into a single searchable string. */
export function flattenAnswersText(
  answers: Record<string, unknown>,
): string | null {
  const parts: string[] = [];

  for (const [key, raw] of Object.entries(answers)) {
    if (key.startsWith("__")) continue;
    if (typeof raw === "string" || typeof raw === "number") {
      const value = String(raw).trim();
      if (value) parts.push(value);
      continue;
    }
    if (typeof raw === "boolean") {
      parts.push(raw ? "oui" : "non");
      continue;
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const p = item as { name?: string; dob?: string; note?: string };
        if (p.name) parts.push(String(p.name));
        if (p.dob) parts.push(String(p.dob));
        if (p.note) parts.push(String(p.note));
      }
    }
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text || null;
}
