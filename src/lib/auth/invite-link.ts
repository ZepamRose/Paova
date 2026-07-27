import { getAppUrl } from "@/lib/app-url";

/**
 * Login URL for invite emails.
 *
 * Deliberately NOT a pre-generated magic link. Calling
 * `auth.admin.generateLink` returns a token that authenticates whoever holds
 * it, and embedding it in the email body persists a working credential in
 * Resend's storage, in their logs, and in every relay along the way. Worse,
 * for an address that already has a Paova account, an admin could trigger the
 * minting of a session token for an account they do not control.
 *
 * The invitee lands on /login with the address prefilled and asks Supabase for
 * their own magic link. One extra click, no credential leaving our boundary.
 */
export function buildMemberInviteLoginUrl(email: string): string {
  const normalized = email.trim().toLowerCase();
  const params = new URLSearchParams({
    email: normalized,
    next: "/dashboard",
  });
  return `${getAppUrl()}/login?${params.toString()}`;
}
