import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeAuthError,
  AuthRequestError,
  DELIVERY_MESSAGE,
  GENERIC_MESSAGE,
} from "./auth-error.ts";

/**
 * These cases are taken from real responses observed against the Auth API,
 * not invented. The `"{}"` one is the exact shape that made a failed magic
 * link render as an empty alert on /login.
 */
describe("describeAuthError", () => {
  describe("mail delivery failures", () => {
    it("classifies the AuthRetryableFetchError + '{}' shape supabase-js produces", () => {
      const result = describeAuthError({
        message: "{}",
        name: "AuthRetryableFetchError",
        status: 500,
      });
      assert.equal(result.kind, "delivery");
      assert.equal(result.message, DELIVERY_MESSAGE);
    });

    it("classifies any 5xx as a delivery failure", () => {
      assert.equal(
        describeAuthError({ message: "Error sending confirmation email", status: 500 })
          .kind,
        "delivery",
      );
      assert.equal(describeAuthError({ message: "boom", status: 503 }).kind, "delivery");
    });

    it("never leaks a raw JSON body to the user", () => {
      const result = describeAuthError({
        message: '{"code":500,"error_code":"unexpected_failure"}',
        status: 500,
      });
      assert.equal(result.message, DELIVERY_MESSAGE);
      assert.ok(!result.message.includes("{"));
    });

    it("treats an empty message as a delivery failure rather than showing nothing", () => {
      const result = describeAuthError({ message: "", name: "", status: null });
      assert.equal(result.kind, "delivery");
      assert.ok(result.message.length > 0);
    });
  });

  describe("rate limiting", () => {
    it("detects a 429 regardless of message", () => {
      assert.equal(describeAuthError({ message: "{}", status: 429 }).kind, "rate_limit");
    });

    it("detects Supabase's email send rate wording", () => {
      assert.equal(
        describeAuthError({
          message: "For security purposes, you can only request this over_email_send_rate_limit",
          status: 429,
        }).kind,
        "rate_limit",
      );
    });

    it("returns no message — the UI renders a dedicated callout", () => {
      assert.equal(describeAuthError({ message: "too many requests", status: 429 }).message, "");
    });
  });

  describe("genuine client errors", () => {
    it("passes a readable 4xx message through", () => {
      const result = describeAuthError({
        message: "Signups not allowed for otp",
        status: 422,
      });
      assert.equal(result.kind, "generic");
      assert.equal(result.message, "Signups not allowed for otp");
    });

    it("falls back to a default when there is nothing useful", () => {
      const result = describeAuthError({ message: "   ", status: 400 });
      assert.equal(result.message, DELIVERY_MESSAGE);
    });

    it("uses the generic default for an unreadable non-5xx name", () => {
      const result = describeAuthError({ message: "Invalid email", status: 400 });
      assert.equal(result.kind, "generic");
      assert.notEqual(result.message, GENERIC_MESSAGE);
    });
  });

  describe("AuthRequestError", () => {
    it("carries the classified kind alongside the message", () => {
      const err = new AuthRequestError(
        describeAuthError({ message: "{}", name: "AuthRetryableFetchError", status: 500 }),
      );
      assert.equal(err.kind, "delivery");
      assert.equal(err.message, DELIVERY_MESSAGE);
      assert.ok(err instanceof Error);
    });
  });
});
