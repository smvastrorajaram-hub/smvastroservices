import test from "node:test";
import assert from "node:assert/strict";
import { inspectFirebaseActionCode, parseFirebaseActionLink } from "../public/auth/oob-code-diagnostic.mjs";

const validLink = "https://smv-astro.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=sample-secret&apiKey=sample-key";

test("parses only the exact production Firebase native action URL", () => {
  const parsed = parseFirebaseActionLink(validLink);
  assert.equal(parsed.mode, "resetPassword");
  assert.equal(parsed.oobCode, "sample-secret");
  assert.equal(parsed.apiKey, "sample-key");
  assert.throws(
    () => parseFirebaseActionLink("https://smvastroservices.in/auth/action.html?mode=resetPassword&oobCode=x&apiKey=y"),
    /expected SMV ASTRO Firebase native action link/
  );
});

test("checks verification codes without applying them", async () => {
  const calls = [];
  const sdk = {
    checkActionCode: async (_auth, code) => {
      calls.push(["checkActionCode", code]);
      return { operation: "VERIFY_EMAIL", data: { email: "private@example.com" } };
    },
    applyActionCode: async () => { throw new Error("must not be called"); }
  };
  const checked = await inspectFirebaseActionCode({ auth: {}, mode: "verifyEmail", oobCode: "verify-code", sdk });
  assert.deepEqual(checked, { valid: true, operation: "VERIFY_EMAIL" });
  assert.deepEqual(calls, [["checkActionCode", "verify-code"]]);
  assert.equal(JSON.stringify(checked).includes("@"), false);
});

test("checks reset codes without confirming or changing a password", async () => {
  const calls = [];
  const sdk = {
    verifyPasswordResetCode: async (_auth, code) => {
      calls.push(["verifyPasswordResetCode", code]);
      return "private@example.com";
    },
    confirmPasswordReset: async () => { throw new Error("must not be called"); }
  };
  const checked = await inspectFirebaseActionCode({ auth: {}, mode: "resetPassword", oobCode: "reset-code", sdk });
  assert.deepEqual(checked, { valid: true, operation: "PASSWORD_RESET" });
  assert.deepEqual(calls, [["verifyPasswordResetCode", "reset-code"]]);
  assert.equal(JSON.stringify(checked).includes("@"), false);
});

test("preserves Firebase's exact expired-code error", async () => {
  const sdk = {
    verifyPasswordResetCode: async () => {
      const error = new Error("expired");
      error.code = "auth/expired-action-code";
      throw error;
    }
  };
  await assert.rejects(
    inspectFirebaseActionCode({ auth: {}, mode: "resetPassword", oobCode: "old-code", sdk }),
    error => error.code === "auth/expired-action-code"
  );
});

test("rejects a code whose Firebase operation does not match the link mode", async () => {
  const sdk = { checkActionCode: async () => ({ operation: "PASSWORD_RESET" }) };
  const checked = await inspectFirebaseActionCode({ auth: {}, mode: "verifyEmail", oobCode: "wrong-mode", sdk });
  assert.deepEqual(checked, {
    valid: false,
    operation: "PASSWORD_RESET",
    errorCode: "auth/invalid-action-code"
  });
});
