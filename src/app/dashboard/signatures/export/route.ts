import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import { buildSearchIndexCsv, searchSubmissions } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const templateId = url.searchParams.get("template");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    return new NextResponse("Not found", { status: 404 });
  }

  let rows;
  try {
    rows = await searchSubmissions(supabase, {
      q,
      templateId,
      from,
      to,
      status: status === "all" ? null : status || "signed",
      limit: 200,
      offset: 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return new NextResponse(message, { status: 500 });
  }

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "export",
    entityId: business.id,
    templateId: templateId || null,
    eventType: "export.csv_generated",
    payload: {
      row_count: rows.length,
      scope: "search",
      q: q || null,
      template_id: templateId || null,
      from: from || null,
      to: to || null,
      status: status || "signed",
    },
  });

  const body = buildSearchIndexCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signatures-paova-${stamp}.csv"`,
    },
  });
}
