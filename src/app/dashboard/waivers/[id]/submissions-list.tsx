"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";

type Submission = {
  id: string;
  signer_name: string;
  signer_email: string | null;
  signed_at: string;
};

function PdfDownloadButton({ href }: { href: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("PDF failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? "decharge.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.location.assign(href);
    } finally {
      window.setTimeout(() => setBusy(false), 280);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? "Préparation du PDF…" : "Télécharger le PDF"}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,#c45c5c_18%,var(--color-border))] bg-[color-mix(in_srgb,#c45c5c_5%,var(--color-surface))] px-3 text-[13px] font-medium text-[#a84848] shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,opacity] duration-[180ms] hover:-translate-y-px hover:border-[color-mix(in_srgb,#c45c5c_28%,var(--color-border))] hover:bg-[color-mix(in_srgb,#c45c5c_8%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,#c45c5c_35%,transparent)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-70 dark:border-[color-mix(in_srgb,#e8a0a0_22%,var(--color-border))] dark:bg-[color-mix(in_srgb,#e8a0a0_8%,var(--color-surface))] dark:text-[#e8b4b4] dark:hover:bg-[color-mix(in_srgb,#e8a0a0_12%,var(--color-surface))]"
    >
      {busy ? (
        <>
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          PDF…
        </>
      ) : (
        <>
          <FileDown size={14} strokeWidth={1.85} aria-hidden />
          PDF
        </>
      )}
    </button>
  );
}

export function SubmissionsList({
  templateId,
  submissions,
}: {
  templateId: string;
  submissions: Submission[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const name = s.signer_name?.toLowerCase() ?? "";
      const email = s.signer_email?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q);
    });
  }, [query, submissions]);

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_38%,var(--color-background))] px-6 py-10 text-center dark:bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-background))]">
        <p className="text-sm font-medium tracking-tight text-[var(--color-foreground)]">
          Aucune signature pour l&apos;instant
        </p>
        <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-muted)]">
          Partagez le lien public ou le QR code ci-dessus pour commencer à
          collecter des signatures.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]/65"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="min-h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-background)_88%,var(--color-surface-2))] py-2.5 pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--color-muted)]/55 hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] focus-visible:border-[var(--color-brand)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-6 py-8 text-center text-sm text-[var(--color-muted)]">
          Aucun résultat pour «&nbsp;{query}&nbsp;».
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] shadow-[var(--elev-1)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_9.5rem_auto] gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-background))] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)] sm:grid dark:bg-[color-mix(in_srgb,var(--color-surface-2)_55%,var(--color-background))]">
            <span>Signataire</span>
            <span>Date</span>
            <span className="sr-only">Actions</span>
          </div>
          <ul className="divide-y divide-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[var(--color-surface)]">
            {filtered.map((s) => {
              const pdfHref = `/dashboard/waivers/${templateId}/submissions/${s.id}/pdf`;
              const dateLabel = new Date(s.signed_at).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <li
                  key={s.id}
                  className="group grid grid-cols-1 items-center gap-3 px-3.5 py-3 transition-[background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_48%,transparent)] sm:grid-cols-[minmax(0,1fr)_9.5rem_auto] sm:gap-3 sm:px-4 sm:py-3 dark:hover:bg-[color-mix(in_srgb,var(--color-surface-2)_55%,transparent)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface))] text-[11px] font-semibold text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                      aria-hidden
                    >
                      {(s.signer_name?.trim()?.charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium tracking-tight text-[var(--color-foreground)]">
                        {s.signer_name}
                      </p>
                      <p className="truncate text-[12px] text-[var(--color-muted)]">
                        {s.signer_email || "Sans email"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--color-muted)] sm:hidden">
                        {dateLabel}
                      </p>
                    </div>
                  </div>

                  <p className="hidden text-[13px] tabular-nums text-[var(--color-muted)] sm:block">
                    {dateLabel}
                  </p>

                  <div className="flex items-center justify-end">
                    <PdfDownloadButton href={pdfHref} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
