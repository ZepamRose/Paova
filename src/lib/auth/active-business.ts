import { cookies } from "next/headers";

export const ACTIVE_BUSINESS_COOKIE = "paova_business_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read the tenant the user last selected (dashboard switcher). */
export async function getActiveBusinessId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(ACTIVE_BUSINESS_COOKIE)?.value?.trim() ?? "";
  return UUID_RE.test(raw) ? raw : null;
}

/** Persist the active tenant for subsequent dashboard requests. */
export async function setActiveBusinessId(businessId: string): Promise<void> {
  if (!UUID_RE.test(businessId)) return;
  const jar = await cookies();
  jar.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
