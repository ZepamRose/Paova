import type { SubmissionSearchRow } from "./query";

function formatDob(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

export function csvCell(value: unknown): string {
  let s: string;
  if (typeof value === "boolean") {
    s = value ? "Oui" : "Non";
  } else if (Array.isArray(value)) {
    s = value
      .map((item) => {
        const p = item as { name?: string; dob?: string; note?: string };
        const parts = [String(p?.name ?? "").trim()];
        if (p?.dob) parts.push(`né(e) le ${formatDob(String(p.dob))}`);
        if (p?.note) parts.push(String(p.note));
        return parts.filter(Boolean).join(" — ");
      })
      .filter(Boolean)
      .join("; ");
  } else {
    s = String(value ?? "");
  }
  return `"${s.replace(/"/g, '""')}"`;
}

/** Compact CSV from search index rows (cross-template exports). */
export function buildSearchIndexCsv(rows: SubmissionSearchRow[]): string {
  const header = [
    "Nom",
    "Email",
    "Téléphone",
    "Date de signature",
    "Décharge",
    "Établissement",
    "Référence preuve",
    "Version",
    "Empreinte SHA-256",
    "Statut",
  ];

  const body = rows.map((r) =>
    [
      csvCell(r.signer_name),
      csvCell(r.signer_email),
      csvCell(r.phone),
      csvCell(new Date(r.signed_at).toLocaleString("fr-FR")),
      csvCell(r.template_title),
      csvCell(r.business_name),
      csvCell(r.proof_reference),
      csvCell(r.template_version),
      csvCell(r.content_sha256),
      csvCell(r.status === "signed" ? "Signée" : r.status),
    ].join(","),
  );

  return `\uFEFF${[header.map(csvCell).join(","), ...body].join("\r\n")}`;
}
