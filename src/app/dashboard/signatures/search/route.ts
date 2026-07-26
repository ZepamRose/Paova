import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { enrichSearchRows, searchSubmissions } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const templateId = url.searchParams.get("template")?.trim() || "";
  const groupId = url.searchParams.get("group")?.trim() || "";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "signed";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (!membership || !hasCapability(membership.role, "view_submissions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await searchSubmissions(supabase, {
      q,
      templateId: templateId || null,
      groupId: groupId || null,
      from: from || null,
      to: to || null,
      status: status || null,
      limit: 200,
      offset: 0,
      businessId: membership.businessId,
    });
    const results = await enrichSearchRows(supabase, rows);
    return NextResponse.json({ results, count: results.length });
  } catch {
    return NextResponse.json(
      {
        error:
          "La recherche est indisponible. Vérifiez que les migrations 0010 et 0041 ont été appliquées.",
      },
      { status: 503 },
    );
  }
}
