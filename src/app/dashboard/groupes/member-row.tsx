"use client";

import { useActionState, useEffect, useState } from "react";
import { PendingSubmitButton } from "../pending-submit-button";
import { CopyLinkButton } from "../copy-link-button";
import {
  deleteGroupMember,
  sendGroupReminders,
  updateGroupMember,
  type RemindState,
  type UpdateMemberState,
} from "./actions";

type Member = {
  id: string;
  full_name: string;
  dob: string | null;
  parent_email: string | null;
  note: string | null;
  signed_submission_id: string | null;
  signed_at: string | null;
  reminder_sent_at: string | null;
};

const initialEdit: UpdateMemberState = { error: null };
const initialRemind: RemindState = { error: null };

const field =
  "h-9 w-full rounded-lg border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-surface)] px-2.5 text-[13px] outline-none focus:border-[var(--color-brand)]";

export function MemberRow({
  groupId,
  member,
  canRemind,
  /** V1 relancer: quand fourni, affiche un bouton "Copier lien" par participant non-signé. */
  publicUrl,
}: {
  groupId: string;
  member: Member;
  canRemind: boolean;
  publicUrl?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction] = useActionState(updateGroupMember, initialEdit);
  const [remindState, remindAction] = useActionState(
    sendGroupReminders,
    initialRemind,
  );

  const signed = Boolean(member.signed_submission_id);
  const hasEmail = Boolean(member.parent_email?.includes("@"));

  useEffect(() => {
    if (editState.ok) setEditing(false);
  }, [editState.ok]);

  return (
    <li className="bg-[var(--color-surface)] px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[var(--color-foreground)]">
            {member.full_name}
          </p>
          <p className="truncate text-[12px] text-[var(--color-muted)]">
            {signed
              ? `Signé${member.signed_at ? ` · ${new Date(member.signed_at).toLocaleString("fr-FR")}` : ""}`
              : "En attente"}
            {member.dob ? ` · ${member.dob}` : ""}
            {member.parent_email ? ` · ${member.parent_email}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* V1 relancer: copier le lien de session dans le presse-papiers */}
          {!signed && publicUrl ? (
            <CopyLinkButton
              url={publicUrl}
              size="sm"
              variant="icon"
              className="shrink-0"
            />
          ) : null}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${
              signed
                ? "bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
            }`}
          >
            {signed ? "Signé" : "En attente"}
          </span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[12px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
          >
            {editing ? "Fermer" : "Modifier"}
          </button>
          {!signed && canRemind && hasEmail ? (
            <form action={remindAction}>
              <input type="hidden" name="group_id" value={groupId} />
              <input type="hidden" name="member_id" value={member.id} />
              <PendingSubmitButton
                className="text-[12px] font-medium text-[var(--color-brand)] transition-colors hover:brightness-95 disabled:pointer-events-none disabled:opacity-70"
                idle="Relancer"
                pendingLabel="…"
              />
            </form>
          ) : null}
          {!signed ? (
            <form action={deleteGroupMember}>
              <input type="hidden" name="group_id" value={groupId} />
              <input type="hidden" name="member_id" value={member.id} />
              <PendingSubmitButton
                className="text-[12px] text-[var(--color-muted)] transition-colors hover:text-red-700 disabled:pointer-events-none disabled:opacity-70"
                idle="Retirer"
                pendingLabel="…"
              />
            </form>
          ) : null}
        </div>
      </div>

      {remindState.error === "cooldown" ? (
        <p className="mt-2 text-[12px] text-[var(--color-muted)]">
          Relance déjà envoyée récemment. Réessayez dans 30 minutes.
        </p>
      ) : remindState.error === "send" ? (
        <p className="mt-2 text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
          Envoi impossible. Vérifiez la configuration e-mail.
        </p>
      ) : remindState.sent ? (
        <p className="mt-2 text-[12px] text-[var(--color-brand)]">
          Relance envoyée.
        </p>
      ) : null}

      {editing ? (
        <form action={editAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={member.id} />
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-[var(--color-muted)]">
              Nom complet
            </span>
            <input
              name="full_name"
              required
              defaultValue={member.full_name}
              disabled={signed}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--color-muted)]">
              Date de naissance
            </span>
            <input
              name="dob"
              defaultValue={member.dob ?? ""}
              disabled={signed}
              placeholder="JJ/MM/AAAA"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--color-muted)]">
              E-mail
            </span>
            <input
              name="parent_email"
              type="email"
              defaultValue={member.parent_email ?? ""}
              placeholder="pour les relances"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-[var(--color-muted)]">
              Note
            </span>
            <input
              name="note"
              defaultValue={member.note ?? ""}
              className={field}
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <PendingSubmitButton
              className="inline-flex h-8 items-center rounded-lg bg-[var(--color-brand)] px-3 text-[12.5px] font-medium text-[var(--color-on-brand)] disabled:opacity-70"
              idle="Enregistrer"
              pendingLabel="…"
            />
            {editState.error === "required" ? (
              <span className="text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
                Nom requis.
              </span>
            ) : editState.error === "save" ? (
              <span className="text-[12px] text-[color-mix(in_srgb,#92400e_90%,var(--color-muted))]">
                Enregistrement impossible.
              </span>
            ) : null}
          </div>
        </form>
      ) : null}
    </li>
  );
}
