import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimPendingInvite } from "@/lib/auth/membership";

/**
 * Called right after magic-link verify so invite rows flip to active before
 * the first dashboard render (avoids "invitation en attente" races).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const claimed = await claimPendingInvite(supabase, user.id, user);
  return NextResponse.json({ ok: true, claimed });
}
