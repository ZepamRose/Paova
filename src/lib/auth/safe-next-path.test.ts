import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeNextPath } from "./safe-next-path.ts";

describe("safeNextPath", () => {
  it("allows normal in-app paths", () => {
    assert.equal(safeNextPath("/dashboard"), "/dashboard");
    assert.equal(safeNextPath("/dashboard/billing?success=1"), "/dashboard/billing?success=1");
  });

  it("rejects protocol-relative and absolute URL disguises", () => {
    assert.equal(safeNextPath("//evil.example/phish"), "/dashboard");
    assert.equal(safeNextPath("/\\evil.example"), "/dashboard");
    assert.equal(safeNextPath("/http://evil.example"), "/dashboard");
    assert.equal(safeNextPath("https://evil.example"), "/dashboard");
    assert.equal(safeNextPath("evil.example"), "/dashboard");
  });

  it("falls back on empty or missing input", () => {
    assert.equal(safeNextPath(null), "/dashboard");
    assert.equal(safeNextPath("  "), "/dashboard");
    assert.equal(safeNextPath(undefined, "/onboarding"), "/onboarding");
  });
});
