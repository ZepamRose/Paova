import { Eye, ShieldCheck, Users } from "lucide-react";

/**
 * One source of truth for how a role looks and what it is allowed to do.
 *
 * The permission lines are written from ROLE_CAPABILITIES in
 * lib/auth/permissions.ts, not from memory — an admin has no billing *and* no
 * access to the business settings, which the previous copy did not say.
 *
 * Colours carry the hierarchy: green owns the space, blue runs it, violet works
 * in it. They are only ever used behind a text label, never alone, so the
 * distinction never rests on colour perception.
 */
export type RoleId = "owner" | "admin" | "employee";

export const ROLES: Record<
  RoleId,
  {
    label: string;
    /** One line, shown under the badge in the member list. */
    summary: string;
    /** Chip in the role guide. */
    scope: string;
    icon: typeof Users;
    /** Tailwind classes for the badge, per theme-aware token. */
    badge: string;
    dot: string;
    can: string[];
  }
> = {
  owner: {
    label: "Propriétaire",
    summary: "Accès complet",
    scope: "Accès complet",
    icon: ShieldCheck,
    badge:
      "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    dot: "bg-emerald-500",
    can: [
      "Gère l'équipe et les rôles",
      "Crée, modifie et supprime tout",
      "Gère les réglages et la facturation",
      "Peut transférer la propriété",
    ],
  },
  admin: {
    label: "Administrateur",
    summary: "Gère l'équipe et les formulaires",
    scope: "Gestion avancée",
    icon: Users,
    badge: "bg-blue-500/12 text-blue-700 ring-blue-500/25 dark:text-blue-300",
    dot: "bg-blue-500",
    can: [
      "Crée et modifie formulaires et sessions",
      "Invite des membres et change les rôles",
      "Consulte et exporte les signatures",
      "Pas d'accès aux réglages ni à la facturation",
    ],
  },
  employee: {
    label: "Collaborateur",
    summary: "Signe et prépare les sessions",
    scope: "Accès limité",
    icon: Eye,
    badge:
      "bg-violet-500/12 text-violet-700 ring-violet-500/25 dark:text-violet-300",
    dot: "bg-violet-500",
    can: [
      "Fait signer les clients",
      "Prépare une session planifiée à partir d'un formulaire existant",
      "Consulte les signatures",
      "Ne crée ni ne modifie de formulaire",
      "Aucun export ni suppression",
    ],
  },
};

export function isRoleId(value: string): value is RoleId {
  return value === "owner" || value === "admin" || value === "employee";
}

/** Badge + one-line summary, as shown against each member. */
export function RoleBadge({
  role,
  showSummary = true,
}: {
  role: string;
  showSummary?: boolean;
}) {
  if (!isRoleId(role)) return <>{role}</>;
  const r = ROLES[role];
  return (
    <span className="flex flex-col items-start gap-1">
      {/* Fixed width so all three badges occupy the same column width in the
          table — "Administrateur" is the longest and sets the floor at ~108 px. */}
      <span
        className={`inline-flex w-[7.25rem] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-4 ring-1 ${r.badge}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} aria-hidden />
        {r.label}
      </span>
      {showSummary ? (
        <span className="text-[11.5px] leading-tight text-[var(--color-muted)]">
          {r.summary}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The three roles laid out side by side. Replaces the help tooltip: choosing a
 * role is a decision made once per person, and a manager should not have to
 * open anything to make it correctly.
 */
export function RoleGuide({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid gap-3.5 sm:grid-cols-3 ${className}`}
      role="list"
      aria-label="Différences entre les rôles"
    >
      {(Object.keys(ROLES) as RoleId[]).map((id) => {
        const r = ROLES[id];
        const Icon = r.icon;
        return (
          <div
            role="listitem"
            key={id}
            className="rounded-[1.1rem] border border-[color-mix(in_srgb,var(--color-border)_62%,transparent)] bg-[var(--color-surface)] p-4 shadow-[var(--elev-1)] transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--color-border)_35%,var(--color-muted))] hover:shadow-[var(--elev-2)] sm:p-[1.15rem]"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${r.badge}`}
              >
                <Icon size={14} strokeWidth={1.9} aria-hidden />
              </span>
              <span className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {r.label}
              </span>
              <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)]">
                {r.scope}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {r.can.map((line) => (
                <li
                  key={line}
                  className="flex gap-2 text-[12.5px] leading-snug text-[var(--color-muted)]"
                >
                  <span
                    className={`mt-[5px] h-1 w-1 shrink-0 rounded-full ${r.dot}`}
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
