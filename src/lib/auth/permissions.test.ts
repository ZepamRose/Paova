import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasCapability, isBusinessRole } from "./permissions.ts";

/**
 * The capability matrix is the single gate protecting billing, bulk PII
 * export and GDPR erasure. A silent widening here is invisible in review but
 * hands a seasonal employee the whole customer database.
 */
describe("permissions", () => {
  describe("isBusinessRole", () => {
    it("accepts the three known roles", () => {
      assert.equal(isBusinessRole("owner"), true);
      assert.equal(isBusinessRole("admin"), true);
      assert.equal(isBusinessRole("employee"), true);
    });

    it("rejects unknown, empty and nullish values", () => {
      assert.equal(isBusinessRole("superadmin"), false);
      assert.equal(isBusinessRole(""), false);
      assert.equal(isBusinessRole(null), false);
      assert.equal(isBusinessRole(undefined), false);
    });
  });

  describe("employee is confined to day-to-day signing", () => {
    it("can sign customers", () => {
      assert.equal(hasCapability("employee", "sign_customers"), true);
    });

    it("cannot export the customer base", () => {
      assert.equal(hasCapability("employee", "export_data"), false);
    });

    it("cannot erase signatures", () => {
      assert.equal(hasCapability("employee", "delete_submission"), false);
    });

    it("cannot touch billing, members or business settings", () => {
      assert.equal(hasCapability("employee", "manage_billing"), false);
      assert.equal(hasCapability("employee", "manage_members"), false);
      assert.equal(hasCapability("employee", "invite_employees"), false);
      assert.equal(hasCapability("employee", "edit_business_info"), false);
      assert.equal(hasCapability("employee", "manage_waivers"), false);
      assert.equal(hasCapability("employee", "manage_groups"), false);
    });
  });

  describe("admin runs operations but not the company", () => {
    it("can export and erase", () => {
      assert.equal(hasCapability("admin", "export_data"), true);
      assert.equal(hasCapability("admin", "delete_submission"), true);
    });

    it("can manage waivers, groups and members", () => {
      assert.equal(hasCapability("admin", "manage_waivers"), true);
      assert.equal(hasCapability("admin", "manage_groups"), true);
      assert.equal(hasCapability("admin", "manage_members"), true);
    });

    it("cannot manage billing", () => {
      assert.equal(hasCapability("admin", "manage_billing"), false);
    });

    it("cannot edit business identity or branding", () => {
      assert.equal(hasCapability("admin", "edit_business_info"), false);
    });
  });

  describe("owner", () => {
    it("holds every capability", () => {
      const all = [
        "manage_billing",
        "edit_business_info",
        "manage_members",
        "invite_employees",
        "manage_waivers",
        "manage_groups",
        "view_stats",
        "export_data",
        "delete_submission",
        "sign_customers",
      ] as const;
      for (const capability of all) {
        assert.equal(
          hasCapability("owner", capability),
          true,
          `owner should hold ${capability}`,
        );
      }
    });
  });
});
