import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  isAllowedLogoUrl,
  sanitizeHttpUrl,
  sanitizeLogoUrl,
} from "./branding.ts";

describe("sanitizeHttpUrl", () => {
  it("accepts http(s) absolute URLs", () => {
    assert.equal(
      sanitizeHttpUrl("https://example.com/path"),
      "https://example.com/path",
    );
  });

  it("rejects javascript: and other schemes", () => {
    assert.equal(sanitizeHttpUrl("javascript:alert(1)"), null);
    assert.equal(sanitizeHttpUrl("data:text/html,hi"), null);
    assert.equal(sanitizeHttpUrl("//evil.example"), null);
  });
});

describe("sanitizeLogoUrl", () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://nusokxiytxeuyhipilic.supabase.co";
  });

  after(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  const good =
    "https://nusokxiytxeuyhipilic.supabase.co/storage/v1/object/public/logos/11111111-1111-1111-1111-111111111111/logo-1.png";

  it("accepts logos bucket URLs on the configured host", () => {
    assert.equal(isAllowedLogoUrl(good), true);
    assert.equal(sanitizeLogoUrl(good), good);
  });

  it("rejects attacker hosts and path traversal", () => {
    assert.equal(
      sanitizeLogoUrl(
        "https://evil.example/storage/v1/object/public/logos/11111111-1111-1111-1111-111111111111/x.png",
      ),
      null,
    );
    assert.equal(
      sanitizeLogoUrl(
        "https://nusokxiytxeuyhipilic.supabase.co/storage/v1/object/public/logos/../secrets",
      ),
      null,
    );
    assert.equal(sanitizeLogoUrl("https://attacker.example/ssrf"), null);
  });
});
