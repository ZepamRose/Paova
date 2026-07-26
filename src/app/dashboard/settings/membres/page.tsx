import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { getAppUrl } from "@/lib/app-url";
import { DashboardEntrance } from "../../dashboard-entrance";
import { InviteMemberForm } from "./invite-member-form";
import { MemberRow } from "./member-row";
import { MembersStatusBanner } from "./members-status-banner";

const ERROR_COPY: Record<string, string> = {
  invalid: "Requête invalide.",
  forbidden: "Vous n'avez pas le droit d'effectuer cette action.",
  duplicate: "Cette personne est déjà membre ou invitée.",
  owner: "Impossible de modifier ou retirer le propriétaire.",
  insert: "Impossible d'envoyer l'invitation. Réessayez.",
  delete: "Impossible de retirer ce membre. Réessayez.",
  update: "Impossible de mettre à jour le rôle. Réessayez.",
};

const SUCCESS_COPY: Record<string, string> = {
  invited: "Invitation envoyée.",
  resent: "Invitation renvoyée.",
  removed: "Membre retiré de l'équipe.",
  updated: "Rôle mis à jour.",
  disabled: "Membre désactivé.",
  reactivated: "Membre réactivé.",
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await resolveBusinessContext(supabase, user.id, user.email);
  if (!membership) {
    redirect("/onboarding");
  }

  const canView =
    hasCapability(membership.role, "invite_employees") ||
    hasCapability(membership.role, "manage_members");
  const canManage = hasCapability(membership.role, "manage_members");
  const canInviteAdmin = membership.role === "owner";
  const canAssignAdmin = membership.role === "owner";

  const { data: business } = await supabase
    .from("business")
    .select("name")
    .eq("id", membership.businessId)
    .maybeSingle();

  const { data: rows } = canView
    ? await supabase
        .from("business_member")
        .select("id, role, status, invited_email, user_id, created_at")
        .eq("business_id", membership.businessId)
        .order("created_at", { ascending: true })
    : { data: null };

  const userIds = (rows ?? [])
    .map((r) => r.user_id)
    .filter((v): v is string => Boolean(v));

  const { data: memberProfiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", userIds)
      : { data: [] as { id: string; email: string | null }[] };

  const emailByUserId = new Map(
    (memberProfiles ?? []).map((p) => [p.id, p.email]),
  );

  const members = rows ?? [];
  const pendingCount = members.filter((m) => m.status === "invited").length;
  const disabledCount = members.filter((m) => m.status === "disabled").length;
  const businessName = business?.name ?? "Votre établissement";

  const successMessage =
    (success && SUCCESS_COPY[success]) ||
    (success && WARNING_COPY[success]) ||
    null;
  const successTone =
    success && WARNING_COPY[success] ? "warning" : "success";

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-8 pb-20 sm:gap-7 sm:px-6 sm:py-10 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-brand)_11%,transparent),transparent_62%)]"
      />

      <DashboardEntrance step={0}>
        <header className="flex flex-col gap-3.5">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Accès &amp; rôles
            </p>
            <h1 className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.95rem]">
              Équipe
            </h1>
            <p className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-[var(--color-muted)]">
              {businessName} — qui peut faire signer, gérer l&apos;espace, ou
              voir la facturation.
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

      {!canView ? (
        <DashboardEntrance step={1}>
          <p className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] px-5 py-5 text-[14px] leading-relaxed text-[var(--color-muted)] shadow-[var(--elev-1)]">
            Seuls le propriétaire et les administrateurs peuvent gérer les
            membres de l&apos;équipe.
          </p>
        </DashboardEntrance>
      ) : (
        <>
          <DashboardEntrance step={1}>
            <section className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-border)_68%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-2)]">
              <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-5 py-4">
                <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Membres
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
                    {members.length}
                  </span>
                </div>
              </div>

              {members.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13.5px] text-[var(--color-muted)]">
                  Aucun membre pour le moment.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {members.map((m, index) => (
                    <MemberRow
                      key={m.id}
                      businessId={membership.businessId}
                      id={m.id}
                      role={m.role}
                      status={m.status}
                      email={
                        m.user_id
                          ? (emailByUserId.get(m.user_id) ?? null)
                          : m.invited_email
                      }
                      isSelf={m.user_id === user.id}
                      canManage={canManage}
                      canAssignAdmin={canAssignAdmin}
                      loginUrl={`${getAppUrl()}/login?email=${encodeURIComponent(m.invited_email ?? "")}&next=${encodeURIComponent("/dashboard")}`}
                      isLast={index === members.length - 1}
                    />
                  ))}
                </ul>
              )}
            </section>
          </DashboardEntrance>

          <DashboardEntrance step={2}>
            <InviteMemberForm
              businessId={membership.businessId}
              canInviteAdmin={canInviteAdmin}
            />
          </DashboardEntrance>
        </>
      )}
    </main>
  );
}
