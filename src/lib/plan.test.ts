import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "./plan.ts";

const MIGRATION = join(
  import.meta.dirname,
  "../../supabase/migrations/0028_enforce_free_plan_limit.sql",
);

describe("plan", () => {
  describe("free monthly limit", () => {
    /**
     * The cap exists twice: as a TS constant (UI copy + fast pre-check) and as
     * a SQL function (the authoritative trigger). A "KEEP IN SYNC" comment is
     * a reminder, not a guarantee — this test is the guarantee. If it fails,
     * one of the two was changed alone and free tenants are being metered
     * differently from what the interface promises.
     */
    it("matches public.free_monthly_signature_limit() in the migration", () => {
      const sql = readFileSync(MIGRATION, "utf8");
      const match = /free_monthly_signature_limit\(\)[\s\S]*?select\s+(\d+)\s*;/.exec(
        sql,
      );
      assert.ok(match, "could not read the limit from migration 0028");
      assert.equal(
        Number(match[1]),
        FREE_MONTHLY_LIMIT,
        `SQL says ${match[1]}, TypeScript says ${FREE_MONTHLY_LIMIT}`,
      );
    });
  });

  describe("isPro", () => {
    it("is true only for the pro plan", () => {
      assert.equal(isPro({ plan: "pro" }), true);
      assert.equal(isPro({ plan: "free" }), false);
      assert.equal(isPro({ plan: "trial" }), false);
    });

    it("treats missing data as not pro (fail closed)", () => {
      assert.equal(isPro(null), false);
      assert.equal(isPro(undefined), false);
      assert.equal(isPro({}), false);
    });
  });

  describe("currentMonthStartISO", () => {
    it("returns the first instant of the current UTC month", () => {
      const iso = currentMonthStartISO();
      const date = new Date(iso);
      const now = new Date();
      assert.equal(date.getUTCDate(), 1);
      assert.equal(date.getUTCHours(), 0);
      assert.equal(date.getUTCMinutes(), 0);
      assert.equal(date.getUTCSeconds(), 0);
      assert.equal(date.getUTCMonth(), now.getUTCMonth());
      assert.equal(date.getUTCFullYear(), now.getUTCFullYear());
    });
  });
});
