"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MemberActionsMenu } from "./member-actions-menu";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propri\u00e9taire",
  admin: "Administrateur",
  employee: "Collaborateur",
};

function initialsFromIdentity(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/[\s._\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function statusLabel(status: string): string {
  if (status === "invited") return "Invitation en attente";
  if (status === "disabled") return "D\u00e9sactiv\u00e9";
  return "Compte actif";
}

export function MemberRow({
  businessId,
  id,
  role,
  status,
  name,
  email,
  isSelf,
  canManage,
  canAssignAdmin,
  loginUrl,
  isLast = false,
  viewerIsOwner = false,
}: {
  businessId: string;
  id: string;
  role: string;
  status: string;
  name: string | null;
  email: string | null;
  isSelf: boolean;
  canManage: boolean;
  canAssignAdmin: boolean;
  loginUrl: string;
  isLast?: boolean;
  /** Enables the ownership handover entry - owner only. */
  viewerIsOwner?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const isOwner = role === "owner";
  const isInvited = status === "invited";
  const isDisabled = status === "disabled";
  const canManageTarget =
    canManage &&
    !isOwner &&
    !isSelf &&
    (canAssignAdmin || role === "employee");
  const displayName =
    name?.trim() ||
    (isSelf
      ? "Vous"
      : isInvited
        ? "Invitation en attente"
        : "Membre de l'\u00e9quipe");
  const emailLabel = email ?? "Adresse e-mail indisponible";

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex items-start justify-between gap-2.5 px-4 py-3.5 transition-colors duration-[180ms] sm:items-center sm:gap-4 sm:px-5 sm:py-[0.95rem] ${
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
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
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
          {initialsFromIdentity(name, email)}
        </span>

        <div className="min-w-0">
          <p className="break-words text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
            {displayName}
            {isSelf && name?.trim() ? (
              <span className="ml-1.5 text-[12.5px] font-normal text-[var(--color-muted)]">
                vous
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 break-all text-[12.5px] leading-5 text-[var(--color-muted)]">
            {emailLabel}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-[var(--color-muted)]">
            <span
              className={
                isOwner
                  ? "inline-flex h-6 items-center rounded-md border border-[color-mix(in_srgb,var(--color-brand)_26%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] px-2 text-[11px] font-semibold tracking-tight text-[var(--color-brand)] sm:hidden"
                  : "inline-flex h-6 items-center rounded-md bg-[var(--color-surface-2)] px-2 text-[11px] font-medium text-[var(--color-muted)] sm:hidden"
              }
            >
              {ROLE_LABEL[role] ?? role}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  isInvited
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_50%,var(--color-muted))]"
                    : isDisabled
                      ? "bg-[var(--color-muted)]/55"
                      : "bg-emerald-500/75"
                }`}
              />
              {statusLabel(status)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span
          className={
            isOwner
              ? "hidden h-8 items-center rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_26%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] px-2.5 text-[12px] font-semibold tracking-tight text-[var(--color-brand)] sm:inline-flex"
              : "hidden h-8 max-w-[9.5rem] items-center truncate rounded-lg bg-[var(--color-surface-2)] px-2.5 text-[12px] font-medium text-[var(--color-muted)] sm:inline-flex"
          }
        >
          {ROLE_LABEL[role] ?? role}
        </span>

        <MemberActionsMenu
          businessId={businessId}
          id={id}
          role={role}
          status={status}
          name={name}
          email={email}
          canManageTarget={canManageTarget}
          canAssignAdmin={canAssignAdmin}
          loginUrl={loginUrl}
          canTransferOwnership={
            canManageTarget && viewerIsOwner && status === "active"
          }
        />
      </div>
    </motion.li>
  );
}
