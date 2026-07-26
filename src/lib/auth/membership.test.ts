import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailsForAuthUser,
  pickPreferredMembership,
} from "./membership-select.ts";

describe("emailsForAuthUser", () => {
  it("collects primary and identity emails, lowercased", () => {
    const emails = emailsForAuthUser({
      email: "Owner@Example.com",
      identities: [
        {
          identity_data: { email: "Alias@Example.com" },
        } as never,
      ],
    });
    assert.deepEqual(emails.sort(), ["alias@example.com", "owner@example.com"]);
  });

  it("dedupes identical emails", () => {
    const emails = emailsForAuthUser({
      email: "a@b.co",
      identities: [
        { identity_data: { email: "A@B.co" } } as never,
      ],
    });
    assert.deepEqual(emails, ["a@b.co"]);
  });
});

describe("pickPreferredMembership", () => {
  it("prefers collaborator seat over accidental solo owner", () => {
    const picked = pickPreferredMembership([
      { business_id: "solo", role: "owner" },
      { business_id: "team", role: "employee" },
    ]);
    assert.deepEqual(picked, { businessId: "team", role: "employee" });
  });

  it("prefers admin over owner when both exist", () => {
    const picked = pickPreferredMembership([
      { business_id: "a", role: "owner" },
      { business_id: "b", role: "admin" },
    ]);
    assert.deepEqual(picked, { businessId: "b", role: "admin" });
  });

  it("falls back to owner when no collaborator seat", () => {
    const picked = pickPreferredMembership([
      { business_id: "solo", role: "owner" },
    ]);
    assert.deepEqual(picked, { businessId: "solo", role: "owner" });
  });

  it("returns null for empty or invalid roles", () => {
    assert.equal(pickPreferredMembership([]), null);
    assert.equal(
      pickPreferredMembership([{ business_id: "x", role: "superadmin" }]),
      null,
    );
  });
});
