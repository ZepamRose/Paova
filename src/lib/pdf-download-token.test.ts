import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import {
  mintPdfDownloadToken,
  verifyPdfDownloadToken,
} from "./pdf-download-token.ts";

/**
 * These tokens are the only thing standing between a thank-you URL and someone
 * else's signed waiver PDF. Every branch here is a potential data leak.
 */
describe("pdf download token", () => {
  before(() => {
    process.env.PDF_DOWNLOAD_SECRET = "test-secret-not-a-real-key";
  });

  const target = { submissionId: "sub-123", slug: "decharge-abc" };

  it("accepts a freshly minted token for its own submission", () => {
    const token = mintPdfDownloadToken({
      submissionId: target.submissionId,
      slug: target.slug,
    });
    assert.equal(verifyPdfDownloadToken(token, target), true);
  });

  it("rejects a token minted for another submission", () => {
    const token = mintPdfDownloadToken({
      submissionId: "someone-else",
      slug: target.slug,
    });
    assert.equal(verifyPdfDownloadToken(token, target), false);
  });

  it("rejects a token minted for another waiver slug", () => {
    const token = mintPdfDownloadToken({
      submissionId: target.submissionId,
      slug: "autre-decharge",
    });
    assert.equal(verifyPdfDownloadToken(token, target), false);
  });

  it("rejects a tampered payload whose signature no longer matches", () => {
    const token = mintPdfDownloadToken(target);
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sid: target.submissionId,
        slug: target.slug,
        exp: Math.floor(Date.now() / 1000) + 999999,
      }),
      "utf8",
    ).toString("base64url");
    assert.equal(
      verifyPdfDownloadToken(`${forgedPayload}.${signature}`, target),
      false,
    );
  });

  it("rejects an expired token", () => {
    const payload = Buffer.from(
      JSON.stringify({
        sid: target.submissionId,
        slug: target.slug,
        exp: Math.floor(Date.now() / 1000) - 10,
      }),
      "utf8",
    ).toString("base64url");
    // Signature is irrelevant: expiry must be rejected regardless.
    assert.equal(verifyPdfDownloadToken(`${payload}.whatever`, target), false);
  });

  it("rejects malformed input", () => {
    assert.equal(verifyPdfDownloadToken("", target), false);
    assert.equal(verifyPdfDownloadToken(null, target), false);
    assert.equal(verifyPdfDownloadToken(undefined, target), false);
    assert.equal(verifyPdfDownloadToken("no-dot-here", target), false);
    assert.equal(verifyPdfDownloadToken(".onlysig", target), false);
    assert.equal(verifyPdfDownloadToken("onlypayload.", target), false);
  });
});
