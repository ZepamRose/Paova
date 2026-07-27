import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * `database.types.ts` is hand-written, so nothing normally links it to the
 * schema: a migration can add a table or column and the types silently keep
 * describing yesterday's database. Supabase's client then infers wrong shapes
 * and the mistake only surfaces at runtime, in production.
 *
 * This is a cheap structural guard, not a replacement for
 * `supabase gen types typescript` — it catches the drift that actually
 * happened here (new table, forgotten type) without requiring the CLI.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "../../supabase/migrations");
const TYPES_FILE = join(import.meta.dirname, "database.types.ts");

function migrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

/** Tables created in public schema across all migrations. */
function declaredTables(sql: string): string[] {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi;
  const names = new Set<string>();
  for (const match of sql.matchAll(re)) {
    names.add(match[1]!.toLowerCase());
  }
  return [...names].sort();
}

/** Functions exposed to the app across all migrations. */
function declaredFunctions(sql: string): string[] {
  const re = /create\s+or\s+replace\s+function\s+public\.(\w+)/gi;
  const names = new Set<string>();
  for (const match of sql.matchAll(re)) {
    names.add(match[1]!.toLowerCase());
  }
  return [...names].sort();
}

describe("database types stay in sync with migrations", () => {
  const sql = migrationSql();
  const types = readFileSync(TYPES_FILE, "utf8");

  it("declares every table created by a migration", () => {
    const missing = declaredTables(sql).filter(
      (table) => !new RegExp(`\\b${table}:\\s*\\{`).test(types),
    );
    assert.deepEqual(
      missing,
      [],
      `Tables present in migrations but absent from database.types.ts: ${missing.join(", ")}`,
    );
  });

  it("declares the RPCs the application calls", () => {
    // Only functions invoked through supabase.rpc() need a Functions entry;
    // triggers and RLS helpers are internal to Postgres.
    const rpcsUsedByApp = [
      "search_submissions_for_owner",
      "rate_limit_hit",
      "dashboard_template_stats",
      "dashboard_group_stats",
      "dashboard_signature_days",
      "template_proof_version_counts",
      "business_member_emails",
      "business_member_directory",
    ];
    const declared = declaredFunctions(sql);

    for (const rpc of rpcsUsedByApp) {
      assert.ok(
        declared.includes(rpc),
        `${rpc} is called from the app but never created in a migration`,
      );
      assert.ok(
        new RegExp(`\\b${rpc}:\\s*\\{`).test(types),
        `${rpc} exists in SQL but is missing from the Functions block of database.types.ts`,
      );
    }
  });
});
