"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MemberActionsMenu } from "./member-actions-menu";
import { RoleBadge, type RoleId } from "./roles";

function initialsFromIdentity(name: string | null): string {
  const source = name?.trim() || "?";
  const parts = source.split(/[\s._\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatLastActivity(iso: string | null): string {
  if (!iso) return "Jamais connecté";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Jamais connecté";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay === 0) {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `Aujourd'hui à ${h}:${m}`;
  }
  if (diffDay === 1) return "Hier";
  if (diffDay < 7) return `Il y a ${diffDay} jours`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Avatar carries the role colour — same three colours as everywhere else.
 */
const AVATAR_TONE: Record<RoleId, string> = {
  owner:
    "bg-emerald-500/14 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  admin: "bg-blue-500/14 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  employee:
    "bg-violet-500/14 text-violet-700 ring-violet-500/25 dark:text-violet-300",
};

const CELL = "px-3 py-2 align-middle sm:px-4";

/**
 * One row of the team table.
 *
 * Columns: Nom · Rôle · Dernière activité · Actions
 *
 * Email is never shown in the table — only accessible via ⋮ → Voir l'adresse e-mail.
 */
export function MemberRow({
  businessId,
  id,
  role,
  status,
  name,
  email,
  lastLoginAt,
  isSelf,
  canManage,
  canAssignAdmin,
  loginUrl,
  showEmail,
  viewerIsOwner = false,
}: {
  businessId: string;
  id: string;
  role: string;
  status: string;
  name: string | null;
  email: string | null;
  lastLoginAt: string | null;
  isSelf: boolean;
  canManage: boolean;
  canAssignAdmin: boolean;
  loginUrl: string;
  /** Only the owner sees the email column on large screens. */
  showEmail: boolean;
  viewerIsOwner?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const isOwner = role === "owner";
  const isInvited = status === "invited";
  const isDisabled = status === "disabled";

  const canManageTarget =
    canManage && !isOwner && !isSelf && (canAssignAdmin || role === "employee");
  const canRenameTarget = isSelf || canManageTarget;

  const displayName =
    name?.trim() ||
    (isSelf
      ? "Vous"
      : isInvited
        ? "Invitation en attente"
        : "Membre de l'équipe");

  const roleId = (["owner", "admin", "employee"] as const).includes(
    role as RoleId,
  )
    ? (role as RoleId)
    : "employee";

  return (
    <motion.tr
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`border-b border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] transition-colors duration-[180ms] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--color-surface-2)_35%,transparent)] ${
        isDisabled ? "opacity-70" : ""
      }`}
    >
      <td className={`${CELL} pl-4 sm:pl-5`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-tight ring-1 ${AVATAR_TONE[roleId]}`}
          >
            {initialsFromIdentity(name)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-medium tracking-tight text-[var(--color-foreground)]">
                {displayName}
              </span>
              {isSelf ? (
                <span className="shrink-0 rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)]">
                  Vous
                </span>
              ) : null}
            </span>
          </span>
        </div>
      </td>

      <td className={CELL}>
        <RoleBadge role={roleId} showSummary={false} />
      </td>

      <td className={CELL}>
        <span className="text-[12.5px] text-[var(--color-muted)]">
          {isInvited
            ? "Invitation en attente"
            : formatLastActivity(lastLoginAt)}
        </span>
      </td>

      <td className={`${CELL} pr-4 text-right sm:pr-5`}>
        {canRenameTarget || canManageTarget || email ? (
          <div className="flex justify-end">
            <MemberActionsMenu
              businessId={businessId}
              id={id}
              role={role}
              status={status}
              name={name}
              email={showEmail ? email : null}
              canManageTarget={canManageTarget}
              canRenameTarget={canRenameTarget}
              canAssignAdmin={canAssignAdmin}
              loginUrl={loginUrl}
              canTransferOwnership={
                canManageTarget && viewerIsOwner && status === "active"
              }
            />
          </div>
        ) : (
          <span aria-hidden className="text-[var(--color-muted)]/50">
            —
          </span>
        )}
      </td>
    </motion.tr>
  );
}
