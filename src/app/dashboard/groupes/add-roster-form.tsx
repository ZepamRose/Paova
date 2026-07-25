"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { RosterMode } from "@/lib/groups";
import { PendingSubmitButton } from "../pending-submit-button";
import { RosterImport } from "./roster-import";
import { addGroupMembers, type AddMembersState } from "./actions";

const initialState: AddMembersState = { error: null };

export function AddRosterForm({
  groupId,
  mode,
}: {
  groupId: string;
  mode: RosterMode;
}) {
  const [state, formAction] = useActionState(addGroupMembers, initialState);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!state.count) return;
    setShowSuccess(true);
    const t = window.setTimeout(() => setShowSuccess(false), 5000);
    return () => window.clearTimeout(t);
    // Re-run on every new action result (new object), not just when the
    // count value happens to differ from the previous submission.
  }, [state]);

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="group_id" value={groupId} />
      <RosterImport reassure={false} mode={mode} />

      {state.error === "roster" ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Ajoutez au moins un participant (fichier ou texte collé) avant de
          valider.
        </p>
      ) : state.error === "add" ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Impossible d&apos;ajouter ces participants. Réessayez.
        </p>
      ) : state.count && showSuccess ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] font-medium text-[color-mix(in_srgb,var(--color-brand)_88%,var(--color-foreground))]">
          <Check size={14} strokeWidth={2.4} aria-hidden />
          {state.count} participant{state.count > 1 ? "s" : ""} ajouté
          {state.count > 1 ? "s" : ""}.
        </p>
      ) : null}

      <PendingSubmitButton
        className="mt-4 inline-flex h-10 min-w-[9.5rem] items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-[1.03] disabled:pointer-events-none disabled:opacity-80"
        idle="Ajouter au groupe"
        pendingLabel="Ajout en cours…"
      />
    </form>
  );
}
