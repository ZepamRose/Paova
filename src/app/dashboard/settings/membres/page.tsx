import Link from "next/link";
import { getDashboardSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/permissions";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { DashboardEntrance } from "../../dashboard-entrance";
import { InviteMemberForm } from "./invite-member-form";
import { MemberRow } from "./member-row";
import { MembersStatusBanner } from "./members-status-banner";
import { RoleGuide } from "./roles";
import { MembersActivityHeartbeat } from "./members-activity-heartbeat";

const ERROR_COPY: Record<string, string> = {
  invalid: "Requête invalide.",
  forbidden: "Vous n'avez pas le droit d'effectuer cette action.",
  duplicate: "Cette personne est déjà membre ou invitée.",
  owner: "Impossible de modifier ou retirer le propriétaire.",
  insert: "Impossible d'envoyer l'invitation. Réessayez.",
  delete: "Impossible de retirer ce membre. Réessayez.",
  update: "Impossible de mettre à jour. Réessayez.",
  transfer: "Impossible de transférer la propriété. Réessayez.",
};

const SUCCESS_COPY: Record<string, string> = {
  invited: "Invitation envoyée.",
  resent: "Invitation renvoyée.",
  removed: "Membre retiré de l'équipe.",
  updated: "Rôle mis à jour.",
  renamed: "Nom mis à jour.",
  disabled: "Membre désactivé.",
  reactivated: "Membre réactivé.",
  transferred:
    "Propriété transférée. Vous êtes désormais administrateur de cet espace.",
};

const WARNING_COPY: Record<string, string> = {
  invited_no_email:
    "Membre ajouté, mais l'email d'invitation n'a pas pu être envoyé (limite du mode test de l'envoi d'email). Partagez le lien de connexion directement avec la personne.",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const { supabase, user, membership } = await getDashboardSession();

  const canInvite = hasCapability(membership.role, "invite_employees");
  const canManage = hasCapability(membership.role, "manage_members");
  const canInviteAdmin = membership.role === "owner";
  const usingSandboxSender = /@resend\.dev\b/i.test(env.resend.from);
  const canAssignAdmin = membership.role === "owner";

  const { data: rows } = await supabase
    .from("business_member")
    .select("id, role, status, invited_email, invited_name, display_name, user_id, created_at")
    .eq("business_id", membership.businessId)
    .order("created_at", { ascending: true });

  const { data: memberDirectory } =
    (rows?.some((row) => Boolean(row.user_id)) ?? false)
      ? await supabase.rpc("business_member_directory", {
          p_business_id: membership.businessId,
        })
      : {
          data: [] as {
            user_id: string;
            email: string | null;
            full_name: string | null;
            last_sign_in_at: string | null;
            last_seen_at: string | null;
          }[],
        };

  const directoryByUserId = new Map(
    (memberDirectory ?? []).map((p) => [p.user_id, p]),
  );

  const members = rows ?? [];
  const pendingCount = members.filter((m) => m.status === "invited").length;
  const disabledCount = members.filter((m) => m.status === "disabled").length;

  const successMessage =
    (success && SUCCESS_COPY[success]) ||
    (success && WARNING_COPY[success]) ||
    null;
  const successTone =
    success && WARNING_COPY[success] ? "warning" : "success";

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-8 pb-20 sm:gap-7 sm:px-6 sm:py-10 sm:pb-24">
      <MembersActivityHeartbeat businessId={membership.businessId} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-brand)_11%,transparent),transparent_62%)]"
      />

      <DashboardEntrance step={0}>
        <header className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-[color,transform] duration-200 hover:text-[var(--color-foreground)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          >
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              ←
            </span>
            Tableau de bord
          </Link>

          <div className="min-w-0">
            <h1 className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.95rem]">
              Accès &amp; rôles
            </h1>
            <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-[var(--color-muted)]">
              Gérez les personnes qui peuvent accéder à votre espace et
              définissez leurs permissions.
            </p>
          </div>
        </header>
      </DashboardEntrance>

      {successMessage ? (
        <MembersStatusBanner message={successMessage} tone={successTone} />
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] px-4 py-3.5 text-[13.5px] leading-relaxed text-[var(--color-foreground)] shadow-[var(--elev-1)]"
        >
          {ERROR_COPY[error] ?? "Une erreur est survenue."}
        </p>
      ) : null}

      <>
          <DashboardEntrance step={1}>
            <section className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-2)]">
              <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-2.5">
                <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Équipe
                </h2>
                <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-muted)]">
                  {pendingCount > 0 ? (
                    <span className="tabular-nums">
                      {pendingCount} en attente
                    </span>
                  ) : null}
                  {disabledCount > 0 ? (
                    <span className="tabular-nums">
                      {disabledCount} désactivé
                      {disabledCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  <span className="tabular-nums font-medium text-[var(--color-foreground)]/70">
                    {members.length} membre{members.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {members.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13.5px] text-[var(--color-muted)]">
                  Aucun membre pour le moment.
                </p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]">
                      <th scope="col" className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]/80 sm:px-4 sm:pl-5">
                        Nom
                      </th>
                      <th scope="col" className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]/80 sm:px-4">
                        Rôle
                      </th>
                      <th scope="col" className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]/80 sm:px-4">
                        Dernière activité
                      </th>
                      <th scope="col" className="w-px px-3 py-1.5 pr-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]/80 sm:px-4 sm:pr-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const dir = m.user_id ? directoryByUserId.get(m.user_id) : null;
                      const lastLoginAt = dir?.last_sign_in_at ?? null;
                      return (
                        <MemberRow
                          key={m.id}
                          businessId={membership.businessId}
                          id={m.id}
                          role={m.role}
                          status={m.status}
                          name={
                            m.display_name ??
                            m.invited_name ??
                            (m.user_id
                              ? (dir?.full_name ?? null)
                              : null)
                          }
                          email={
                            membership.role === "owner"
                              ? m.user_id
                                ? dir?.email ?? null
                                : m.invited_email
                              : null
                          }
                          lastLoginAt={lastLoginAt}
                          lastSeenAt={dir?.last_seen_at ?? null}
                          isSelf={m.user_id === user.id}
                          canManage={canManage}
                          canAssignAdmin={canAssignAdmin}
                          loginUrl={
                            membership.role === "owner"
                              ? `${getAppUrl()}/login?email=${encodeURIComponent(m.invited_email ?? "")}&next=${encodeURIComponent("/dashboard")}`
                              : ""
                          }
                          showEmail={membership.role === "owner"}
                          viewerIsOwner={membership.role === "owner"}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </DashboardEntrance>

          {canInvite ? (
            <>
          <DashboardEntrance step={2}>
            {usingSandboxSender ? (
              <div
                role="status"
                className="mb-4 rounded-xl border border-[color-mix(in_srgb,#b45309_28%,var(--color-border))] bg-[color-mix(in_srgb,#b45309_8%,var(--color-background))] px-4 py-3.5"
              >
                <p className="text-[13px] font-semibold tracking-tight text-[#92400e] dark:text-[#fbbf24]">
                  Envoi d&apos;emails en mode test
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#a16207]/90 dark:text-[#fcd34d]/85">
                  Tant qu&apos;un domaine n&apos;est pas vérifié, seuls les
                  emails destinés au propriétaire du compte partent réellement.
                  Vos invités ne recevront ni l&apos;invitation, ni leur lien de
                  connexion — et le formulaire de connexion leur affichera une
                  erreur d&apos;envoi.
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#a16207]/80 dark:text-[#fcd34d]/75">
                  À faire une fois : vérifier un domaine sur Resend, puis
                  reporter cette adresse dans <code>RESEND_FROM</code> et dans
                  Supabase → Authentication → Emails → SMTP Settings.
                </p>
              </div>
            ) : null}
            <InviteMemberForm
              businessId={membership.businessId}
              canInviteAdmin={canInviteAdmin}
            />
          </DashboardEntrance>

          <DashboardEntrance step={3}>
            <section aria-labelledby="roles-guide-heading">
              <h2
                id="roles-guide-heading"
                className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]/80"
              >
                Ce que permet chaque rôle
              </h2>
              <p className="mb-4 text-[13px] leading-snug text-[var(--color-muted)]">
                Choisissez le niveau d&apos;accès au moment de l&apos;invitation.
                Il reste modifiable ensuite.
              </p>
              <RoleGuide />
            </section>
          </DashboardEntrance>
            </>
          ) : null}
      </>
    </main>
  );
}
