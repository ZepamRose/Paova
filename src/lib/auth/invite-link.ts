import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppUrl, getAuthConfirmUrl } from "@/lib/app-url";

/**
 * One-click login URL for invite emails. Falls back to /login with the email
 * prefilled when generateLink is unavailable so the invite still works.
 */
export async function buildMemberInviteLoginUrl(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const confirmUrl = `${getAuthConfirmUrl()}?next=${encodeURIComponent("/dashboard")}`;
  const loginFallback = `${getAppUrl()}/login?email=${encodeURIComponent(normalized)}&next=${encodeURIComponent("/dashboard")}`;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
      options: { redirectTo: confirmUrl },
    });
    if (error) {
      console.error("invite generateLink failed:", error.message);
      return loginFallback;
    }
    const actionLink = data.properties?.action_link?.trim();
    if (!actionLink) {
      console.error("invite generateLink returned no action_link");
      return loginFallback;
    }
    return actionLink;
  } catch (err) {
    console.error("invite generateLink error:", err);
    return loginFallback;
  }
}
