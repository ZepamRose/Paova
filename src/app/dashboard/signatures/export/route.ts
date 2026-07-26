import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { actorKindFromRole } from "@/lib/auth/actor-kind";
import { recordAuditEvent } from "@/lib/audit";
import { buildSearchIndexCsv, searchSubmissions } from "@/lib/search";

// Mirrors the client-side "Filtrer par période" quick filter so an export
// always contains exactly the rows the user currently sees on screen.
function filterByPeriod<T extends { signed_at: string }>(
  rows: T[],
  scope: string | null,
): T[] {
  if (scope !== "today" && scope !== "week") return rows;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekOffset = (now.getDay() + 6) % 7;
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - weekOffset);
  const since = scope === "today" ? startToday : startWeek;
  return rows.filter((row) => new Date(row.signed_at) >= since);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const templateId = url.searchParams.get("template");
  const groupId = url.searchParams.get("group");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");
  const scope = url.searchParams.get("scope");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (!membership) {
    return new NextResponse("Not found", { status: 404 });
  }
  // Bulk PII extraction — owner/admin only, never employees.
  if (!hasCapability(membership.role, "export_data")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) {
    return new NextResponse("Not found", { status: 404 });
  }

  let rows;
  try {
    rows = await searchSubmissions(supabase, {
      q,
      templateId,
      groupId,
      from,
      to,
      status: status === "all" ? null : status || "signed",
      limit: 2000,
      offset: 0,
      businessId: membership.businessId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return new NextResponse(message, { status: 500 });
  }

  const scopedRows = filterByPeriod(rows, scope);

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: actorKindFromRole(membership.role),
    entityType: "export",
    entityId: business.id,
    templateId: templateId || null,
    eventType: "export.csv_generated",
    payload: {
      row_count: scopedRows.length,
      scope: "search",
      q: q || null,
      template_id: templateId || null,
      group_id: groupId || null,
      period_scope: scope || "all",
      from: from || null,
      to: to || null,
      status: status || "signed",
    },
  });

  const body = buildSearchIndexCsv(scopedRows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signatures-paova-${stamp}.csv"`,
      "X-Export-Limit": "2000",
    },
  });
}
