import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

/**
 * One-click login URL for invite emails.
 *
 * Do NOT use generateLink's `action_link`: it goes through Supabase's
 * /auth/v1/verify with a non-PKCE token and often lands on /auth/confirm
 * without token_hash → "lien incomplet". Instead we build our confirm URL
 * with the hashed_token so verifyOtp can run in the browser.
 */
export async function buildMemberInviteLoginUrl(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const loginFallback = `${getAppUrl()}/login?email=${encodeURIComponent(normalized)}&next=${encodeURIComponent("/dashboard")}`;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
    });
    if (error) {
      console.error("invite generateLink failed:", error.message);
      return loginFallback;
    }

    const hashedToken = data.properties?.hashed_token?.trim();
    if (!hashedToken) {
      console.error("invite generateLink returned no hashed_token");
      return loginFallback;
    }

    const params = new URLSearchParams({
      token_hash: hashedToken,
      type: "magiclink",
      next: "/dashboard",
    });
    return `${getAppUrl()}/auth/confirm?${params.toString()}`;
  } catch (err) {
    console.error("invite generateLink error:", err);
    return loginFallback;
  }
}
