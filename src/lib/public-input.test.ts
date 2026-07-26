import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampInput,
  normalizeEmail,
  parseParticipants,
  parseSignatureDataUrl,
  MAX_PARTICIPANTS,
  MAX_SIGNATURE_CHARS,
} from "./public-input.ts";

/**
 * These bounds are the only thing standing between an anonymous POST and
 * unbounded writes to the database, the proof snapshot, the PDF and the email
 * queue. Loosening one silently is a denial-of-service.
 */
describe("public input bounds", () => {
  describe("parseSignatureDataUrl", () => {
    it("accepts a normal PNG data URL", () => {
      const value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
      assert.equal(parseSignatureDataUrl(value), value);
    });

    it("rejects an oversized payload", () => {
      const huge = `data:image/png;base64,${"A".repeat(MAX_SIGNATURE_CHARS)}`;
      assert.equal(parseSignatureDataUrl(huge), null);
    });

    it("rejects a non-PNG data URL", () => {
      assert.equal(
        parseSignatureDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
        null,
      );
    });

    it("rejects arbitrary text and empty input", () => {
      assert.equal(parseSignatureDataUrl("not-a-data-url"), null);
      assert.equal(parseSignatureDataUrl(""), null);
      assert.equal(parseSignatureDataUrl(null), null);
    });
  });

  describe("clampInput", () => {
    it("trims and truncates", () => {
      assert.equal(clampInput("  hello  ", 100), "hello");
      assert.equal(clampInput("abcdef", 3), "abc");
    });

    it("coerces nullish to an empty string", () => {
      assert.equal(clampInput(null, 10), "");
      assert.equal(clampInput(undefined, 10), "");
    });
  });

  describe("normalizeEmail", () => {
    it("lowercases a valid address", () => {
      assert.equal(normalizeEmail("  Camille@Example.FR "), "camille@example.fr");
    });

    it("rejects malformed addresses", () => {
      assert.equal(normalizeEmail("pas-un-email"), null);
      assert.equal(normalizeEmail("a@b"), null);
      assert.equal(normalizeEmail(""), null);
    });

    it("rejects an address past the RFC length limit", () => {
      assert.equal(normalizeEmail(`${"a".repeat(250)}@example.fr`), null);
    });
  });

  describe("parseParticipants", () => {
    it("parses a normal roster", () => {
      const list = parseParticipants(
        JSON.stringify([{ name: "Léa", dob: "2015-04-02", note: "asthme" }]),
      );
      assert.deepEqual(list, [
        { name: "Léa", dob: "2015-04-02", note: "asthme" },
      ]);
    });

    it("caps cardinality so one request cannot insert an unbounded roster", () => {
      const many = Array.from({ length: MAX_PARTICIPANTS + 500 }, (_, i) => ({
        name: `Enfant ${i}`,
      }));
      assert.equal(parseParticipants(JSON.stringify(many)).length, MAX_PARTICIPANTS);
    });

    it("drops entries without a name", () => {
      const list = parseParticipants(
        JSON.stringify([{ name: "" }, { name: "  " }, { name: "Sam" }]),
      );
      assert.deepEqual(list.map((p) => p.name), ["Sam"]);
    });

    it("truncates oversized per-entry fields", () => {
      const list = parseParticipants(
        JSON.stringify([
          { name: "N".repeat(500), dob: "X".repeat(50), note: "O".repeat(9000) },
        ]),
      );
      assert.equal(list[0]!.name.length, 160);
      assert.equal(list[0]!.dob.length, 10);
      assert.equal(list[0]!.note.length, 200);
    });

    it("returns empty on malformed or non-array JSON", () => {
      assert.deepEqual(parseParticipants("{ broken"), []);
      assert.deepEqual(parseParticipants(JSON.stringify({ a: 1 })), []);
      assert.deepEqual(parseParticipants(null), []);
    });
  });
});
