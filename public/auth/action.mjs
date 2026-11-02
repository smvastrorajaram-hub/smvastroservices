import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",
  authDomain: "auth.smvastroservices.in",
  projectId: "smv-astro",
  storageBucket: "smv-astro.firebasestorage.app",
  messagingSenderId: "299081899217",
  appId: "1:299081899217:web:8d558df08e86037ea539f0"
});

const COPY = {
  en: {
    titles: {
      verifyEmail: "Verify your email address",
      resetPassword: "Create a new password",
      recoverEmail: "Restore your email address"
    },
    working: "Checking your secure link…",
    verified: "Your email address has been verified.",
    recovered: "Your previous email address has been restored.",
    resetReady: email => email ? `Create a new password for ${email}.` : "Create a new password below.",
    resetDone: "Your password has been changed successfully.",
    mismatch: "The passwords do not match.",
    tooShort: "Use a password with at least 6 characters.",
    invalid: "This link is invalid, expired, or has already been used. Request a new email and try again.",
    missing: "The link is incomplete. Open the complete link from your email.",
    failed: "We could not complete this request. Please request a new email and try again.",
    network: "A network error occurred. Check your connection and try again.",
    apiKey: "Firebase rejected the configured API key. Please contact SMV ASTRO support; do not share the email link.",
    weak: "This password does not meet the project's password requirements.",
    busy: "Too many attempts. Please wait and try again.",
    saving: "Saving…",
    save: "Save new password",
    emailLabel: email => email ? `Account: ${email}` : "Your account has been updated.",
    home: "Go to SMV ASTRO"
  },
  ta: {
    titles: {
      verifyEmail: "உங்கள் மின்னஞ்சலை உறுதிப்படுத்தவும்",
      resetPassword: "புதிய கடவுச்சொல்லை அமைக்கவும்",
      recoverEmail: "முந்தைய மின்னஞ்சலை மீட்டெடுக்கவும்"
    },
    working: "உங்கள் பாதுகாப்பான இணைப்பைச் சரிபார்க்கிறது…",
    verified: "உங்கள் மின்னஞ்சல் முகவரி வெற்றிகரமாக உறுதிப்படுத்தப்பட்டது.",
    recovered: "உங்கள் முந்தைய மின்னஞ்சல் முகவரி மீட்டெடுக்கப்பட்டது.",
    resetReady: email => email ? `${email} கணக்கிற்குப் புதிய கடவுச்சொல்லை அமைக்கவும்.` : "கீழே புதிய கடவுச்சொல்லை அமைக்கவும்.",
    resetDone: "உங்கள் கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது.",
    mismatch: "இரண்டு கடவுச்சொற்களும் ஒன்றாக இல்லை.",
    tooShort: "குறைந்தது 6 எழுத்துகள் கொண்ட கடவுச்சொல்லைப் பயன்படுத்தவும்.",
    invalid: "இந்த இணைப்பு தவறானது, காலாவதியானது அல்லது ஏற்கெனவே பயன்படுத்தப்பட்டது. புதிய மின்னஞ்சலைக் கோரவும்.",
    missing: "இணைப்பு முழுமையாக இல்லை. மின்னஞ்சலில் உள்ள முழு இணைப்பைத் திறக்கவும்.",
    failed: "இந்தச் செயலை முடிக்க முடியவில்லை. புதிய மின்னஞ்சலைக் கோரி மீண்டும் முயற்சிக்கவும்.",
    network: "இணையத் தொடர்பில் சிக்கல். தொடர்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    apiKey: "Firebase API key அமைப்பில் சிக்கல் உள்ளது. SMV ASTRO ஆதரவைத் தொடர்புகொள்ளவும்; email link-ஐ யாரிடமும் பகிர வேண்டாம்.",
    weak: "இந்தக் கடவுச்சொல் திட்டத்தின் பாதுகாப்பு விதிகளைப் பூர்த்தி செய்யவில்லை.",
    busy: "பலமுறை முயற்சிக்கப்பட்டுள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.",
    saving: "சேமிக்கப்படுகிறது…",
    save: "புதிய கடவுச்சொல்லைச் சேமிக்கவும்",
    emailLabel: email => email ? `கணக்கு: ${email}` : "உங்கள் கணக்கு புதுப்பிக்கப்பட்டது.",
    home: "SMV ASTRO முகப்புக்குச் செல்லவும்"
  }
};

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "";
const actionCode = params.get("oobCode") || "";
const linkApiKey = params.get("apiKey") || "";
const rawContinueUrl = params.get("continueUrl") || "";
const language = (params.get("lang") || "en").toLowerCase().startsWith("ta") ? "ta" : "en";
const t = COPY[language];

document.documentElement.lang = language;
document.getElementById("page-title").textContent = t.titles[mode] || "SMV ASTRO SERVICES";
document.getElementById("status").textContent = t.working;

// Remove one-time credentials from the visible address bar before loading SDK code.
// The code remains only in this page's short-lived JavaScript memory.
try {
  window.history.replaceState({}, document.title, window.location.pathname);
} catch {
  // Some embedded browsers may disallow history updates; action processing can continue.
}

const statusNode = document.getElementById("status");
const detailNode = document.getElementById("detail");
const resetForm = document.getElementById("reset-form");
const continueLink = document.getElementById("continue-link");
const passwordInput = document.getElementById("new-password");
const confirmInput = document.getElementById("confirm-password");
const resetSubmit = document.getElementById("reset-submit");

const ALLOWED_CONTINUE_ORIGINS = new Set([
  "https://smvastroservices.in",
  "https://auth.smvastroservices.in",
  "https://horoscope.smvastroservices.in",
  "https://calendar.smvastroservices.in"
]);

function safeContinueUrl(value) {
  if (!value) return "https://smvastroservices.in/";
  try {
    const candidate = new URL(value);
    if (candidate.protocol === "https:" && ALLOWED_CONTINUE_ORIGINS.has(candidate.origin) &&
        !candidate.username && !candidate.password) {
      return candidate.href;
    }
  } catch {
    // Invalid continuation URLs fall back to the verified main website.
  }
  return "https://smvastroservices.in/";
}

function showSuccess(message, detail = "") {
  statusNode.textContent = message;
  detailNode.textContent = detail;
  resetForm.hidden = true;
  continueLink.href = safeContinueUrl(rawContinueUrl);
  continueLink.textContent = t.home;
  continueLink.hidden = false;
}

function errorMessage(error) {
  switch (error?.code) {
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
    case "auth/invalid-action-link":
      return t.invalid;
    case "auth/weak-password":
      return t.weak;
    case "auth/too-many-requests":
      return t.busy;
    case "auth/network-request-failed":
      return t.network;
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return t.apiKey;
    default:
      return t.failed;
  }
}

function showError(message) {
  statusNode.textContent = message;
  detailNode.textContent = "";
  resetForm.hidden = true;
  continueLink.href = "https://smvastroservices.in/";
  continueLink.textContent = t.home;
  continueLink.hidden = false;
}

async function handleVerifyEmail(auth) {
  const info = await checkActionCode(auth, actionCode);
  if (info.operation && info.operation !== "VERIFY_EMAIL") {
    throw Object.assign(new Error("Unexpected email action"), { code: "auth/invalid-action-code" });
  }
  await applyActionCode(auth, actionCode);
  showSuccess(t.verified, "");
}

async function handleRecoverEmail(auth) {
  const info = await checkActionCode(auth, actionCode);
  if (info.operation && info.operation !== "RECOVER_EMAIL") {
    throw Object.assign(new Error("Unexpected email action"), { code: "auth/invalid-action-code" });
  }
  const restoredEmail = info.data?.email || "";
  await applyActionCode(auth, actionCode);
  showSuccess(t.recovered, restoredEmail ? t.emailLabel(restoredEmail) : "");
}

async function handlePasswordReset(auth) {
  const email = await verifyPasswordResetCode(auth, actionCode);
  detailNode.textContent = t.resetReady(email);
  resetForm.hidden = false;
  resetSubmit.textContent = t.save;

  resetForm.addEventListener("submit", async event => {
    event.preventDefault();
    const newPassword = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (newPassword.length < 6) {
      statusNode.textContent = t.tooShort;
      passwordInput.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      statusNode.textContent = t.mismatch;
      confirmInput.focus();
      return;
    }

    resetSubmit.disabled = true;
    resetSubmit.textContent = t.saving;
    statusNode.textContent = t.saving;
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      passwordInput.value = "";
      confirmInput.value = "";
      showSuccess(t.resetDone, "");
    } catch (error) {
      statusNode.textContent = errorMessage(error);
      passwordInput.value = "";
      confirmInput.value = "";
      passwordInput.focus();
    } finally {
      resetSubmit.disabled = false;
      resetSubmit.textContent = t.save;
    }
  });
}

async function main() {
  if (!["verifyEmail", "resetPassword", "recoverEmail"].includes(mode) || !actionCode || !linkApiKey) {
    showError(t.missing);
    return;
  }
  // Do not compare the email link's apiKey with the frontend config locally.
  // Firebase action links may carry a backend-managed key that differs from the
  // currently configured web key. The link key is not used as app configuration:
  // all action-code operations below run against this fixed smv-astro project,
  // and Firebase itself validates whether the one-time code belongs to it.

  try {
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);

    switch (mode) {
      case "verifyEmail":
        await handleVerifyEmail(auth);
        break;
      case "recoverEmail":
        await handleRecoverEmail(auth);
        break;
      case "resetPassword":
        await handlePasswordReset(auth);
        break;
      default:
        showError(t.missing);
    }
  } catch (error) {
    showError(errorMessage(error));
  }
}

main().catch(() => showError(t.failed));
