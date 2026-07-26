"use client";

import { MemberActionsMenu } from "./member-actions-menu";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  employee: "Collaborateur",
};

function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function statusLabel(status: string): string {
  if (status === "invited") return "Invitation en attente";
  if (status === "disabled") return "Désactivé";
  return "Compte actif";
}

export function MemberRow({
  businessId,
  id,
  role,
  status,
  email,
  isSelf,
  canManage,
  canAssignAdmin,
  loginUrl,
  isLast = false,
}: {
  businessId: string;
  id: string;
  role: string;
  status: string;
  email: string | null;
  isSelf: boolean;
  canManage: boolean;
  canAssignAdmin: boolean;
  loginUrl: string;
  isLast?: boolean;
}) {
  const isOwner = role === "owner";
  const isInvited = status === "invited";
  const isDisabled = status === "disabled";
  const showMenu =
    canManage &&
    !isOwner &&
    !isSelf &&
    (canAssignAdmin || role === "employee");
  const showStatus = !isSelf || isInvited || isDisabled;

  return (
    <li
      className={`group flex items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-[0.95rem] ${
        isLast
          ? ""
          : "border-b border-[color-mix(in_srgb,var(--color-border)_52%,transparent)]"
      } ${
        isInvited
          ? "bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface-2)_28%,transparent)]"
          : isDisabled
            ? "bg-[color-mix(in_srgb,var(--color-surface-2)_28%,transparent)]"
            : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] text-[11.5px] font-semibold tracking-tight ${
            isOwner
              ? "bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface-2))] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
              : isInvited || isDisabled
                ? "bg-[var(--color-surface-2)] text-[var(--color-muted)]/75 ring-1 ring-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]/70 ring-1 ring-[color-mix(in_srgb,var(--color-border)_50%,transparent)]"
          }`}
        >
          {initialsFromEmail(email)}
        </span>

        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
            {email ?? "—"}
            {isSelf ? (
              <span className="ml-1.5 text-[12.5px] font-normal text-[var(--color-muted)]">
                vous
              </span>
            ) : null}
          </p>
          {showStatus ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[var(--color-muted)]">
              {isInvited ? (
                <>
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_50%,var(--color-muted))]"
                  />
                  Invitation en attente
                </>
              ) : (
                statusLabel(status)
              )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={
            isOwner
              ? "inline-flex h-8 items-center rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_26%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] px-2.5 text-[12px] font-semibold tracking-tight text-[var(--color-brand)]"
              : "inline-flex h-8 max-w-[9.5rem] items-center truncate rounded-lg bg-[var(--color-surface-2)] px-2.5 text-[12px] font-medium text-[var(--color-muted)]"
          }
        >
          {ROLE_LABEL[role] ?? role}
        </span>

        {showMenu ? (
          <MemberActionsMenu
            businessId={businessId}
            id={id}
            role={role}
            status={status}
            email={email}
            canAssignAdmin={canAssignAdmin}
            loginUrl={loginUrl}
          />
        ) : null}
      </div>
    </li>
  );
}
