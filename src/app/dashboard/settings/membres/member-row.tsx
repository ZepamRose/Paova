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

function hhmm(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Format activity timestamp with presence awareness.
 * Prefers last_seen_at (heartbeat) over last_sign_in_at when available.
 */
function formatLastActivity(
  lastSeenAt: string | null,
  lastSignInAt: string | null,
): { label: string; isOnline: boolean } {
  // Use the most recent timestamp available
  const timestamp = lastSeenAt || lastSignInAt;
  if (!timestamp) return { label: "Jamais connecté", isOnline: false };

  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime()))
    return { label: "Jamais connecté", isOnline: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  // Online: last activity < 5 min ago
  if (diffMin < 5) return { label: "En ligne", isOnline: true };

  // Recent: 5-60 min
  if (diffMin < 60)
    return { label: `Vu il y a ${diffMin} min`, isOnline: false };

  // Compare calendar dates in local time
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor(
    (todayStart.getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );

  if (diffDays <= 0)
    return { label: `Aujourd'hui à ${hhmm(d)}`, isOnline: false };
  if (diffDays === 1) return { label: `Hier à ${hhmm(d)}`, isOnline: false };
  if (diffDays < 7)
    return { label: `Il y a ${diffDays} jours`, isOnline: false };
  if (diffDays < 14) return { label: "Il y a une semaine", isOnline: false };
  if (diffDays < 31)
    return {
      label: `Il y a ${Math.floor(diffDays / 7)} semaines`,
      isOnline: false,
    };

  return {
    label: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: diffDays > 365 ? "numeric" : undefined,
    }).format(d),
    isOnline: false,
  };
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

const CELL = "px-3 py-[7px] align-middle sm:px-4";

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
  lastSeenAt,
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
  lastSeenAt: string | null;
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

  const activity = formatLastActivity(lastSeenAt, lastLoginAt);

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
        <span className="flex items-center gap-1.5 text-[12.5px]">
          {isInvited ? (
            <span className="text-[var(--color-muted)]">
              Invitation en attente
            </span>
          ) : (
            <>
              {activity.isOnline ? (
                <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"
                    style={{ animationDuration: "2s" }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              ) : null}
              <span
                className={
                  activity.isOnline
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--color-muted)]"
                }
              >
                {activity.label}
              </span>
            </>
          )}
        </span>
      </td>

      <td className={`${CELL} w-px pr-3 text-right sm:pr-4`}>
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
