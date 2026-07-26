"use client";

import { useId, useState } from "react";
import { inviteMember } from "./actions";
import { PendingSubmitButton } from "../../pending-submit-button";

const field =
  "mt-2 h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-background)] px-3.5 text-[14px] text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]";

const ease =
  "transition-[transform,background-color,border-color,box-shadow,filter,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function InviteMemberForm({
  businessId,
  canInviteAdmin,
}: {
  businessId: string;
  canInviteAdmin: boolean;
}) {
  const tipId = useId();
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_95%,var(--color-brand))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_7%,transparent)]">
      <div className="border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Inviter
        </p>
        <h2 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
          Ajouter quelqu&apos;un à l&apos;équipe
        </h2>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--color-muted)]">
          Un email suffit — connexion sans mot de passe, avec le bon accès.
        </p>
      </div>

      <form
        action={inviteMember}
        className="flex flex-col gap-4 px-5 py-5 sm:gap-5 sm:px-6"
      >
        <input type="hidden" name="business_id" value={businessId} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_auto] sm:items-end sm:gap-4">
          <label className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
              Email
            </span>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="collegue@email.fr"
              className={field}
            />
          </label>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="invite-role"
                className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]"
              >
                Rôle
              </label>
              <button
                type="button"
                aria-expanded={tipOpen}
                aria-controls={tipId}
                onClick={() => setTipOpen((v) => !v)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_80%,transparent)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                ?
              </button>
            </div>
            <select
              id="invite-role"
              name="role"
              defaultValue="employee"
              className={field}
            >
              <option value="employee">Collaborateur</option>
              {canInviteAdmin ? (
                <option value="admin">Administrateur</option>
              ) : null}
            </select>
          </div>

          <PendingSubmitButton
            idle="Envoyer l'invitation"
            pendingLabel="Envoi…"
            className={`mt-2 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[13.5px] font-semibold tracking-tight text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] ${ease} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_10px_22px_-12px_color-mix(in_srgb,var(--color-brand)_50%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985] sm:mt-0 sm:w-auto sm:px-5`}
          />
        </div>

        {tipOpen ? (
          <div
            id={tipId}
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_55%,transparent)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-muted)]"
          >
            <p>
              <span className="font-medium text-[var(--color-foreground)]/85">
                Collaborateur
              </span>{" "}
              — fait signer les clients.
            </p>
            <p className="mt-1">
              <span className="font-medium text-[var(--color-foreground)]/85">
                Administrateur
              </span>{" "}
              — gère les décharges, les groupes et l&apos;équipe.
            </p>
          </div>
        ) : null}
      </form>
    </section>
  );
}
