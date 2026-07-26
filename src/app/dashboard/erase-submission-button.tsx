"use client";

import { useState } from "react";
import { eraseSubmission } from "./submissions/actions";
import { PendingSubmitButton } from "./pending-submit-button";

const MOTION = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * GDPR erasure trigger. Two-step on purpose: the deletion is irreversible and
 * destroys the legal proof dossier along with the personal data, so a single
 * misclick must never be enough.
 */
export function EraseSubmissionButton({
  submissionId,
  signerName,
  returnTo = "signatures",
}: {
  submissionId: string;
  signerName: string;
  returnTo?: "waiver" | "signatures";
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-[var(--color-muted)] transition-[color,background-color] ${MOTION} hover:bg-[color-mix(in_srgb,#dc2626_8%,transparent)] hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/40 dark:hover:text-red-400`}
      >
        Effacer les données
      </button>
    );
  }

  return (
    <form
      action={eraseSubmission}
      className="flex w-full flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,#dc2626_28%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_6%,var(--color-surface))] px-3.5 py-3"
    >
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-[12.5px] leading-relaxed text-[var(--color-foreground)]">
        Effacer définitivement les données de{" "}
        <span className="font-semibold">{signerName}</span> ? La signature, le
        PDF et le dossier de preuve seront supprimés. Cette action est
        irréversible.
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex h-8 items-center rounded-lg px-2.5 text-[12.5px] font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        >
          Annuler
        </button>
        <PendingSubmitButton
          idle="Effacer définitivement"
          pendingLabel="Effacement…"
          className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-[12.5px] font-semibold text-white transition-[filter,transform] duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 active:scale-[0.98] disabled:opacity-60"
        />
      </div>
    </form>
  );
}
