"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { addGroupMembers, type AddMembersState } from "./actions";

const initialState: AddMembersState = { error: null };

export function AddParticipantForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addGroupMembers, initialState);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="group_id" value={groupId} />
        <input
          name="full_name"
          placeholder="Nom complet"
          className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none focus:border-[var(--color-brand)]"
        />
        <input
          name="parent_email"
          type="email"
          placeholder="E-mail (relances)"
          className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none focus:border-[var(--color-brand)] sm:max-w-[14rem]"
        />
        <PendingSubmitButton
          className="inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-medium text-[var(--color-on-brand)] transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-[1.03] disabled:pointer-events-none disabled:opacity-80"
          idle="Ajouter"
          pendingLabel="Ajout…"
        />
      </form>
      {state.error === "roster" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Indiquez un nom complet.
        </p>
      ) : state.error === "add" ? (
        <p
          role="alert"
          className="rounded-xl border border-[color-mix(in_srgb,#b45309_25%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-3.5 py-2.5 text-[13px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]"
        >
          Impossible d&apos;ajouter ce participant. Réessayez.
        </p>
      ) : state.count ? (
        <p
          role="status"
          className="text-[12.5px] text-[var(--color-brand)]"
        >
          Participant ajouté.
        </p>
      ) : null}
    </div>
  );
}
