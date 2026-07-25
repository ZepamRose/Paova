import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    });
    const results = await enrichSearchRows(supabase, rows);
    return NextResponse.json({ results, count: results.length });
  } catch {
    return NextResponse.json(
      {
        error:
          "La recherche est indisponible. Vérifiez que la migration 0010 a été appliquée.",
      },
      { status: 503 },
    );
  }
}
