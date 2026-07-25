"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { sendGroupReminders, type RemindState } from "./actions";

const initial: RemindState = { error: null };

export function RemindPendingButton({
  groupId,
  pendingWithEmail,
  className,
}: {
  groupId: string;
  pendingWithEmail: number;
  className: string;
}) {
  const [state, action] = useActionState(sendGroupReminders, initial);

  if (pendingWithEmail <= 0) {
    return (
      <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">
        Ajoutez un e-mail aux participants en attente pour pouvoir les
        relancer.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <form action={action}>
        <input type="hidden" name="group_id" value={groupId} />
        <PendingSubmitButton
          className={className}
          idle={`Relancer les en attente (${pendingWithEmail})`}
          pendingLabel="Envoi…"
        />
      </form>
      {state.error === "closed" ? (
        <p className="text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
          Le groupe n&apos;accepte plus de signatures.
        </p>
      ) : state.error === "empty" ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          Aucun e-mail disponible pour les participants en attente.
        </p>
      ) : state.error === "cooldown" ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          Relances déjà envoyées récemment. Réessayez dans 30 minutes.
        </p>
      ) : state.error === "send" ? (
        <p className="text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
          Envoi impossible. Vérifiez RESEND_API_KEY.
        </p>
      ) : state.sent ? (
        <p className="text-[12px] text-[var(--color-brand)]">
          {state.sent} e-mail{state.sent > 1 ? "s" : ""} envoyé
          {state.sent > 1 ? "s" : ""}.
          {state.skipped
            ? ` ${state.skipped} ignoré${state.skipped > 1 ? "s" : ""} (cooldown).`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
