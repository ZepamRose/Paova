import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildContentSnapshot,
  hashContentSnapshot,
  parseDeviceHint,
  proofReferenceFromSubmissionId,
  stableStringify,
  verifySnapshotIntegrity,
} from "./build.ts";
import type { BuildProofInput } from "./types.ts";

function makeInput(overrides: Partial<BuildProofInput> = {}): BuildProofInput {
  return {
    submissionId: "6fc6ef78-a452-4ef7-8e41-cba93668727d",
    signedAt: "2026-07-25T10:30:00.000Z",
    timezone: "Europe/Paris",
    timezoneOffsetMinutes: 120,
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0 (iPhone) Safari/605.1",
    template: {
      id: "11111111-1111-1111-1111-111111111111",
      version: 3,
      title: "Décharge escape game",
      legal_text: "Je reconnais avoir pris connaissance des règles.",
      fields: [{ key: "phone", label: "Téléphone", type: "tel", required: true }],
      signer_name_label: "Nom du participant",
    },
    signerName: "Camille Dupont",
    signerEmail: "camille@example.fr",
    answers: { phone: "0470000000", __rgpd_consent_at: "2026-07-25T10:29:00.000Z" },
    signatureDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    ...overrides,
  } as BuildProofInput;
}

/**
 * The SHA-256 of the content snapshot is what makes a signed waiver defensible.
 * If key ordering ever became unstable, previously valid proofs would start
 * failing verification — silently destroying the product's core promise.
 */
describe("proof integrity", () => {
  describe("stableStringify", () => {
    it("is independent of key insertion order", () => {
      const a = stableStringify({ b: 1, a: 2, c: { z: 1, y: 2 } });
      const b = stableStringify({ c: { y: 2, z: 1 }, a: 2, b: 1 });
      assert.equal(a, b);
    });

    it("preserves array order (arrays are meaningful, not sets)", () => {
      assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
    });

    it("handles nested arrays of objects", () => {
      const a = stableStringify({ list: [{ n: 1, m: 2 }] });
      const b = stableStringify({ list: [{ m: 2, n: 1 }] });
      assert.equal(a, b);
    });
  });

  describe("hashContentSnapshot", () => {
    it("is deterministic for identical content", () => {
      const one = hashContentSnapshot(buildContentSnapshot(makeInput()));
      const two = hashContentSnapshot(buildContentSnapshot(makeInput()));
      assert.equal(one, two);
    });

    it("produces a 64-char hex digest", () => {
      const hash = hashContentSnapshot(buildContentSnapshot(makeInput()));
      assert.match(hash, /^[0-9a-f]{64}$/);
    });

    it("changes when the legal text changes", () => {
      const before = hashContentSnapshot(buildContentSnapshot(makeInput()));
      const after = hashContentSnapshot(
        buildContentSnapshot(
          makeInput({
            template: {
              ...makeInput().template,
              legal_text: "Texte juridique modifié.",
            },
          }),
        ),
      );
      assert.notEqual(before, after);
    });

    it("changes when an answer changes", () => {
      const before = hashContentSnapshot(buildContentSnapshot(makeInput()));
      const after = hashContentSnapshot(
        buildContentSnapshot(makeInput({ answers: { phone: "0499999999" } })),
      );
      assert.notEqual(before, after);
    });

    // New proofs store signature_sha256 + empty signature_data_url instead of
    // embedding the PNG. Both formats remain hashable; the digest changes if
    // either field differs.
    it("new sha256 format differs from legacy embedded data URL", () => {
      const legacy = hashContentSnapshot(buildContentSnapshot(makeInput()));
      const modern = hashContentSnapshot(
        buildContentSnapshot(
          makeInput({
            signatureSha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          }),
        ),
      );
      assert.notEqual(legacy, modern);
    });

    it("includes signature_sha256 in the snapshot when provided", () => {
      const sha =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const snapshot = buildContentSnapshot(
        makeInput({ signatureSha256: sha }),
      );
      assert.equal(snapshot.signature_data_url, "");
      assert.equal(snapshot.signature_sha256, sha);
    });
  });

  describe("verifySnapshotIntegrity", () => {
    it("accepts an untampered snapshot", () => {
      const snapshot = buildContentSnapshot(makeInput());
      const hash = hashContentSnapshot(snapshot);
      assert.equal(verifySnapshotIntegrity(snapshot, hash), true);
    });

    it("is case-insensitive on the stored digest", () => {
      const snapshot = buildContentSnapshot(makeInput());
      const hash = hashContentSnapshot(snapshot).toUpperCase();
      assert.equal(verifySnapshotIntegrity(snapshot, hash), true);
    });

    it("rejects a snapshot whose signer name was altered after signing", () => {
      const snapshot = buildContentSnapshot(makeInput());
      const hash = hashContentSnapshot(snapshot);
      const tampered = {
        ...snapshot,
        signer: { ...snapshot.signer, name: "Quelqu'un d'autre" },
      };
      assert.equal(verifySnapshotIntegrity(tampered, hash), false);
    });

    it("rejects a truncated or malformed digest", () => {
      const snapshot = buildContentSnapshot(makeInput());
      assert.equal(verifySnapshotIntegrity(snapshot, "abc"), false);
      assert.equal(verifySnapshotIntegrity(snapshot, ""), false);
    });
  });

  describe("proofReferenceFromSubmissionId", () => {
    it("derives a stable, human-readable reference", () => {
      assert.equal(
        proofReferenceFromSubmissionId("6fc6ef78-a452-4ef7-8e41-cba93668727d"),
        "PV-6FC6EF78",
      );
    });
  });

  describe("parseDeviceHint", () => {
    it("returns null without a user agent", () => {
      assert.equal(parseDeviceHint(null), null);
    });

    it("recognises an iPhone on Safari", () => {
      const hint = parseDeviceHint(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 Safari/605.1",
      );
      assert.equal(hint, "Safari · iOS · Mobile");
    });

    it("does not label Chrome as Safari", () => {
      const hint = parseDeviceHint(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      );
      assert.equal(hint, "Chrome · Windows · Ordinateur");
    });
  });
});
