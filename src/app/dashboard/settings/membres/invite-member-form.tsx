"use client";

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
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_95%,var(--color-brand))] shadow-[var(--elev-2)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_7%,transparent)]">
      <div className="border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-4 sm:px-6">
        <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
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

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)_auto] sm:items-end sm:gap-4">
          <label className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]">
              Nom
            </span>
            <input
              id="invite-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={80}
              placeholder="Laura Dubois"
              className={field}
            />
          </label>

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
            {/* Le point d'interrogation a disparu : le comparatif des rôles
                est affiché en clair juste sous ce formulaire. */}
            <label
              htmlFor="invite-role"
              className="text-[13px] font-medium tracking-tight text-[var(--color-foreground)]"
            >
              Rôle
            </label>
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
            className={`mt-2 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] px-4 text-[13px] font-semibold tracking-tight text-[var(--color-brand)] shadow-[var(--elev-1)] ${ease} hover:border-[color-mix(in_srgb,var(--color-brand)_42%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_13%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.985] sm:mt-0 sm:w-auto sm:px-4`}
          />
        </div>

      </form>
    </section>
  );
}
