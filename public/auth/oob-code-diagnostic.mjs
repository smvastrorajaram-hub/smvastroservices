const NATIVE_ACTION_ORIGIN = "https://smv-astro.firebaseapp.com";
const NATIVE_ACTION_PATH = "/__/auth/action";

export function parseFirebaseActionLink(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Paste the complete Firebase email link.");
  }

  if (url.protocol !== "https:" || url.origin !== NATIVE_ACTION_ORIGIN || url.pathname !== NATIVE_ACTION_PATH) {
    throw new Error("This is not the expected SMV ASTRO Firebase native action link.");
  }

  const mode = url.searchParams.get("mode") || "";
  const oobCode = url.searchParams.get("oobCode") || "";
  const apiKey = url.searchParams.get("apiKey") || "";
  if (!mode || !oobCode || !apiKey) {
    throw new Error("The link is missing mode, oobCode, or apiKey.");
  }

  return Object.freeze({ mode, oobCode, apiKey });
}

// Validation only: deliberately never applies an action code or changes a password.
export async function inspectFirebaseActionCode({ auth, mode, oobCode, sdk }) {
  if (!auth || !sdk || typeof oobCode !== "string" || !oobCode) {
    throw new TypeError("Firebase Auth, SDK methods, and an action code are required.");
  }

  if (mode === "verifyEmail") {
    if (typeof sdk.checkActionCode !== "function") {
      throw new TypeError("Firebase checkActionCode is unavailable.");
    }
    const info = await sdk.checkActionCode(auth, oobCode);
    if (info?.operation !== "VERIFY_EMAIL") {
      return Object.freeze({
        valid: false,
        operation: String(info?.operation || "UNKNOWN"),
        errorCode: "auth/invalid-action-code"
      });
    }
    return Object.freeze({ valid: true, operation: "VERIFY_EMAIL" });
  }

  if (mode === "resetPassword") {
    if (typeof sdk.verifyPasswordResetCode !== "function") {
      throw new TypeError("Firebase verifyPasswordResetCode is unavailable.");
    }
    await sdk.verifyPasswordResetCode(auth, oobCode);
    return Object.freeze({ valid: true, operation: "PASSWORD_RESET" });
  }

  throw new Error("This diagnostic supports only verifyEmail and resetPassword links.");
}
