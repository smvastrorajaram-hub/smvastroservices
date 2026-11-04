const {createCorsMiddleware,createRequestBodyParser,createRouteRateLimiter}=require('./api-security');
const {registerWalletRoutes,walletLedgerDocId,WALLET_OFFER_THEMES,WALLET_RECHARGE_OFFER_TYPE,offerDateMilliseconds,parseRupeesToPaise}=require('./wallet-service');
const {registerLiveSessionRoutes,astrologerAvailabilityStatus,scheduledAppointmentStartDeadlineMs}=require('./live-session-service');
const {registerGeoNamesRoutes}=require('./geonames-location-service');
const {isConfiguredAdminIdentity}=require('./admin-auth');
const {getStorage}=require('firebase-admin/storage');
const {inspectSmvAndroidApk,MAX_APK_BYTES,SMV_ANDROID_PACKAGE}=require('./android-app-release');
const {initializeMultiProjectFirestore,resolveWalletDomainDatabase}=require('./multi-project-firestore');
const {buildCustomAccountActionHandlerUrl,buildCustomVerificationHandlerUrl,createAccountActionEmail,createVerificationEmail,createVerificationEmailRateLimiter}=require('./verification-email');
const express = require("express");
const crypto = require("crypto");
const PredictionSynthesis = require("./prediction-synthesis");
const Razorpay = require("razorpay");
const {createOptionalRazorpayRuntime}=require("./razorpay-runtime");
const admin = require("firebase-admin");


const app = express();
const verificationEmailRateLimiter=createVerificationEmailRateLimiter();
const passwordResetEmailRateLimiter=createVerificationEmailRateLimiter();
app.use((req,res,next)=>{
 const started=process.hrtime.bigint();const json=res.json.bind(res);
 res.json=body=>{if(!res.headersSent)res.set('Server-Timing','app;dur='+Number(process.hrtime.bigint()-started)/1e6);return json(body);};next();
});
const PORT = process.env.PORT || 10000;
const IS_STAGING_DEPLOYMENT = String(process.env.NODE_ENV || "").trim().toLowerCase() === "staging" || String(process.env.FIREBASE_PROJECT_ID || "").trim() === "smv-astro-staging";
const ADMIN_UID = String(process.env.ADMIN_UID || (IS_STAGING_DEPLOYMENT ? "" : "TwjeEIFS3Zcf1SxboLZoujm91Ky2")).trim();
const ADMIN_UIDS = new Set([ADMIN_UID, ...String(process.env.ADMIN_UIDS || '').split(',')].map(value => String(value || '').trim()).filter(Boolean));
const ADMIN_AUTH_EMAILS = new Set(String(process.env.ADMIN_AUTH_EMAILS || '').split(',').map(value => String(value || '').trim().toLowerCase()).filter(Boolean));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: String(process.env.FIREBASE_STORAGE_BUCKET || (IS_STAGING_DEPLOYMENT ? 'smv-astro-staging.firebasestorage.app' : 'smv-astro.firebasestorage.app')).trim(),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(process.env.FIREBASE_PRIVATE_KEY || "")
        .replace(/^['"]|['"]$/g, "")
        .replace(/\\n/g, "\n")
        .trim()
    })
  });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM = String(process.env.RESEND_FROM || "onboarding@resend.dev").trim();
const RESEND_TEST_RECIPIENT = String(process.env.RESEND_TEST_RECIPIENT || ADMIN_EMAIL || "").trim();

const PHONE_VERIFICATION_MODE = String(process.env.PHONE_VERIFICATION_MODE || "email_unique").trim().toLowerCase();
const WHATSAPP_OTP_PROVIDER = String(process.env.WHATSAPP_OTP_PROVIDER || "").trim().toLowerCase();

const multiProjectFirestore=initializeMultiProjectFirestore({admin,primaryDb:db,env:process.env});
// Project 5 becomes authoritative for the whole active Wallet + Call/Chat billing domain
// only after the source integration gate, backfill, and dependency checks are all verified.
function walletDomainDb(){
 return resolveWalletDomainDatabase(multiProjectFirestore,db);
}
function contentStoreDb(){return multiProjectFirestore.contentBackfillComplete?multiProjectFirestore.contentDb:db;}
async function mirrorAdminContentPatch(id,patch){
 if(!multiProjectFirestore.enabled||!multiProjectFirestore.contentMirrorWritesEnabled||multiProjectFirestore.contentBackfillComplete)return;
 try{await multiProjectFirestore.contentDb.collection('smv_content').doc(String(id)).set(patch,{merge:true});}
 catch(e){console.warn('[Multi-project Firestore] Content mirror deferred for '+id+':',e?.message||e);}
}
async function mirrorAdminContentDelete(id){
 if(!multiProjectFirestore.enabled||!multiProjectFirestore.contentMirrorWritesEnabled||multiProjectFirestore.contentBackfillComplete)return;
 try{await multiProjectFirestore.contentDb.collection('smv_content').doc(String(id)).delete();}
 catch(e){console.warn('[Multi-project Firestore] Content delete mirror deferred for '+id+':',e?.message||e);}
}
function normalizeRegistrationPhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // SMV ASTRO primarily serves India. Canonicalize common Indian forms so
  // 9876543210, 09876543210, 919876543210 and +91 98765 43210 are identical.
  if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);
  else if (digits.length === 10) digits = "91" + digits;
  if (digits.length < 8 || digits.length > 15) return null;
  return { digits, e164: "+" + digits, hash: crypto.createHash("sha256").update(digits).digest("hex") };
}

async function findExistingPhoneOwners(phoneNorm, currentUid) {
  // Registry is the fast path for all registrations made after this release.
  const regRef = db.collection("smv_phone_registry").doc(phoneNorm.hash);
  const regSnap = await regRef.get();
  if (regSnap.exists) {
    const ownerUid = String(regSnap.data()?.uid || "");
    return { taken: !!ownerUid && ownerUid !== currentUid, ownerUid, regRef };
  }

  // Migration safety for accounts created before the registry existed.
  // Scan only the small user profile fields so a previously-used number cannot
  // be claimed just because it has not yet been backfilled into the registry.
  const snap = await db.collection("smv_users").select("phone","mobile","phoneNormalized").get();
  const owners = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const candidates = [d.phoneNormalized, d.phone, d.mobile].filter(Boolean);
    if (candidates.some(v => normalizeRegistrationPhone(v)?.digits === phoneNorm.digits)) owners.push(doc.id);
  }
  const other = owners.find(uid => uid !== currentUid) || "";
  return { taken: !!other, ownerUid: other || (owners[0] || ""), regRef };
}

async function claimUniquePhoneInTransaction(tx, phoneNorm, uid, role) {
  const regRef = db.collection("smv_phone_registry").doc(phoneNorm.hash);
  const snap = await tx.get(regRef);
  if (snap.exists) {
    const ownerUid = String(snap.data()?.uid || "");
    if (ownerUid && ownerUid !== uid) {
      const err = new Error("PHONE_ALREADY_REGISTERED"); err.code = "PHONE_ALREADY_REGISTERED"; throw err;
    }
  }
  tx.set(regRef, {
    uid, role, phoneNormalized: phoneNorm.e164,
    verificationMode: PHONE_VERIFICATION_MODE === "whatsapp" ? "whatsapp" : "email_unique",
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: snap.exists ? (snap.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp()
  }, { merge: true });
}

function phoneAlreadyRegisteredResponse(res, language="en") {
  const error = language === "ta"
    ? "இந்த மொபைல் எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு மொபைல் எண்ணைப் பயன்படுத்தவும்."
    : "This mobile number is already registered. Please use another mobile number.";
  return res.status(409).json({ error, code: "PHONE_ALREADY_REGISTERED" });
}

// SMTP is retained as an optional fallback for paid Render services. Render Free
// services block outbound SMTP ports 25/465/587, so Resend HTTP API is preferred.
const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER || "").trim();
let smtpTransport = null;
try {
  const nodemailer = require("nodemailer");
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    smtpTransport = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
  }
} catch (_) {}

async function sendEmail({to, subject, text, html, replyTo}) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) throw new Error("No recipient email address is available.");
  if (RESEND_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: recipients,
          subject,
          text,
          html,
          ...(replyTo ? { reply_to: replyTo } : {})
        }),
        signal: controller.signal
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = body?.message || body?.name || `Resend API returned HTTP ${r.status}`;
        throw new Error(msg);
      }
      return body;
    } finally { clearTimeout(timer); }
  }
  if (smtpTransport) {
    return smtpTransport.sendMail({ from: SMTP_FROM, to: recipients, replyTo, subject, text, html });
  }
  throw new Error("Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM in Render.");
}

async function getUserEmail(uid) {
  if (!uid) return "";
  try {
    const u = await admin.auth().getUser(uid);
    if (u?.email) return String(u.email).trim();
  } catch (_) {}
  try {
    const s = await db.collection("smv_users").doc(uid).get();
    return String(s.data()?.email || "").trim();
  } catch (_) { return ""; }
}

function uniqueRecipients(list) {
  return [...new Set((list || []).map(x => String(x || "").trim()).filter(Boolean))];
}

async function sendSystemEmail({ to = [], subject, text, html, replyTo }) {
  const recipients = uniqueRecipients(to);
  if (!recipients.length) return { skipped: true };
  try {
    return await sendEmail({ to: recipients, subject, text, html, replyTo });
  } catch (e) {
    console.error("System email failed:", subject, e?.message || e);
    return { failed: true, error: e?.message || String(e) };
  }
}

async function sendEventEmailOnce({ eventKey, to = [], subject, text, html, replyTo, context = {} }) {
  const recipients = uniqueRecipients(to);
  if (!recipients.length) {
    console.error(`EMAIL RECIPIENT MISSING | Event: ${eventKey} | Context: ${JSON.stringify(context)}`);
    return { skipped: true, reason: "recipient_missing" };
  }
  const safeKey = crypto.createHash("sha256").update(String(eventKey)).digest("hex");
  const ref = db.collection("smv_email_events").doc(safeKey);
  try {
    const claimed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists && ["sending","sent"].includes(String(snap.data()?.state || ""))) return false;
      tx.set(ref, {eventKey:String(eventKey),state:"sending",recipients,subject,context,updatedAt:FieldValue.serverTimestamp(),createdAt:snap.exists?(snap.data()?.createdAt||FieldValue.serverTimestamp()):FieldValue.serverTimestamp()}, {merge:true});
      return true;
    });
    if (!claimed) return { skipped:true, duplicate:true };
    const result = await sendSystemEmail({to:recipients,subject,text,html,replyTo});
    await ref.set({state:result?.failed?"failed":"sent",providerMessageId:result?.id||null,error:result?.error||null,sentAt:result?.failed?null:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    return result;
  } catch (e) {
    await ref.set({state:"failed",error:String(e?.message||e),updatedAt:FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});
    console.error(`EMAIL EVENT FAILED | Event: ${eventKey} |`, e?.message || e);
    return {failed:true,error:e?.message||String(e)};
  }
}


async function sendAdminTransactionEmail({ eventType, paymentId, orderId, amount, currency, questionId, customerEmail, status }) {
  if (!ADMIN_EMAIL) return;
  const subject = `SMV ASTRO Transaction — ${eventType}`;
  const text = [
    "SMV ASTRO Transaction Notification",
    "",
    `Event: ${eventType}`,
    `Status: ${status || eventType}`,
    `Amount: ${amount != null ? `${amount} ${currency || "INR"}` : "N/A"}`,
    `Razorpay Payment ID: ${paymentId || "N/A"}`,
    `Razorpay Order ID: ${orderId || "N/A"}`,
    `Question ID: ${questionId || "N/A"}`,
    `Customer Email: ${customerEmail || "N/A"}`,
    `Time: ${new Date().toISOString()}`
  ].join("\n");
  await sendSystemEmail({ to: [ADMIN_EMAIL], subject, text, replyTo: customerEmail || ADMIN_EMAIL });
}
const razorpayRuntime=createOptionalRazorpayRuntime({
  Razorpay,keyId:RAZORPAY_KEY_ID,keySecret:RAZORPAY_KEY_SECRET
});
const requireRazorpay=razorpayRuntime.requireClient;
if(!razorpayRuntime.configured){
  console.warn("[Razorpay] Render-local Razorpay client is not configured. Cloudflare financial routing remains independent; legacy Render payment routes will return HTTP 503.");
}

// Render terminates TLS and forwards one client-facing proxy hop. This lets rate
// limits distinguish clients without trusting arbitrary X-Forwarded-For entries.
app.set("trust proxy", 1);

// Apply CORS policy before parsing to reject disallowed browser origins early.
app.use(createCorsMiddleware());
app.use(createRouteRateLimiter());
app.use(createRequestBodyParser(express));

// V48 DASHBOARD READ HARDENING
// Admin realtime uses one tiny version document instead of listening to entire
// collections. Bump it only after a successful mutating API response and do the
// write after the response has finished so it never delays Razorpay/payment or
// any other request's critical path.
const DASHBOARD_SIGNAL_PATHS=new Set([
  '/register-customer-profile','/register-astrologer-profile',
  '/admin/appointment-status','/admin/approve-astrologer','/admin/reject-astrologer',
  '/admin/astrologer-pricing','/admin/astrologer-languages','/admin/astrologer-profile-description',
  '/admin/astrologer-profile-permission','/admin/content/save','/admin/content/toggle','/admin/content/delete',
  '/astrologer/change-payout','/admin/payout-change-status','/admin/astrologer-quiz/load-defaults',
  '/admin/astrologer-quiz/questions','/admin/astrologer-quiz/questions/delete',
  '/admin/astrologer-auto-approval/settings','/webhooks/google-form/astrologer-qualification',
  '/astrologer/withdrawal-request','/admin/withdrawal-mark-paid','/admin/dashboard-touch',
  '/appointment-booking','/razorpay/webhook'
]);

// Phase 1: short-lived Admin snapshot cache. It prevents duplicate whole-dashboard
// reads when the same Admin screen is opened/refreshed repeatedly. Every successful
// backend mutation below invalidates it synchronously before the lightweight change
// signal is written, so action results are never served from stale cache.
let adminDataCache={payload:null,expiresAt:0};
function invalidateAdminDataCache(){adminDataCache={payload:null,expiresAt:0};}

function dashboardSignalCategory(path=''){
  const p=String(path||'');
  if(p.includes('/withdrawal')||p.includes('/payout'))return 'withdrawals_payouts';
  if(p.includes('/review'))return 'reviews';
  if(p.includes('/astrologer-quiz/')||p.includes('/astrologer-auto-approval/'))return 'astrologer_settings';
  if(p.includes('/register-astrologer-profile')||p.includes('/google-form/astrologer-qualification')||p.includes('/approve-astrologer')||p.includes('/reject-astrologer')||p.includes('/astrologer-pricing'))return 'astrologers';
  if(p.includes('/wallet/recharge/')||p.includes('/razorpay/webhook')||p.includes('/horoscope-payment/'))return 'financial';
  if(p.includes('/appointment-booking')||p.includes('/appointment-status'))return 'appointments';
  return 'unknown';
}

app.use((req,res,next)=>{
  if(DASHBOARD_SIGNAL_PATHS.has(req.path)){
    res.once('finish',()=>{
      if(res.statusCode>=200 && res.statusCode<300){
        invalidateAdminDataCache();
        setImmediate(()=>db.collection('smv_settings').doc('dashboardChange').set({
          version:FieldValue.increment(1),updatedAt:FieldValue.serverTimestamp(),path:req.path,category:dashboardSignalCategory(req.path)
        },{merge:true}).catch(e=>console.warn('Dashboard change signal skipped:',e?.message||e)));
      }
    });
  }
  next();
});

async function requireUser(req, res) {
  const header = String(req.get("Authorization") || "");
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Login session is missing. Please login again." });
    return null;
  }
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch (e) {
    console.error("Firebase token verification failed:", e?.message || e);
    res.status(401).json({ error: "Login session expired. Please login again." });
    return null;
  }
}

// Send a Firebase-generated verification action through the existing Render Resend sender.
app.post("/auth/send-verification-email", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const identity = await requireUser(req, res);
  if (!identity) return;

  const projectId = String(process.env.FIREBASE_PROJECT_ID || admin.app()?.options?.projectId || "").trim();
  if (projectId !== "smv-astro") {
    return res.status(503).json({
      success: false,
      error: "Custom email verification is enabled only for the SMV ASTRO Production project."
    });
  }

  // This endpoint intentionally uses the existing Render Resend credentials.
  // Do not silently fall back to SMTP or the Resend test sender.
  if (!RESEND_API_KEY || !String(process.env.RESEND_FROM || "").trim()) {
    return res.status(503).json({
      success: false,
      error: "The production verification email sender is not configured."
    });
  }

  try {
    const userRecord = await admin.auth().getUser(identity.uid);
    if (userRecord.disabled) {
      return res.status(403).json({ success: false, error: "This account cannot request email verification." });
    }
    const tokenEmail = String(identity.email || "").trim().toLowerCase();
    const email = String(userRecord.email || "").trim();
    if (!email || !tokenEmail || tokenEmail !== email.toLowerCase()) {
      return res.status(403).json({ success: false, error: "The authenticated account email could not be confirmed." });
    }
    if (userRecord.emailVerified) {
      return res.json({ success: true, ok: true, sent: false, alreadyVerified: true });
    }

    const rate = verificationEmailRateLimiter.reserve(identity.uid);
    if (!rate.allowed) {
      res.set("Retry-After", String(rate.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: rate.reason === "daily_limit"
          ? "The verification email limit has been reached. Please try again later."
          : "A verification email was just requested. Please wait before trying again.",
        retryAfterSeconds: rate.retryAfterSeconds
      });
    }

    const generatedLink = await admin.auth().generateEmailVerificationLink(email);
    const verificationUrl = buildCustomVerificationHandlerUrl(generatedLink);
    const content = createVerificationEmail({ verificationUrl });
    await sendEmail({ to: email, subject: content.subject, text: content.text, html: content.html });
    return res.json({ success: true, ok: true, sent: true });
  } catch (error) {
    console.error("Custom verification email failed:", error?.message || error);
    return res.status(502).json({
      success: false,
      error: "The verification email could not be sent. Please wait and request another link."
    });
  }
});

// Public by design: password-reset users may not be signed in. Always return the
// same response for known/unknown accounts to avoid disclosing account existence.
app.post("/auth/send-password-reset-email", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const genericResponse = () => res.json({
    success: true,
    requested: true,
    message: "If an account exists for that email, password reset instructions will be sent."
  });
  const projectId = String(process.env.FIREBASE_PROJECT_ID || admin.app()?.options?.projectId || "").trim();
  if (projectId !== "smv-astro") {
    return res.status(503).json({ success: false, error: "Custom password reset email is enabled only for the SMV ASTRO Production project." });
  }
  if (!RESEND_API_KEY || !String(process.env.RESEND_FROM || "").trim()) {
    return res.status(503).json({ success: false, error: "The production account email sender is not configured." });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return genericResponse();

  // Hash before using the address as a limiter key; no raw email is retained in
  // the limiter. The route also has a separate per-IP request policy.
  const emailKey = crypto.createHash("sha256").update(email).digest("hex");
  const rate = passwordResetEmailRateLimiter.reserve(emailKey);
  if (!rate.allowed) return genericResponse();

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (lookupError) {
      if (lookupError?.code === "auth/user-not-found") return genericResponse();
      throw lookupError;
    }
    if (!userRecord || userRecord.disabled) return genericResponse();

    const generatedLink = await admin.auth().generatePasswordResetLink(userRecord.email);
    const actionUrl = buildCustomAccountActionHandlerUrl(generatedLink, "resetPassword");
    const content = createAccountActionEmail({ actionUrl, mode: "resetPassword" });
    await sendEmail({ to: userRecord.email, subject: content.subject, text: content.text, html: content.html });
  } catch (error) {
    // Do not reveal whether a Firebase account exists or whether delivery failed.
    console.error("Custom password reset delivery failed.");
  }
  return genericResponse();
});

async function isAdminUser(user) {
  if (!user) return false;
  // Support existing Admins via configured UIDs/verified emails, signed Firebase
  // Admin claims, or the server-managed smv_admins allowlist. Never trust a
  // mutable smv_users.profile role for privileged server-side actions.
  if (isConfiguredAdminIdentity(user, {
    adminUids: ADMIN_UIDS,
    adminEmails: ADMIN_AUTH_EMAILS
  })) return true;
  try {
    const snap = await db.collection('smv_admins').doc(user.uid).get();
    return snap.exists;
  } catch (e) {
    console.error('Admin allowlist lookup failed:', e?.message || e);
    return false;
  }
}

// Return only the authenticated user's Admin status. The Admin SDK checks the
// server-controlled allowlist, so the frontend does not depend on Firestore
// client read rules to decide which dashboard to render.
app.get("/admin/access", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const isAdmin = await isAdminUser(user);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, isAdmin });
  } catch (e) {
    console.error("Admin access check failed:", e?.message || e);
    return res.status(500).json({ success: false, error: "Unable to verify Admin access." });
  }
});

// Resolve the authenticated user's SMV role with the Admin SDK. This is
// authoritative for Phase 1 dashboard routing and avoids depending on client
// Firestore rules or a legacy smv_users.role value that may be stale.
app.get("/account/role", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const uid = String(user.uid || "").trim();
  if (!uid) return res.status(401).json({ success: false, error: "Authentication required." });
  try {
    if (await isAdminUser(user)) {
      res.set("Cache-Control", "no-store");
      return res.json({ success: true, role: "admin" });
    }

    const userSnap = await db.collection("smv_users").doc(uid).get();
    const profile = userSnap.exists ? (userSnap.data() || {}) : {};
    const publicId = String(profile.publicId || "").trim();
    let astroProfile = null;
    let astroCollection = "";

    // Canonical collection plus legacy singular spelling. Never identify an
    // astrologer from collection membership alone unless the record is tied
    // to this UID (or the UID's own unique publicId on a migrated legacy record).
    for (const collectionName of ["smv_astrologers", "smv_astrologer"]) {
      const directAstro = await db.collection(collectionName).doc(uid).get();
      if (directAstro.exists) {
        const candidate = directAstro.data() || {};
        if (!candidate.uid || String(candidate.uid) === uid) {
          astroProfile = candidate;
          astroCollection = collectionName;
          break;
        }
      }
      if (!astroProfile) {
        const byUid = await db.collection(collectionName).where("uid", "==", uid).limit(1).get();
        if (!byUid.empty) {
          const candidate = byUid.docs[0].data() || {};
          if (!candidate.uid || String(candidate.uid) === uid) {
            astroProfile = candidate;
            astroCollection = collectionName;
            break;
          }
        }
      }
      if (!astroProfile && publicId) {
        const byPublicId = await db.collection(collectionName).where("publicId", "==", publicId).limit(1).get();
        if (!byPublicId.empty) {
          const candidate = byPublicId.docs[0].data() || {};
          if ((!candidate.uid || String(candidate.uid) === uid) &&
              String(candidate.publicId || "") === publicId) {
            astroProfile = candidate;
            astroCollection = collectionName;
            break;
          }
        }
      }
    }

    const storedRole = String(profile.role || "").toLowerCase();
    const role = astroProfile || storedRole === "astrologer" ? "astrologer" : "customer";
    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      role,
      profileFound: userSnap.exists,
      astrologerProfileFound: !!astroProfile,
      astrologerProfileCollection: astroCollection || null
    });
  } catch (e) {
    console.error("Authenticated role lookup failed:", e?.message || e);
    return res.status(500).json({ success: false, error: "Unable to verify account role." });
  }
});

function signatureEqual(expected, actual) {
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(String(actual || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Professional public IDs: lowercase, date-free, non-sequential and safe to read/type.
// Excludes visually ambiguous characters 0/o and 1/i/l. 16 base-31 characters
// provide a very large collision space without any Firestore counter read/write.
const SMV_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function smvRandomCode(length = 16) {
  const alphabet = SMV_ID_ALPHABET;
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = "";
  while (out.length < length) {
    const bytes = crypto.randomBytes(Math.max(16, length - out.length));
    for (const value of bytes) {
      if (value >= limit) continue;
      out += alphabet[value % alphabet.length];
      if (out.length >= length) break;
    }
  }
  return out;
}
function newSmvId(prefix) {
  return `${String(prefix || "smv").toLowerCase()}-${smvRandomCode(16)}`;
}

// Customer/Astrologer public IDs are intentionally compact numeric IDs.
// Five digits keeps the requested 4–5 digit style while providing the larger
// collision space. A registry document is claimed in the same registration
// transaction, so two simultaneous registrations cannot receive the same ID.
function newCompactPublicId(prefix) {
  return `${String(prefix || "smv").toLowerCase()}-${crypto.randomInt(10000, 100000)}`;
}
function publicIdCollisionError() {
  const err = new Error("PUBLIC_ID_COLLISION");
  err.code = "PUBLIC_ID_COLLISION";
  return err;
}

// Firestore Admin Timestamp / serialized Timestamp / ISO date normalizer.
// Customer dashboard results must be ordered by real timestamps, never by
// document IDs. Random professional IDs intentionally carry no date/order data.
function smvTimeMillis(value) {
  try {
    if (value == null || value === "") return 0;
    if (typeof value?.toMillis === "function") return Number(value.toMillis()) || 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime() || 0;
    if (value instanceof Date) return value.getTime() || 0;
    if (typeof value === "object") {
      const sec = value.seconds ?? value._seconds;
      const ns = value.nanoseconds ?? value._nanoseconds ?? 0;
      if (sec != null) return Number(sec) * 1000 + Math.floor(Number(ns) / 1e6);
      if (value.timestamp != null) return smvTimeMillis(value.timestamp);
      if (value.date != null) return smvTimeMillis(value.date);
      if (value.value != null) return smvTimeMillis(value.value);
    }
    const n = typeof value === "number" ? value : Date.parse(String(value));
    return Number.isFinite(n) ? n : 0;
  } catch (_e) { return 0; }
}

function smvNewestActivityMillis(item = {}) {
  return smvTimeMillis(
    item.paymentRecordedAt || item.paidAt || item.paymentUpdatedAt ||
    item.commissionCreditedAt || item.customerViewedAt || item.answerApprovedAt || item.answerSubmittedAt ||
    item.adminQuestionApprovedAt || item.questionApprovedAt || item.requestedAt || item.date ||
    item.updatedAt || item.createdAt || item.submittedAt
  );
}
function normalizeSmvLoginId(value, expectedType = "") {
  const raw = String(value || "").trim();
  const type = String(expectedType || "").toLowerCase();
  // Current compact IDs: smvcr-12345 (customer), smvar-12345 (astrologer).
  const currentMatch = raw.match(/^(smvcr|smvar)-\d{5}$/i);
  if (currentMatch) {
    const currentType = currentMatch[1].toLowerCase() === "smvar" ? "ast" : "cus";
    if (!type || currentType === type) return raw.toLowerCase();
  }
  // Backward compatibility for V198/V199 compact IDs.
  const compactMatch = raw.match(/^smv-(cus|ast)-\d{4,5}$/i);
  if (compactMatch && (!type || compactMatch[1].toLowerCase() === type)) return raw.toLowerCase();
  // Keep V196/V197 random IDs valid for accounts already created during that rollout.
  const randomMatch = raw.match(/^smv-(cus|ast)-[2-9a-hj-km-np-z]{8,32}$/i);
  if (randomMatch && (!type || randomMatch[1].toLowerCase() === type)) return raw.toLowerCase();
  // Keep the older dated uppercase IDs valid as well.
  const oldMatch = raw.match(/^SMV-(CUS|AST)-\d{8}-\d{2,}$/i);
  if (oldMatch && (!type || oldMatch[1].toLowerCase() === type)) return raw.toUpperCase();
  return "";
}


// Registration profile endpoints: Firestore profile/counter writes are performed
// server-side with Firebase Admin SDK so customer/astrologer registration does
// not depend on client Firestore Rules for protected counter/profile writes.
function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date).reduce((o, p) => { o[p.type] = p.value; return o; }, {});
  return `${parts.day}${parts.month}${parts.year}`;
}

function nextCustomerId() {
  return newCompactPublicId("smvcr");
}

app.post("/lookup-customer-login", async (req, res) => {
  try {
    const customerId = normalizeSmvLoginId(req.body?.customerId, "cus");
    if (!customerId) {
      return res.status(400).json({ error: "Enter a valid Customer ID, for example smvcr-48372." });
    }
    const snap = await db.collection("smv_users").where("publicId", "==", customerId).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "Customer ID was not found. Please check your Customer ID." });
    const data = snap.docs[0].data() || {};
    if (String(data.role || "").toLowerCase() !== "customer") return res.status(403).json({ error: "This ID is not a customer login ID." });
    const uid = String(data.uid || snap.docs[0].id);
    const user = await admin.auth().getUser(uid);
    if (!user.email) return res.status(400).json({ error: "This Customer account has no login email configured." });
    return res.json({ ok: true, email: user.email, customerId });
  } catch (e) {
    console.error("Customer ID lookup error:", e);
    return res.status(500).json({ error: "Customer ID login lookup failed. Please try again." });
  }
});

function nextPublicId(prefix) {
  return String(prefix || "").toUpperCase() === "AT" ? newCompactPublicId("smvar") : newCompactPublicId("smvcr");
}

app.post("/lookup-id-login", async (req, res) => {
  try {
    const rawPublicId = String(req.body?.publicId || "").trim();
    const publicId = normalizeSmvLoginId(rawPublicId);
    if (!publicId) {
      return res.status(400).json({ error: "Enter a valid Customer or Astrologer ID." });
    }
    const snap = await db.collection("smv_users").where("publicId", "==", publicId).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "This ID was not found. Please check the ID and try again." });
    const data = snap.docs[0].data() || {};
    const expectedRole = /^(?:smvar-|smv-ast-)/i.test(publicId) ? "astrologer" : "customer";
    if (String(data.role || "").toLowerCase() !== expectedRole) return res.status(403).json({ error: "This ID is not valid for this login type." });
    const uid = String(data.uid || snap.docs[0].id);
    const user = await admin.auth().getUser(uid);
    if (!user.email) return res.status(400).json({ error: "This account has no login email configured." });
    return res.json({ ok: true, email: user.email, publicId, role: expectedRole });
  } catch (e) {
    console.error("ID login lookup error:", e);
    return res.status(500).json({ error: "ID login lookup failed. Please try again." });
  }
});

app.post("/register-customer-profile", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    if (!name || name.length > 120) return res.status(400).json({ error: "A valid customer name is required." });
    const phoneNorm = normalizeRegistrationPhone(phone);
    if (!phoneNorm) return res.status(400).json({ error: "Enter a valid mobile number." });
    const ref = db.collection("smv_users").doc(user.uid);
    const existing = await ref.get();
    const existingRole = existing.exists ? String(existing.data()?.role || "").toLowerCase() : "";
    if (existing.exists && existingRole && existingRole !== "customer") return res.status(409).json({ error: "This Firebase account already belongs to a different SMV ASTRO role. Please use the correct account." });
    if (existing.exists && existingRole === "customer" && existing.data()?.publicId) {
      await ref.set({ name, fullName: name, displayName: name, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ ok: true, alreadyRegistered: true, publicId: existing.data().publicId });
    }
    const preflight = await findExistingPhoneOwners(phoneNorm, user.uid);
    if (preflight.taken) return phoneAlreadyRegisteredResponse(res, req.body?.language === "ta" ? "ta" : "en");
    let publicId = "";
    let registered = false;
    for (let attempt = 0; attempt < 20 && !registered; attempt++) {
      publicId = nextCustomerId();
      try {
        await db.runTransaction(async tx => {
          const publicIdRef = db.collection("smv_public_ids").doc(publicId);
          const walletRef = db.collection("smv_wallets").doc(user.uid);
          // Wallet creation stays on Project 1 only before cutover; after cutover the
          // Wallet service lazily creates it in the same domain as all later debits/credits.
          const walletRead = multiProjectFirestore.walletDomainCutoverComplete ? Promise.resolve({ exists: false }) : tx.get(walletRef);
          const [publicIdSnap, walletSnap] = await Promise.all([tx.get(publicIdRef), walletRead]);
          if (publicIdSnap.exists) throw publicIdCollisionError();
          // This helper performs the last transaction read and then claims the unique phone.
          await claimUniquePhoneInTransaction(tx, phoneNorm, user.uid, "customer");
          tx.set(publicIdRef, { publicId, uid:user.uid, role:"customer", createdAt:FieldValue.serverTimestamp() });
          tx.set(ref, {
            uid: user.uid, name, phone: phoneNorm.e164, mobile: phoneNorm.e164, phoneNormalized: phoneNorm.e164,
            email: user.email || "", role: "customer", status: "active", publicId, customerId: publicId,
            emailVerificationRequired: true,
            phoneVerificationRequired: PHONE_VERIFICATION_MODE === "whatsapp",
            phoneVerified: false,
            verificationMethod: PHONE_VERIFICATION_MODE === "whatsapp" ? "whatsapp" : "email",
            createdAt: existing.exists ? (existing.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          // New registrations start with a zero-cash, zero-bonus Wallet.
          // Existing Wallet balances (including historical credits) are never clawed back.
          if (!walletSnap.exists && !multiProjectFirestore.walletDomainCutoverComplete) {
            const now = FieldValue.serverTimestamp();
            tx.create(walletRef, {
              ownerUid: user.uid, ownerRole: "customer", currency: "INR",
              availableBalancePaise: 0, reservedBalancePaise: 0,
              bonusMinutesBalance: 0, reservedBonusMinutes: 0, version: 1,
              createdAt: now, updatedAt: now
            });
          }
        });
        registered = true;
      } catch (e) {
        if (e?.code === "PUBLIC_ID_COLLISION" || e?.message === "PUBLIC_ID_COLLISION") continue;
        throw e;
      }
    }
    if (!registered) throw new Error("Unable to allocate a unique Customer ID. Please try again.");
    return res.json({ ok: true, publicId, phone: phoneNorm.e164, phoneVerificationMode: PHONE_VERIFICATION_MODE });
  } catch (e) {
    if (e?.code === "PHONE_ALREADY_REGISTERED" || e?.message === "PHONE_ALREADY_REGISTERED") return phoneAlreadyRegisteredResponse(res, req.body?.language === "ta" ? "ta" : "en");
    console.error("Customer registration profile error:", e);
    return res.status(500).json({ error: "Customer profile setup failed on the server. Please try again." });
  }
});

app.post("/register-astrologer-profile", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const b = req.body || {};
    const name=String(b.name||"").trim(), mobile=String(b.mobile||"").trim(), specialization=String(b.specialization||"").trim();
    const experience=Number(b.experience||0), bio=String(b.bio||"").trim();
    const rawLanguages=Array.isArray(b.languages)?b.languages:String(b.languages||"").split(/[,;|]/);
    const languages=[...new Set(rawLanguages.map(v=>String(v||"").trim().replace(/\s+/g," ")).filter(Boolean))];
    if(!languages.length||languages.length>12||languages.some(v=>v.length>40)||languages.join(", ").length>240)return res.status(400).json({error:"Enter 1–12 spoken languages, each up to 40 characters."});
    const bankName=String(b.bankName||"").trim(), accountName=String(b.accountName||"").trim(), accountNumber=String(b.accountNumber||"").trim(), ifsc=String(b.ifsc||"").trim(), upi=String(b.upi||"").trim(), photoData=String(b.photoData||"");
    if(!name||!mobile||!specialization||!bio||!bankName||!accountName||!accountNumber||!ifsc||!photoData) return res.status(400).json({error:"Please complete all required astrologer registration details."});
    if(!Number.isFinite(experience)||experience<0) return res.status(400).json({error:"Invalid experience."});
    const phoneNorm = normalizeRegistrationPhone(mobile);
    if(!phoneNorm) return res.status(400).json({error:"Enter a valid mobile number."});
    const userRef=db.collection("smv_users").doc(user.uid), astroRef=db.collection("smv_astrologers").doc(user.uid), payoutRef=db.collection("smv_payouts").doc(user.uid);
    const existing=await userRef.get();
    const existingRole=existing.exists?String(existing.data()?.role||"").toLowerCase():"";
    if(existing.exists && existingRole && existingRole!=="astrologer") return res.status(409).json({error:"This Firebase account already belongs to a different SMV ASTRO role. Please use the correct account."});
    if(existing.exists && existingRole==="astrologer" && existing.data()?.publicId){
      const repair={
        uid:user.uid,name,fullName:name,displayName:name,specialization,expertise:specialization,
        experience,experienceYears:experience,languages,spokenLanguages:languages,bio,about:bio,
        updatedAt:FieldValue.serverTimestamp()
      };
      await Promise.all([
        userRef.set({name,fullName:name,displayName:name,languages,spokenLanguages:languages,updatedAt:FieldValue.serverTimestamp()},{merge:true}),
        astroRef.set(repair,{merge:true})
      ]);
      return res.json({ok:true,alreadyRegistered:true,publicId:existing.data().publicId,name,languages});
    }
    const preflight = await findExistingPhoneOwners(phoneNorm, user.uid);
    if (preflight.taken) return phoneAlreadyRegisteredResponse(res, b.language === "ta" ? "ta" : "en");
    let publicId="";
    let registered=false;
    const notificationRef=db.collection("smv_notifications").doc(user.uid+"_"+Date.now());
    for(let attempt=0;attempt<20&&!registered;attempt++){
      publicId=nextPublicId("AT");
      try{
        await db.runTransaction(async tx => {
          const publicIdRef=db.collection("smv_public_ids").doc(publicId);
          const publicIdSnap=await tx.get(publicIdRef);
          if(publicIdSnap.exists)throw publicIdCollisionError();
          await claimUniquePhoneInTransaction(tx, phoneNorm, user.uid, "astrologer");
          tx.set(publicIdRef,{publicId,uid:user.uid,role:"astrologer",createdAt:FieldValue.serverTimestamp()});
          tx.set(userRef,{uid:user.uid,name,phone:phoneNorm.e164,mobile:phoneNorm.e164,phoneNormalized:phoneNorm.e164,email:user.email||"",publicId,role:"astrologer",status:"pending",languages,spokenLanguages:languages,emailVerificationRequired:true,phoneVerificationRequired:PHONE_VERIFICATION_MODE === "whatsapp",phoneVerified:false,verificationMethod:PHONE_VERIFICATION_MODE === "whatsapp" ? "whatsapp" : "email",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
          tx.set(astroRef,{uid:user.uid,name,publicId,specialization,expertise:specialization,experience,languages,spokenLanguages:languages,about:bio,bio,photoData,status:"pending",role:"astrologer",createdAt:FieldValue.serverTimestamp()},{merge:true});
          tx.set(payoutRef,{uid:user.uid,bankName,accountName,accountNumber,ifsc,upi,updatedAt:FieldValue.serverTimestamp(),status:"pending_admin_review"},{merge:true});
          tx.set(notificationRef,{userId:user.uid,type:"registration",title:"Registration submitted",message:"Your astrologer application is pending Admin approval.",createdAt:FieldValue.serverTimestamp(),read:false});
        });
        registered=true;
      }catch(e){
        if(e?.code==="PUBLIC_ID_COLLISION"||e?.message==="PUBLIC_ID_COLLISION")continue;
        throw e;
      }
    }
    if(!registered)throw new Error("Unable to allocate a unique Astrologer ID. Please try again.");
    return res.json({ok:true,publicId,phone:phoneNorm.e164,phoneVerificationMode:PHONE_VERIFICATION_MODE});
  } catch(e){
    if (e?.code === "PHONE_ALREADY_REGISTERED" || e?.message === "PHONE_ALREADY_REGISTERED") return phoneAlreadyRegisteredResponse(res, req.body?.language === "ta" ? "ta" : "en");
    console.error("Astrologer registration profile error:",e); return res.status(500).json({error:"Astrologer profile setup failed on the server. Please try again."});
  }
});


app.get("/public/registration-config", (req,res)=>res.set("Cache-Control","no-store").json({
  emailVerificationRequired:true,
  onePhoneOneAccount:true,
  phoneVerificationMode: PHONE_VERIFICATION_MODE === "whatsapp" ? "whatsapp" : "email_unique",
  whatsappOtpEnabled: PHONE_VERIFICATION_MODE === "whatsapp",
  whatsappProviderConfigured: !!WHATSAPP_OTP_PROVIDER
}));

app.get('/api/smv-mode', (req,res)=>res.set('Cache-Control','no-store').json({mode:'server',backend:'https://smvastroservices.onrender.com'}));

app.get("/", (req, res) => res.status(200).json({
  service: "SMV ASTRO Razorpay Backend",
  version: "20260913-refund-v5-email-mobile-unique-v6",
  status: "online",
  razorpay: "enabled",
  firebase: "enabled"
}));

app.get("/test-razorpay", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access required." });
  try {
    if (!razorpayRuntime.configured) return res.status(503).json({ ok: false, code: "RAZORPAY_NOT_CONFIGURED", error: "Razorpay is not configured on this Render service." });
    const mode = RAZORPAY_KEY_ID.startsWith("rzp_test_") ? "test" : (RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "live" : "unknown");
    if (IS_STAGING_DEPLOYMENT) {
      if (mode !== 'test') return res.status(503).json({ok:false,mode,error:'Staging accepts Razorpay Test Mode credentials only.'});
    } else if (mode !== 'live') {
      return res.status(503).json({ok:false,mode,error:'This deployed backend is using '+mode+' credentials. Live credentials are required.'});
    }
    await requireRazorpay().orders.all({ count: 1 });
    return res.json({ ok: true, mode, keyPrefix: RAZORPAY_KEY_ID.slice(0, 9), message: `Razorpay ${mode} credentials accepted by Render.` });
  } catch (e) {
    console.error("Razorpay connection test failed:", e);
    return res.status(502).json({ error: e?.error?.description || e?.description || e?.message || "Razorpay connection failed." });
  }
});


function escapeHtmlEmail(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}


app.post("/contact-query", express.json({ limit: "20kb" }), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const place = String(req.body?.place || "").trim();
    const mobile = String(req.body?.mobile || "").trim();
    const query = String(req.body?.query || "").trim();

    if (!name || !email || !place || !mobile || !query) {
      return res.status(400).json({ error: "Please fill all required fields." });
    }
    if (name.length > 100 || email.length > 160 || place.length > 120 || mobile.length > 20 || query.length > 3000) {
      return res.status(400).json({ error: "One or more fields are too long." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!ADMIN_EMAIL || (!RESEND_API_KEY && !smtpTransport)) {
      console.error("Contact email configuration is missing. Set ADMIN_EMAIL and RESEND_API_KEY/RESEND_FROM in Render.");
      return res.status(503).json({ error: "Email service is not configured. Add RESEND_API_KEY and RESEND_FROM in Render." });
    }

    const ref = db.collection("contactQueries").doc();
    const createdAt = FieldValue.serverTimestamp();
    await ref.set({
      name, email, place, mobile, query,
      status: "new",
      createdAt,
      source: "website-contact-form"
    });

    const subject = "SMV ASTRO Query";
    const text = [
      "SMV ASTRO QUERY",
      "Hello.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Place: ${place}`,
      `Mobile: ${mobile}`,
      "",
      "Query:",
      query,
      "",
      `Query ID: ${ref.id}`
    ].join("\n");

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="color:#7e1818">SMV ASTRO QUERY</h2>
        <p>Hello.</p>
        <p><b>Name:</b> ${escapeHtmlEmail(name)}</p>
        <p><b>Email:</b> ${escapeHtmlEmail(email)}</p>
        <p><b>Place:</b> ${escapeHtmlEmail(place)}</p>
        <p><b>Mobile:</b> ${escapeHtmlEmail(mobile)}</p>
        <p><b>Query:</b></p>
        <div style="white-space:pre-wrap;border:1px solid #ddd;padding:12px;border-radius:8px">${escapeHtmlEmail(query)}</div>
        <p><small>Query ID: ${escapeHtmlEmail(ref.id)}</small></p>
      </div>`;

    const contactRecipient = RESEND_API_KEY ? (RESEND_TEST_RECIPIENT || ADMIN_EMAIL) : ADMIN_EMAIL;
    await sendEmail({ to: contactRecipient, replyTo: email, subject, text, html: htmlBody });

    return res.status(200).json({ ok: true, queryId: ref.id });
  } catch (e) {
    console.error("Contact query failed:", e);
    return res.status(502).json({ error: e?.message || "Unable to send your query right now. Please try again later." });
  }
});








async function writeAdminAudit(action, questionId, userId, details = {}) {
  try {
    await db.collection("smv_admin_audit").add({
      action, questionId: questionId || null, actorUid: userId || null,
      details, createdAt: FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Admin audit write issue:", e?.message || e);
  }
}

function scheduledBookingReadStatus(appointment, nowMs = Date.now()) {
  const a = appointment || {};
  const status = String(a.bookingStatus || 'requested').toLowerCase();
  if (!['requested', 'accepted'].includes(status) || a.liveSessionId) return status;
  const deadline = scheduledAppointmentStartDeadlineMs(a);
  return deadline > 0 && Number(nowMs) >= deadline ? 'missed_by_astrologer' : status;
}

function nextBookingId() {
  const dateKey = indiaDateKey();
  const ref = db.collection("smv_counters").doc(`booking_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `SMV-BKG-${dateKey}-${String(next).padStart(2, "0")}`;
  });
}

app.get("/astrologer/appointments", async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  try{
    const uid=String(user.uid||"").trim();
    const [userSnap,astroSnap]=await Promise.all([
      db.collection("smv_users").doc(uid).get(),
      db.collection("smv_astrologers").doc(uid).get()
    ]);
    const userProfile=userSnap.exists?(userSnap.data()||{}):{};
    const astro=astroSnap.exists?(astroSnap.data()||{}):{};
    if(String(userProfile.role||"").toLowerCase()!=="astrologer"&&String(astro.role||"").toLowerCase()!=="astrologer"){
      return res.status(403).json({success:false,error:"Astrologer access required."});
    }
    const snap=await db.collection("smv_appointments").where("astrologerUid","==",uid).limit(100).get();
    const appointments=snap.docs.map(d=>{
      const a=d.data()||{};
      const bookingStatus=scheduledBookingReadStatus(a);
      const missed=bookingStatus==='missed_by_astrologer';
      return {
        id:d.id,bookingId:String(a.bookingId||d.id),type:String(a.type||""),bookingKind:String(a.bookingKind||""),
        name:String(a.name||""),
        preferredDate:String(a.preferredDate||""),preferredTime:String(a.preferredTime||""),
        question:String(a.question||""),notes:String(a.notes||""),birthDetails:a.birthDetails||null,
        status:missed?'missed':String(a.status||"new"),bookingStatus,missedReason:missed?'astrologer_not_connected_within_grace':String(a.missedReason||''),notes:String(a.notes||''),scheduledMinutes:Number(a.scheduledMinutes||5),liveSessionId:String(a.liveSessionId||""),createdAt:a.createdAt||null
      };
    }).sort((a,b)=>{
      const time=v=>typeof v?.toMillis==="function"?v.toMillis():Date.parse(v||"")||0;
      return time(b.createdAt)-time(a.createdAt);
    });
    return res.set("Cache-Control","no-store").json({success:true,appointments});
  }catch(e){
    console.error("Astrologer scheduled bookings load failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to load your scheduled Call/Chat bookings."});
  }
});

app.get("/customer/appointments", async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  try{
    const uid=String(user.uid||"").trim();
    const userSnap=await db.collection("smv_users").doc(uid).get();
    const profile=userSnap.exists?(userSnap.data()||{}):{};
    if(String(profile.role||"").toLowerCase()!=="customer"){
      return res.status(403).json({success:false,error:"Customer access required."});
    }
    const snap=await db.collection("smv_appointments").where("customerUid","==",uid).limit(100).get();
    const appointments=snap.docs.map(d=>{
      const a=d.data()||{};
      const bookingStatus=scheduledBookingReadStatus(a);
      const missed=bookingStatus==='missed_by_astrologer';
      return {
        id:d.id,bookingId:String(a.bookingId||d.id),type:String(a.type||""),
        bookingKind:String(a.bookingKind||""),astrologerId:String(a.astrologerId||a.astrologerUid||""),
        astrologerName:String(a.astrologerName||"Astrologer"),
        preferredDate:String(a.preferredDate||""),preferredTime:String(a.preferredTime||""),
        scheduledMinutes:Number(a.scheduledMinutes||5),
        bookingStatus,status:missed?'missed':String(a.status||"new"),missedReason:missed?'astrologer_not_connected_within_grace':String(a.missedReason||''),notes:String(a.notes||''),
        liveSessionId:String(a.liveSessionId||""),liveBookingId:String(a.liveBookingId||""),
        createdAt:a.createdAt||null
      };
    }).filter(a=>["scheduled_call_request","scheduled_chat_request"].includes(a.bookingKind))
      .sort((a,b)=>{
        const time=v=>typeof v?.toMillis==="function"?v.toMillis():Date.parse(v||"")||0;
        return time(b.createdAt)-time(a.createdAt);
      });
    return res.set("Cache-Control","no-store").json({success:true,appointments});
  }catch(e){
    console.error("Customer scheduled bookings load failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to load your scheduled Call/Chat bookings."});
  }
});

app.post("/astrologer/appointments/:id/respond", async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  try{
    const uid=String(user.uid||"").trim();
    const action=String(req.body?.action||"").trim().toLowerCase();
    if(!["accept","reject"].includes(action))return res.status(400).json({success:false,error:"Choose Accept or Reject."});
    const [userSnap,astroSnap]=await Promise.all([
      db.collection("smv_users").doc(uid).get(),
      db.collection("smv_astrologers").doc(uid).get()
    ]);
    const userProfile=userSnap.exists?(userSnap.data()||{}):{};
    const astro=astroSnap.exists?(astroSnap.data()||{}):{};
    if(String(userProfile.role||"").toLowerCase()!=="astrologer"&&String(astro.role||"").toLowerCase()!=="astrologer"){
      return res.status(403).json({success:false,error:"Astrologer access required."});
    }
    const ref=db.collection("smv_appointments").doc(String(req.params.id||"").trim());
    const outcome=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)return {errorStatus:404,error:"Scheduled booking not found."};
      const a=snap.data()||{};
      if(String(a.astrologerUid||"")!==uid)return {errorStatus:403,error:"This booking belongs to another Astrologer."};
      if(!["scheduled_call_request","scheduled_chat_request"].includes(String(a.bookingKind||""))){
        return {errorStatus:400,error:"This record is not a scheduled Call/Chat booking."};
      }
      const current=String(a.bookingStatus||"requested").toLowerCase();
      const target=action==="accept"?"accepted":"rejected";
      const startDeadline=scheduledAppointmentStartDeadlineMs(a);
      if(action==="accept"&&current==="requested"&&!a.liveSessionId&&startDeadline>0&&Date.now()>=startDeadline){
        tx.update(ref,{
          bookingStatus:"missed_by_astrologer",status:"missed",
          missedReason:"astrologer_not_connected_within_grace",
          missedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
        });
        return {errorStatus:409,error:"The 2-minute window after the scheduled time has passed. This booking is marked as missed because the Astrologer did not accept/start it in time.",bookingStatus:"missed_by_astrologer"};
      }
      if(current===target)return {success:true,alreadyProcessed:true,appointmentId:ref.id,bookingStatus:target};
      if(current!=="requested")return {errorStatus:409,error:"This booking is already "+current.replaceAll("_"," ")+".",bookingStatus:current};
      tx.update(ref,{
        bookingStatus:target,status:target,respondedAt:FieldValue.serverTimestamp(),
        respondedBy:uid,updatedAt:FieldValue.serverTimestamp()
      });
      return {success:true,alreadyProcessed:false,appointmentId:ref.id,bookingStatus:target};
    });
    if(outcome.errorStatus)return res.status(outcome.errorStatus).json({success:false,error:outcome.error});
    return res.set("Cache-Control","no-store").json(outcome);
  }catch(e){
    console.error("Astrologer scheduled booking response failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to update this scheduled booking."});
  }
});

app.post("/appointment-booking", express.json({ limit: "20kb" }), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const name=String(req.body?.name||"").trim(), email=String(user.email||req.body?.email||"").trim(), mobile=String(req.body?.mobile||"").trim();
    const type=String(req.body?.type||"").trim(), preferredDate=String(req.body?.preferredDate||"").trim(), preferredTime=String(req.body?.preferredTime||"").trim(), notes=String(req.body?.notes||"").trim(), question=String(req.body?.question||"").trim();
    const scheduledMinutes=Number(req.body?.scheduledMinutes||5);
    const astrologerId=String(req.body?.astrologerId||"").trim();
    const birthDate=String(req.body?.birthDate||"").trim(), birthTime=String(req.body?.birthTime||"").trim(), birthPlace=String(req.body?.birthPlace||"").trim();
    const birthLatitudeRaw=String(req.body?.birthLatitude||"").trim(), birthLongitudeRaw=String(req.body?.birthLongitude||"").trim(), birthTimezone=String(req.body?.birthTimezone||"").trim();
    if(!name||(!String(req.body?.astrologerId||"").trim()&&(!email||!mobile))||!type||!preferredDate||!preferredTime) return res.status(400).json({error:"Please fill all required appointment fields."});
    if(!["Chat Consultation","Call Consultation"].includes(type)) return res.status(400).json({error:"Please choose Chat or Call consultation."});
    if(name.length>100||email.length>160||(!astrologerId&&mobile.length>20)||notes.length>2000||question.length>4000) return res.status(400).json({error:"One or more fields are too long."});
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Please enter a valid email address."});

    // A directory Book a Call request must be linked to a Customer, approved
    // Astrologer and configured per-minute rate. It is a request, not a live call or Wallet debit.
    let callBooking={};
    if(astrologerId){
      if(!["Call Consultation","Chat Consultation"].includes(type))return res.status(400).json({error:"Choose a Call or Chat booking type."});
      if(!Number.isSafeInteger(scheduledMinutes)||scheduledMinutes<1||scheduledMinutes>1440)return res.status(400).json({error:"Choose a session duration from 1 to 1440 minutes."});
      const scheduleEpoch=Date.parse(preferredDate+"T"+preferredTime+":00+05:30");
      const dateParts=preferredDate.split("-").map(Number),timeParts=preferredTime.split(":").map(Number);
      const validDateShape=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(preferredDate)&&dateParts.length===3&&(()=>{const d=new Date(Date.UTC(dateParts[0],dateParts[1]-1,dateParts[2]));return d.getUTCFullYear()===dateParts[0]&&d.getUTCMonth()===dateParts[1]-1&&d.getUTCDate()===dateParts[2];})();
      const validTimeShape=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(preferredTime)&&timeParts.length===2;
      if(!validDateShape||!validTimeShape||!Number.isFinite(scheduleEpoch)||scheduleEpoch<=Date.now())return res.status(400).json({error:"Choose a valid future scheduled date and time."});
      // Notes are optional for both Call and Chat bookings. Keep accepting a legacy question field from older clients.
      const birthTodayParts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).reduce((o,p)=>{o[p.type]=p.value;return o;},{});
      const birthTodayIso=`${birthTodayParts.year}-${birthTodayParts.month}-${birthTodayParts.day}`;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||Number.isNaN(Date.parse(birthDate+"T00:00:00Z"))||new Date(birthDate+"T00:00:00Z").toISOString().slice(0,10)!==birthDate||birthDate>birthTodayIso){
        return res.status(400).json({error:"Enter a valid Date of Birth that is not in the future."});
      }
      if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)){
        return res.status(400).json({error:"Enter a valid Time of Birth."});
      }
      if(!birthPlace||birthPlace.length>200){
        return res.status(400).json({error:"Enter your Birth Place (up to 200 characters)."});
      }
      if(Boolean(birthLatitudeRaw)!==Boolean(birthLongitudeRaw)){
        return res.status(400).json({error:"Birth-place latitude and longitude must be supplied together."});
      }
      let birthLatitude=null,birthLongitude=null;
      if(birthLatitudeRaw){
        birthLatitude=Number(birthLatitudeRaw);birthLongitude=Number(birthLongitudeRaw);
        if(!Number.isFinite(birthLatitude)||birthLatitude < -90||birthLatitude > 90||!Number.isFinite(birthLongitude)||birthLongitude < -180||birthLongitude > 180){
          return res.status(400).json({error:"Birth Place coordinates are invalid. Select the place from search again."});
        }
      }
      if(birthTimezone){
        try{new Intl.DateTimeFormat("en",{timeZone:birthTimezone});}
        catch{return res.status(400).json({error:"Birth Place time zone is invalid. Select the place from search again."});}
      }
      const [astroSnap,customerSnap]=await Promise.all([
        db.collection("smv_astrologers").doc(astrologerId).get(),
        db.collection("smv_users").doc(user.uid).get()
      ]);
      const customer=customerSnap.exists?(customerSnap.data()||{}):{};
      if(String(customer.role||"").toLowerCase()!=="customer")return res.status(403).json({error:"Please sign in with a Customer account to book a call."});
      if(!astroSnap.exists)return res.status(404).json({error:"The selected Astrologer profile was not found."});
      const astro=astroSnap.data()||{};
      if(!["approved","active"].includes(String(astro.status||"").toLowerCase()))return res.status(409).json({error:"This Astrologer is not currently approved for bookings."});
      const liveCallEnabled=astro.liveCallEnabled===true,liveChatEnabled=astro.liveChatEnabled===true;
      const selectedModeEnabled=type==="Chat Consultation"?liveChatEnabled:liveCallEnabled;
      if(!selectedModeEnabled){
        return res.status(409).json({error:"This Astrologer has not enabled "+(type==="Chat Consultation"?"Live Chat":"Live Call")+"."});
      }
      const rates=(type==="Chat Consultation"
        ? [astro.chatPricePerMinute,astro.liveChatPricePerMinute,astro.chatRatePerMinute]
        : [astro.callPricePerMinute,astro.pricePerMinute,astro.callRatePerMinute]).map(Number);
      const pricePerMinute=rates.find(value=>Number.isFinite(value)&&value>0);
      const bookingLabel=type==="Chat Consultation"?"Chat":"Call";
      if(!pricePerMinute)return res.status(409).json({error:"This Astrologer does not have a configured "+bookingLabel+" Price per minute yet."});
      callBooking={
        astrologerId:astroSnap.id,astrologerUid:String(astro.uid||astroSnap.id),
        astrologerName:String(astro.name||"Astrologer"),
        pricePerMinute:Math.round(pricePerMinute*100)/100,
        priceUnit:"per_minute",bookingKind:type==="Chat Consultation"?"scheduled_chat_request":"scheduled_call_request",
        ...(type==="Call Consultation"?{callPricePerMinute:Math.round(pricePerMinute*100)/100}:{chatPricePerMinute:Math.round(pricePerMinute*100)/100,...(question?{question}:{})}),
        birthDetails:{birthDate,birthTime,birthPlace,birthLatitude,birthLongitude,birthTimezone}
      };
    }
    const bookingId = await nextBookingId();
    const ref=db.collection("smv_appointments").doc();
    const data={bookingId,customerUid:user.uid,customerEmail:user.email||email,name,...(astrologerId?{}:{email,mobile}),type,...callBooking,preferredDate,preferredTime,scheduledMinutes:astrologerId?scheduledMinutes:null,notes,question:astrologerId&&type==="Chat Consultation"?question:"",status:"new",paymentStatus:astrologerId?"not_started":"not_required",bookingStatus:"requested",createdAt:FieldValue.serverTimestamp(),source:"website-appointment-form",updatedAt:FieldValue.serverTimestamp()};
    await ref.set(data);
    if (multiProjectFirestore.walletDomainCutoverComplete) {
      await walletDomainDb().collection("smv_appointments").doc(ref.id).set(data, { merge: true })
        .catch(error => console.warn("Scheduled Call/Chat booking domain mirror deferred:", error?.message || error));
    }

    // Send the Astrologer a background push after a durable scheduled-booking write.
    // The live-session service treats push as best-effort so a provider outage never
    // rolls back the Customer's booking.
    if (callBooking.astrologerUid && ['scheduled_call_request', 'scheduled_chat_request'].includes(String(callBooking.bookingKind || ''))) {
      const scheduledMode = callBooking.bookingKind === 'scheduled_chat_request' ? 'chat' : 'call';
      void liveSessionService.notifyAstrologerPush(callBooking.astrologerUid, {
        type: 'scheduled_booking', mode: scheduledMode, bookingId: ref.id,
        title: 'New Scheduled ' + scheduledMode.toUpperCase() + ' Booking',
        body: 'A Customer has requested a scheduled ' + scheduledMode.toUpperCase() + ' for ' + preferredDate + ' at ' + preferredTime + ' IST. Open SMV ASTRO to review.',
        tag: 'smv-scheduled-' + ref.id
      });
    }

    // Email notification is best-effort. Booking creation must not fail just because
    // the optional notification provider is unavailable.
    if(ADMIN_EMAIL && (RESEND_API_KEY || smtpTransport)){
      try {
        await sendEmail({to:ADMIN_EMAIL,replyTo:email,subject:`SMV ASTRO ${type} Booking — ${bookingId}`,text:["New SMV ASTRO Booking Request","",`Booking ID: ${bookingId}`,`Customer UID: ${user.uid}`,`Name: ${name}`,`Email: ${email}`,`Mobile: ${astrologerId ? "Not collected for scheduled Call/Chat bookings" : mobile}`,`Type: ${type}`,`Booking kind: ${callBooking.bookingKind||"general_appointment"}`,`Astrologer: ${callBooking.astrologerName||"Not specified"}`,`Call/Chat rate: ${callBooking.pricePerMinute?"₹"+callBooking.pricePerMinute+" per minute":"Not applicable"}`,`Question: ${callBooking.question||"Not applicable"}`,`Birth Date: ${callBooking.birthDetails?.birthDate||"Not provided"}`,`Birth Time: ${callBooking.birthDetails?.birthTime||"Not provided"}`,`Birth Place: ${callBooking.birthDetails?.birthPlace||"Not provided"}`,`Birth Coordinates: ${callBooking.birthDetails?.birthLatitude!=null?callBooking.birthDetails.birthLatitude+", "+callBooking.birthDetails.birthLongitude:"Not selected"}`,`Birth Time Zone: ${callBooking.birthDetails?.birthTimezone||"Not available"}`,`Preferred: ${preferredDate} ${preferredTime}`,`Notes: ${notes||"None"}`,`Payment: ${astrologerId?"Not collected; awaiting confirmation":"Not required"}`].join("\n")});
      } catch(emailErr) { console.warn("Booking notification email failed; booking remains created:", emailErr?.message||emailErr); }
    }
    return res.json({ok:true,bookingId,appointmentId:ref.id,status:"new",bookingStatus:"requested"});
  } catch(e){console.error("Appointment booking failed:",e);return res.status(502).json({error:e?.message||"Unable to create booking right now."});}
});

let publicAstrologersCache={expiresAt:0,data:null};
app.get("/public/astrologers", async (req, res) => {
  try {
    const now=Date.now();
    if(publicAstrologersCache.data && publicAstrologersCache.expiresAt>now){
      res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
      return res.json({success:true,astrologers:publicAstrologersCache.data,cached:true});
    }
    const snap=await sharedPublicRead("astrologers",()=>db.collection("smv_astrologers").where("status","==","approved").limit(200).get());
    const checked=await Promise.all(snap.docs.map(async d=>{
      const x=d.data()||{};
      try{
        const authUser=await admin.auth().getUser(d.id);
        if(authUser.emailVerified!==true)return null;
      }catch(authErr){console.warn("Unable to check email verification for astrologer:",d.id,authErr?.message||authErr);return null;}
      const rawLanguages=x.languages??x.spokenLanguages??x.language??[];
      const languages=Array.isArray(rawLanguages)?rawLanguages.map(v=>String(v||"").trim()).filter(Boolean):String(rawLanguages||"").split(/[,;|]/).map(v=>v.trim()).filter(Boolean);
      const rawAvailability=String(x.availabilityStatus||x.onlineStatus||"").trim().toLowerCase();
      const storedAvailability=["online","busy","offline"].includes(rawAvailability)?rawAvailability:"offline";
      const liveCallEnabled=x.liveCallEnabled===true,liveChatEnabled=x.liveChatEnabled===true;
      const activeSessionCount=Number.isSafeInteger(Number(x.activeSessionCount))&&Number(x.activeSessionCount)>0?Number(x.activeSessionCount):0;
      const availabilityStatus=astrologerAvailabilityStatus({...x,liveCallEnabled,liveChatEnabled},activeSessionCount);
      const callRateCandidates=[x.callPricePerMinute,x.pricePerMinute,x.callRatePerMinute].map(Number);
      const configuredCallRate=callRateCandidates.find(v=>Number.isFinite(v)&&v>0);
      const chatRateCandidates=[x.chatPricePerMinute,x.liveChatPricePerMinute,x.chatRatePerMinute].map(Number);
      const configuredChatRate=chatRateCandidates.find(v=>Number.isFinite(v)&&v>0);
      return {id:d.id,name:x.name||"Astrologer",expertise:x.expertise||x.specialization||"Astrology",specialization:x.specialization||x.expertise||"Astrology",experience:x.experience||0,profileDescription:x.profileDescription||x.bio||x.about||"",bio:x.profileDescription||x.bio||x.about||"",about:x.profileDescription||x.about||x.bio||"",photoData:x.photoData||x.photoURL||x.photoUrl||"",rating:x.rating||x.averageRating||"New",publicId:x.publicId||"",languages,availabilityStatus,liveCallEnabled,liveChatEnabled,callPricePerMinute:configuredCallRate??null,chatPricePerMinute:configuredChatRate??null,chatPrice:Number(x.pricePerQuestion||0),status:x.status||""};
    }));
    const astrologers=checked.filter(Boolean);
    publicAstrologersCache={expiresAt:now+60000,data:astrologers};
    res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
    return res.json({success:true,astrologers});
  }catch(e){console.error("Public astrologers load failed:",e);return res.status(500).json({error:e?.message||"Unable to load approved astrologers."});}
});

// Astrologers may update only their own availability; approved profiles are
// required before the status can become Online or Busy. Admin SDK is used so
// client Firestore Rules remain restrictive and public directory cache is cleared.
app.post("/astrologer/availability", express.json({limit:"5kb"}), async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  try{
    const availabilityStatus=String(req.body?.availabilityStatus||"").trim().toLowerCase();
    const liveCallEnabled=req.body?.liveCallEnabled===true;
    const liveChatEnabled=req.body?.liveChatEnabled===true;
    if(!["online","busy","offline"].includes(availabilityStatus)){
      return res.status(400).json({success:false,error:"Choose Online, Busy, or Offline."});
    }
    if(typeof req.body?.liveCallEnabled!=="boolean"||typeof req.body?.liveChatEnabled!=="boolean"){
      return res.status(400).json({success:false,error:"Choose whether Live Call or Live Chat is enabled."});
    }
    const result=await db.runTransaction(async tx=>{
      const astroRef=db.collection("smv_astrologers").doc(user.uid);
      const [userSnap,astroSnap,pricingSnap]=await Promise.all([
        tx.get(db.collection("smv_users").doc(user.uid)),
        tx.get(astroRef),
        tx.get(db.collection("smv_settings").doc("liveSessionPricing"))
      ]);
      const profile=userSnap.exists?(userSnap.data()||{}):{};
      const astro=astroSnap.exists?(astroSnap.data()||{}):{};
      if(!astroSnap.exists || (astro.uid && String(astro.uid)!==String(user.uid))){
        throw Object.assign(new Error("This account does not own an Astrologer profile."),{httpStatus:403});
      }
      // The verified-owned Astrologer record remains authoritative for migrated profiles.
      if(!["approved","active"].includes(String(astro.status||"").toLowerCase())){
        throw Object.assign(new Error("Only an approved Astrologer can change availability."),{httpStatus:409});
      }
      const activeCount=Number.isSafeInteger(Number(astro.activeSessionCount))&&Number(astro.activeSessionCount)>=0?Number(astro.activeSessionCount):0;
      const stored=pricingSnap.exists?(pricingSnap.data()||{}):{};
      const rawMax=Number(stored.maxConcurrentSessions);
      const maxConcurrent=Number.isSafeInteger(rawMax)&&rawMax>=1&&rawMax<=3?rawMax:1;
      const automaticallyBusy=activeCount>0;
      const finalStatus=astrologerAvailabilityStatus({liveCallEnabled,liveChatEnabled},activeCount);
      tx.set(astroRef,{
        liveCallEnabled,liveChatEnabled,
        availabilityStatus:finalStatus,
        availabilityUpdatedAt:FieldValue.serverTimestamp(),
        availabilityUpdatedBy:user.uid,
        // A Live session keeps the Astrologer Busy until its final active session settles.
        liveSessionBusyManaged:automaticallyBusy
      },{merge:true});
      return {availabilityStatus:finalStatus,liveCallEnabled,liveChatEnabled,activeSessionCount:activeCount,maxConcurrentSessions:maxConcurrent};
    });
    publicAstrologersCache={expiresAt:0,data:null};
    res.set("Cache-Control","no-store");
    return res.json({success:true,...result});
  }catch(e){
    console.error("Astrologer availability update failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to update Astrologer availability."});
  }
});
const publicReadFlights=new Map();
function sharedPublicRead(key,read){
 if(publicReadFlights.has(key))return publicReadFlights.get(key);
 const task=Promise.resolve().then(read).finally(()=>{if(publicReadFlights.get(key)===task)publicReadFlights.delete(key);});
 publicReadFlights.set(key,task);return task;
}
const publicReviewsCache=new Map();
app.get("/public/astrologers/:astrologerId/reviews", async(req,res)=>{
  try{
    const astrologerId=String(req.params?.astrologerId||"").trim();
    if(!astrologerId) return res.status(400).json({error:"Astrologer ID is required."});
    const now=Date.now(),cached=publicReviewsCache.get(astrologerId);
    if(cached&&cached.expiresAt>now){
      res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
      return res.json({success:true,astrologerId,reviews:cached.reviews,cached:true});
    }
    // V46: one targeted Firestore query only. No full-review scan and no extra
    // astrologer-document read. The public directory itself exposes approved astrologers.
    // One indexed equality query only. Filter approval in memory so this
    // endpoint does not depend on a Firestore composite index.
    // Keep the public profile review read bounded and index-free. This is a read-only
    // display of approved historical profile reviews; Q&A question-based submission is retired.
    const snap=await sharedPublicRead("reviews:"+astrologerId,()=>db.collection("smv_reviews").where("astrologerId","==",astrologerId).limit(100).get());
    const reviews=snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(r=>r.approved===true || String(r.status||"").toLowerCase()==="approved");
    publicReviewsCache.set(astrologerId,{expiresAt:now+60000,reviews});
    res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
    return res.json({success:true,astrologerId,reviews});
   }catch(e){console.error("Public astrologer reviews load failed:",e);return res.status(500).json({error:e?.message||"Unable to load astrologer reviews.",code:e?.code||"REVIEWS_LOAD_FAILED"});}
});
// Historical approved Astrologer reviews remain readable through the public profile endpoint above.
// Customer review submission tied to retired Q&A question IDs has been removed.

app.get("/admin/appointments", async(req,res)=>{
  const user=await requireUser(req,res); if(!user)return; if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access required."});
  try{
    // Avoid orderBy so an index can never block the Admin Dashboard.
    const snap=await db.collection("smv_appointments").limit(200).get();
    const appointments=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
      const at=a.createdAt?.toMillis?a.createdAt.toMillis():(a.createdAt?.seconds||0)*1000;
      const bt=b.createdAt?.toMillis?b.createdAt.toMillis():(b.createdAt?.seconds||0)*1000;
      return bt-at;
    }).slice(0,50);
    return res.json({appointments});
  }catch(e){return res.status(500).json({error:e?.message||"Unable to load appointments."});}
});

app.post("/admin/appointment-status", express.json({limit:"5kb"}), async(req,res)=>{
  const user=await requireUser(req,res); if(!user)return; if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access required."});
  try{const id=String(req.body?.id||"").trim(),status=String(req.body?.status||"").trim();if(!id||!["new","confirmed","completed","cancelled"].includes(status))return res.status(400).json({error:"Invalid appointment update."});await db.collection("smv_appointments").doc(id).update({status,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid});return res.json({ok:true});}catch(e){return res.status(500).json({error:e?.message||"Unable to update appointment."});}
});

app.post("/astrologer/change-payout", express.json({limit:"10kb"}), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const userSnap = await db.collection("smv_users").doc(user.uid).get();
    const astroSnap = await db.collection("smv_astrologers").doc(user.uid).get();
    const role = String(userSnap.data()?.role || "").toLowerCase();
    const astro = astroSnap.data() || {};
    if (role !== "astrologer" || astro.status !== "approved") return res.status(403).json({error:"Only an approved Astrologer can change the payment method."});
    const bankName=String(req.body?.bankName||"").trim();
    const accountName=String(req.body?.accountName||"").trim();
    const accountNumber=String(req.body?.accountNumber||"").trim();
    const ifsc=String(req.body?.ifsc||"").trim().toUpperCase();
    const upi=String(req.body?.upi||"").trim();
    if(!bankName||!accountName||!accountNumber||!ifsc) return res.status(400).json({error:"Please complete all required payment details."});
    if(bankName.length>120||accountName.length>120||accountNumber.length>40||ifsc.length>20||upi.length>120) return res.status(400).json({error:"Payment details are too long."});
    if(accountNumber.length<6) return res.status(400).json({error:"Enter a valid account number."});
    if(ifsc.length<4) return res.status(400).json({error:"Enter a valid IFSC code."});
    const payoutRef=db.collection("smv_payouts").doc(user.uid);
    await payoutRef.set({uid:user.uid,bankName,accountName,accountNumber,ifsc,upi,status:"pending_admin_review",requestedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),approvedAt:FieldValue.delete(),rejectedAt:FieldValue.delete(),rejectionReason:FieldValue.delete()},{merge:true});
    await db.collection("smv_notifications").add({userId:user.uid,type:"payment_method",title:"Payment Method Submitted",message:"Your new payment method is waiting for Admin approval.",createdAt:FieldValue.serverTimestamp(),read:false});
    await db.collection("smv_notifications").add({userId:ADMIN_UID,type:"payment_method_review",title:"Astrologer Payment Method Approval Required",message:`Astrologer ${astro.name||user.uid} submitted a new payment method for Admin approval.`,astrologerId:user.uid,createdAt:FieldValue.serverTimestamp(),read:false});
    return res.json({success:true,status:"pending_admin_review"});
  } catch(e){
    console.error("Astrologer payout change error:",e);
    return res.status(500).json({error:"Unable to submit payment method change right now. Please try again."});
  }
});

app.post("/admin/payout-change-status", express.json({limit:"5kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user) return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const astrologerId=String(req.body?.astrologerId||"").trim();
    const status=String(req.body?.status||"").trim();
    const reason=String(req.body?.reason||"").trim();
    if(!astrologerId||!["approved","rejected"].includes(status)) return res.status(400).json({error:"Invalid payment method approval request."});
    const payoutRef=db.collection("smv_payouts").doc(astrologerId), snap=await payoutRef.get();
    if(!snap.exists) return res.status(404).json({error:"Payment method request not found."});
    const p=snap.data()||{};
    if(String(p.status||"")!=="pending_admin_review") return res.status(400).json({error:"This payment method request is no longer pending."});
    if(status==="rejected"&&!reason) return res.status(400).json({error:"Enter a rejection reason."});
    const patch={status,reviewedAt:FieldValue.serverTimestamp(),reviewedBy:user.uid,updatedAt:FieldValue.serverTimestamp()};
    if(status==="approved") patch.approvedAt=FieldValue.serverTimestamp();
    else { patch.rejectedAt=FieldValue.serverTimestamp(); patch.rejectionReason=reason; }
    await payoutRef.update(patch);
    await db.collection("smv_notifications").add({userId:astrologerId,type:"payment_method",title:status==="approved"?"Payment Method Approved":"Payment Method Rejected",message:status==="approved"?"Your new payment method has been approved by Admin.":`Your new payment method was rejected by Admin. Reason: ${reason}`,createdAt:FieldValue.serverTimestamp(),read:false});
    await writeAdminAudit("PAYMENT_METHOD_"+status.toUpperCase(), astrologerId, user.uid, {astrologerId});
    return res.json({success:true,status});
  }catch(e){console.error("Admin payout status error:",e);return res.status(500).json({error:"Unable to update payment method approval."});}
});



require('./dashboard-events')(app,{db,requireUser,isAdminUser});

async function getAstrologerAutoApprovalSettings(includeSecret=false){
  try{
    const s=await db.collection("smv_settings").doc("astrologerAutoApproval").get(),d=s.exists?s.data()||{}:{};
    const out={enabled:d.enabled===true,formUrl:String(d.formUrl||""),syncWebAppUrl:String(d.syncWebAppUrl||""),passMark:Math.max(1,Math.min(25,Number(d.passMark||20)))};
    if(includeSecret)out.webhookSecret=String(d.webhookSecret||"");
    return out;
  }catch(_){return {enabled:false,formUrl:"",syncWebAppUrl:"",passMark:20,...(includeSecret?{webhookSecret:""}:{})};}
}

const SMV_DEFAULT_ASTRO_QUIZ_25=[{"questionTa": "Lagna (லக்னம்) என்றால் என்ன?", "questionEn": "What is Lagna?", "choicesTa": ["சந்திர ராசி மட்டும்", "பிறப்பு நேரத்தில் கிழக்கு அடிவானத்தில் உதிக்கும் ராசி", "10ஆம் பாவ அதிபதி", "நவாம்ச அதிபதி"], "choicesEn": ["Moon sign only", "Sign rising on the eastern horizon at birth", "10th-house lord", "Navamsa lord"], "correctIndex": 1, "enabled": true, "order": 1}, {"questionTa": "Jyotisha-வில் பொதுவாக எத்தனை Rasi-கள் பயன்படுத்தப்படுகின்றன?", "questionEn": "How many Rasis are used in Jyotisha?", "choicesTa": ["9", "12", "18", "27"], "choicesEn": ["9", "12", "18", "27"], "correctIndex": 1, "enabled": true, "order": 2}, {"questionTa": "27-Nakshatra முறையில் எத்தனை Nakshatra-கள் உள்ளன?", "questionEn": "How many Nakshatras are in the standard 27-Nakshatra system?", "choicesTa": ["12", "24", "27", "30"], "choicesEn": ["12", "24", "27", "30"], "correctIndex": 2, "enabled": true, "order": 3}, {"questionTa": "ஒவ்வொரு Nakshatra-க்கும் எத்தனை Pada-கள்?", "questionEn": "How many Padas does each Nakshatra have?", "choicesTa": ["2", "3", "4", "5"], "choicesEn": ["2", "3", "4", "5"], "correctIndex": 2, "enabled": true, "order": 4}, {"questionTa": "ஒரு Rasi எத்தனை degrees கொண்டது?", "questionEn": "How many degrees are in one Rasi?", "choicesTa": ["15°", "27°", "30°", "45°"], "choicesEn": ["15°", "27°", "30°", "45°"], "correctIndex": 2, "enabled": true, "order": 5}, {"questionTa": "ஒரு Nakshatra-வின் பரப்பு எவ்வளவு?", "questionEn": "What is the span of one Nakshatra?", "choicesTa": ["10°00′", "12°00′", "13°20′", "15°00′"], "choicesEn": ["10°00′", "12°00′", "13°20′", "15°00′"], "correctIndex": 2, "enabled": true, "order": 6}, {"questionTa": "ஒரு Nakshatra Pada-வின் பரப்பு எவ்வளவு?", "questionEn": "What is the span of one Nakshatra Pada?", "choicesTa": ["2°30′", "3°20′", "4°00′", "5°00′"], "choicesEn": ["2°30′", "3°20′", "4°00′", "5°00′"], "correctIndex": 1, "enabled": true, "order": 7}, {"questionTa": "Navamsa (D9) ஒரு Rasi-யை எத்தனை பகுதிகளாகப் பிரிக்கிறது?", "questionEn": "Navamsa (D9) divides a Rasi into how many parts?", "choicesTa": ["7", "8", "9", "12"], "choicesEn": ["7", "8", "9", "12"], "correctIndex": 2, "enabled": true, "order": 8}, {"questionTa": "Dasamsa எந்த divisional chart?", "questionEn": "Which divisional chart is Dasamsa?", "choicesTa": ["D7", "D9", "D10", "D12"], "choicesEn": ["D7", "D9", "D10", "D12"], "correctIndex": 2, "enabled": true, "order": 9}, {"questionTa": "திருமணம் மற்றும் partnership-ஐ முதன்மையாக குறிக்கும் Bhava எது?", "questionEn": "Which Bhava primarily signifies marriage and partnerships?", "choicesTa": ["5ஆம்", "7ஆம்", "9ஆம்", "11ஆம்"], "choicesEn": ["5th", "7th", "9th", "11th"], "correctIndex": 1, "enabled": true, "order": 10}, {"questionTa": "தொழில்/கர்மத்தை முதன்மையாக குறிக்கும் Bhava எது?", "questionEn": "Which Bhava primarily signifies profession and karma?", "choicesTa": ["2ஆம்", "6ஆம்", "10ஆம்", "12ஆம்"], "choicesEn": ["2nd", "6th", "10th", "12th"], "correctIndex": 2, "enabled": true, "order": 11}, {"questionTa": "குழந்தைகளை முதன்மையாக குறிக்கும் Bhava எது?", "questionEn": "Which Bhava primarily signifies children?", "choicesTa": ["3ஆம்", "5ஆம்", "8ஆம்", "10ஆம்"], "choicesEn": ["3rd", "5th", "8th", "10th"], "correctIndex": 1, "enabled": true, "order": 12}, {"questionTa": "கடன், நோய், எதிரிகள் ஆகியவற்றுடன் தொடர்புடைய Bhava எது?", "questionEn": "Which Bhava is associated with debts, disease and enemies?", "choicesTa": ["1ஆம்", "4ஆம்", "6ஆம்", "9ஆம்"], "choicesEn": ["1st", "4th", "6th", "9th"], "correctIndex": 2, "enabled": true, "order": 13}, {"questionTa": "ஆயுள் மற்றும் திடீர் மாற்றங்களுடன் தொடர்புடைய Bhava எது?", "questionEn": "Which Bhava is associated with longevity and sudden transformations?", "choicesTa": ["2ஆம்", "5ஆம்", "8ஆம்", "11ஆம்"], "choicesEn": ["2nd", "5th", "8th", "11th"], "correctIndex": 2, "enabled": true, "order": 14}, {"questionTa": "லாபம் மற்றும் ஆசை நிறைவேற்றத்துடன் தொடர்புடைய Bhava எது?", "questionEn": "Which Bhava is associated with gains and fulfilment of desires?", "choicesTa": ["4ஆம்", "8ஆம்", "11ஆம்", "12ஆம்"], "choicesEn": ["4th", "8th", "11th", "12th"], "correctIndex": 2, "enabled": true, "order": 15}, {"questionTa": "செலவு, இழப்பு, வெளிநாட்டு வாழ்வு ஆகியவற்றுடன் தொடர்புடைய Bhava எது?", "questionEn": "Which Bhava is associated with expenditure, loss and foreign residence?", "choicesTa": ["3ஆம்", "7ஆம்", "10ஆம்", "12ஆம்"], "choicesEn": ["3rd", "7th", "10th", "12th"], "correctIndex": 3, "enabled": true, "order": 16}, {"questionTa": "அறிவு, குரு, புத்திர காரகத்துவத்துடன் பொதுவாக தொடர்புடைய Graha எது?", "questionEn": "Which Graha is commonly associated with wisdom, teachers and children?", "choicesTa": ["புதன்", "குரு", "சுக்கிரன்", "சனி"], "choicesEn": ["Mercury", "Jupiter", "Venus", "Saturn"], "correctIndex": 1, "enabled": true, "order": 17}, {"questionTa": "கலை, சுகம் மற்றும் திருமண காரகத்துவத்துடன் பொதுவாக தொடர்புடைய Graha எது?", "questionEn": "Which Graha is commonly associated with arts, comforts and marriage significations?", "choicesTa": ["செவ்வாய்", "சுக்கிரன்", "சனி", "கேது"], "choicesEn": ["Mars", "Venus", "Saturn", "Ketu"], "correctIndex": 1, "enabled": true, "order": 18}, {"questionTa": "ஒழுக்கம், தாமதம், சகிப்புத்தன்மையுடன் பொதுவாக தொடர்புடைய Graha எது?", "questionEn": "Which Graha is commonly associated with discipline, delay and endurance?", "choicesTa": ["சந்திரன்", "புதன்", "குரு", "சனி"], "choicesEn": ["Moon", "Mercury", "Jupiter", "Saturn"], "correctIndex": 3, "enabled": true, "order": 19}, {"questionTa": "Vimsottari Dasa-வின் முழு சுழற்சி எத்தனை ஆண்டுகள்?", "questionEn": "What is the full cycle of Vimsottari Dasa?", "choicesTa": ["60", "100", "108", "120"], "choicesEn": ["60", "100", "108", "120"], "correctIndex": 3, "enabled": true, "order": 20}, {"questionTa": "Ketu-க்கு பின் Vimsottari Dasa வரிசையில் வரும் Graha எது?", "questionEn": "Which Graha follows Ketu in the Vimsottari Dasa sequence?", "choicesTa": ["சூரியன்", "சுக்கிரன்", "சந்திரன்", "செவ்வாய்"], "choicesEn": ["Sun", "Venus", "Moon", "Mars"], "correctIndex": 1, "enabled": true, "order": 21}, {"questionTa": "பிறப்பில் Vimsottari Dasa balance கணக்கிட முதன்மையாக பயன்படுத்தப்படுவது எது?", "questionEn": "What is primarily used to determine the Vimsottari Dasa balance at birth?", "choicesTa": ["சூரிய longitude", "சந்திரன் தனது Nakshatra-வில் உள்ள நிலை", "Lagna degree மட்டும்", "10ஆம் அதிபதி longitude"], "choicesEn": ["Sun longitude", "Moon position within its Nakshatra", "Lagna degree only", "10th-lord longitude"], "correctIndex": 1, "enabled": true, "order": 22}, {"questionTa": "Rasi மற்றும் Navamsa இரண்டிலும் ஒரே Rasi-யில் இருக்கும் Graha எவ்வாறு அழைக்கப்படுகிறது?", "questionEn": "A Graha occupying the same Rasi in both Rasi and Navamsa is called what?", "choicesTa": ["அஸ்தங்கதம்", "வர்கோத்தமம்", "வக்ரம்", "நீசம்"], "choicesEn": ["Combust", "Vargottama", "Retrograde", "Debilitated"], "correctIndex": 1, "enabled": true, "order": 23}, {"questionTa": "Graha Drishti-யில் Guru-வின் சிறப்பு முழு பார்வைகள் எவை?", "questionEn": "In Graha Drishti, which are Jupiter’s special full aspects?", "choicesTa": ["3 மற்றும் 10", "4 மற்றும் 8", "5 மற்றும் 9", "7 மற்றும் 12"], "choicesEn": ["3rd and 10th", "4th and 8th", "5th and 9th", "7th and 12th"], "correctIndex": 2, "enabled": true, "order": 24}, {"questionTa": "Graha Drishti-யில் Shani-யின் சிறப்பு முழு பார்வைகள் எவை?", "questionEn": "In Graha Drishti, which are Saturn’s special full aspects?", "choicesTa": ["3 மற்றும் 10", "4 மற்றும் 8", "5 மற்றும் 9", "2 மற்றும் 12"], "choicesEn": ["3rd and 10th", "4th and 8th", "5th and 9th", "2nd and 12th"], "correctIndex": 0, "enabled": true, "order": 25}];
function smvQuizQuestionFromBody(b={}){
  const questionTa=String(b.questionTa||"").trim(),questionEn=String(b.questionEn||"").trim();
  const choicesTa=Array.isArray(b.choicesTa)?b.choicesTa.map(x=>String(x||"").trim()):[];
  const choicesEn=Array.isArray(b.choicesEn)?b.choicesEn.map(x=>String(x||"").trim()):[];
  const correctIndex=Math.round(Number(b.correctIndex));
  if(!questionTa||!questionEn||choicesTa.length!==4||choicesEn.length!==4||choicesTa.some(x=>!x)||choicesEn.some(x=>!x)||correctIndex<0||correctIndex>3)throw new Error("Each question needs Tamil + English, four Tamil + English choices, and one correct answer.");
  return {questionTa,questionEn,choicesTa,choicesEn,correctIndex,enabled:b.enabled!==false,order:Math.max(1,Math.round(Number(b.order||999)))};
}
app.post("/admin/astrologer-quiz/load-defaults",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const existing=await db.collection("smv_astrologer_quiz_questions").get();
    if(!existing.empty&&!req.body?.fillMissing)return res.status(409).json({error:"Question Bank already contains questions. Defaults were not loaded, so your manual questions are protected."});
    let created=0;
    for(let i=0;i<SMV_DEFAULT_ASTRO_QUIZ_25.length;i++){
      const ref=db.collection("smv_astrologer_quiz_questions").doc("default_"+String(i+1).padStart(2,"0")),snap=await ref.get();
      if(!snap.exists){await ref.set({...SMV_DEFAULT_ASTRO_QUIZ_25[i],isDefault:true,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid});created++;}
    }
    return res.json({success:true,created,total:SMV_DEFAULT_ASTRO_QUIZ_25.length});
  }catch(e){return res.status(500).json({error:e.message||"Unable to load default astrology questions."});}
});
app.get("/admin/astrologer-quiz/questions",async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{const s=await db.collection("smv_astrologer_quiz_questions").orderBy("order").get();return res.json({success:true,questions:s.docs.map(d=>({id:d.id,...d.data()}))});}
  catch(e){return res.status(500).json({error:e.message||"Unable to load qualification questions."});}
});
app.post("/admin/astrologer-quiz/questions",express.json({limit:"50kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{const q=smvQuizQuestionFromBody(req.body||{}),id=String(req.body?.id||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,100),ref=id?db.collection("smv_astrologer_quiz_questions").doc(id):db.collection("smv_astrologer_quiz_questions").doc();await ref.set({...q,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});return res.json({success:true,id:ref.id});}
  catch(e){return res.status(400).json({error:e.message||"Unable to save qualification question."});}
});
app.post("/admin/astrologer-quiz/questions/delete",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const id=String(req.body?.id||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,100);if(!id)return res.status(400).json({error:"Question ID required."});
  await db.collection("smv_astrologer_quiz_questions").doc(id).delete();return res.json({success:true});
});
app.get("/google-form/astrologer-quiz-config",async(req,res)=>{
  try{
    const cfg=await getAstrologerAutoApprovalSettings(true),secret=String(req.get("x-smv-quiz-secret")||req.query?.secret||"");
    if(!cfg.webhookSecret||!secret||!signatureEqual(cfg.webhookSecret,secret))return res.status(401).json({error:"Invalid quiz secret."});
    const s=await db.collection("smv_astrologer_quiz_questions").where("enabled","==",true).get();
    const questions=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(a.order||999)-Number(b.order||999));
    return res.json({success:true,passMark:cfg.passMark,questions});
  }catch(e){return res.status(500).json({error:e.message||"Unable to load Google Form quiz configuration."});}
});
app.post("/admin/astrologer-auto-approval/settings",express.json({limit:"20kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const b=req.body||{},enabled=b.enabled===true,formUrl=String(b.formUrl||"").trim(),syncWebAppUrl=String(b.syncWebAppUrl||"").trim(),passMark=Math.round(Number(b.passMark||20));
    if(passMark<1||passMark>25)return res.status(400).json({error:"Pass mark must be between 1 and 25."});
    if(syncWebAppUrl&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/i.test(syncWebAppUrl))return res.status(400).json({error:"Enter a valid deployed Google Apps Script Web App /exec URL."});
    if(enabled&&!/^https:\/\/docs\.google\.com\/forms\//i.test(formUrl))return res.status(400).json({error:"Enter the published Google Form URL before enabling Auto Approval."});
    const ref=db.collection("smv_settings").doc("astrologerAutoApproval"),old=await ref.get(),oldSecret=old.exists?String(old.data()?.webhookSecret||""):"";
    const webhookSecret=b.rotateSecret===true||!oldSecret?crypto.randomBytes(32).toString("hex"):oldSecret;
    await ref.set({enabled,formUrl,syncWebAppUrl,passMark,webhookSecret,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});
    return res.json({success:true,enabled,formUrl,syncWebAppUrl,passMark,webhookSecret});
  }catch(e){return res.status(500).json({error:e.message||"Unable to save Astrologer Auto Approval settings."});}
});
app.post("/admin/astrologer-quiz/sync-google-form",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const cfg=await getAstrologerAutoApprovalSettings(true);
    if(!cfg.syncWebAppUrl)return res.status(400).json({error:"Google Apps Script Web App URL is not configured. Deploy the Apps Script as a Web App and save its /exec URL first."});
    if(!cfg.webhookSecret)return res.status(400).json({error:"Quiz webhook secret is not configured."});
    const rr=await fetch(cfg.syncWebAppUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sync_google_form",secret:cfg.webhookSecret}),redirect:"follow",signal:AbortSignal.timeout(90000)});
    const raw=await rr.text();let data={};try{data=JSON.parse(raw);}catch(_){data={};}
    if(!rr.ok||data.success!==true)return res.status(502).json({error:String(data.error||raw||("Google Apps Script sync failed (HTTP "+rr.status+").")).slice(0,800)});
    return res.json({success:true,formUrl:String(data.formUrl||cfg.formUrl||""),enabledQuestions:Number(data.enabledQuestions||0),passMark:Number(data.passMark||cfg.passMark),message:"Google Form synced successfully."});
  }catch(e){return res.status(502).json({error:e?.name==="TimeoutError"?"Google Form sync timed out. Please try again.":(e.message||"Unable to sync Google Form.")});}
});
app.get("/astrologer/qualification-config",async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  const us=await db.collection("smv_users").doc(user.uid).get(),ud=us.exists?us.data()||{}:{};
  if(String(ud.role||"").toLowerCase()!=="astrologer")return res.status(403).json({error:"Astrologer account required."});
  const cfg=await getAstrologerAutoApprovalSettings(false),as=await db.collection("smv_astrologers").doc(user.uid).get(),ad=as.exists?as.data()||{}:{};
  return res.json({success:true,...cfg,status:String(ad.status||ud.status||"pending"),quizStatus:String(ad.quizStatus||"not_attempted"),quizScore:ad.quizScore??null,quizMaxScore:ad.quizMaxScore??null,quizSubmittedAt:ad.quizSubmittedAt||null});
});
app.post("/webhooks/google-form/astrologer-qualification",express.json({limit:"20kb"}),async(req,res)=>{
  try{
    const cfg=await getAstrologerAutoApprovalSettings(true),secret=String(req.get("x-smv-quiz-secret")||req.body?.secret||"");
    if(!cfg.webhookSecret||!secret||!signatureEqual(cfg.webhookSecret,secret))return res.status(401).json({error:"Invalid quiz webhook secret."});
    const email=String(req.body?.email||"").trim().toLowerCase(),score=Number(req.body?.score),maxScore=Math.round(Number(req.body?.maxScore||0)),responseId=String(req.body?.responseId||"").trim();
    const activeSnap=await db.collection("smv_astrologer_quiz_questions").where("enabled","==",true).get(),expectedMax=activeSnap.size;
    const validationIssues=[];
    if(!email)validationIssues.push("email_missing");
    if(!Number.isFinite(score))validationIssues.push("score_invalid");
    if(maxScore<1)validationIssues.push("max_score_invalid");
    if(maxScore!==expectedMax)validationIssues.push("max_score_mismatch");
    if(Number.isFinite(score)&&score<0)validationIssues.push("score_below_zero");
    if(Number.isFinite(score)&&maxScore>=1&&score>maxScore)validationIssues.push("score_above_max");
    if(!responseId)validationIssues.push("response_id_missing");
    if(validationIssues.length){
      console.warn("SMV astrologer quiz payload rejected",{
        issues:validationIssues,
        emailPresent:!!email,
        score:Number.isFinite(score)?score:null,
        receivedMaxScore:maxScore,
        expectedMaxScore:expectedMax,
        responseIdPresent:!!responseId
      });
      return res.status(400).json({
        error:"Invalid Google Form result payload or stale form version.",
        diagnostic:{
          issues:validationIssues,
          emailPresent:!!email,
          receivedScore:Number.isFinite(score)?score:null,
          receivedMaxScore:maxScore,
          expectedMaxScore:expectedMax,
          responseIdPresent:!!responseId
        }
      });
    }
    const resultRef=db.collection("smv_astrologer_quiz_results").doc(responseId.replace(/[^A-Za-z0-9_-]/g,"_").slice(0,180)),seen=await resultRef.get();
    if(seen.exists)return res.json({success:true,duplicate:true});
    const q=await db.collection("smv_users").where("email","==",email).limit(1).get();
    if(q.empty)return res.status(404).json({error:"No registered SMV astrologer matches this email."});
    const userDoc=q.docs[0],uid=userDoc.id,ud=userDoc.data()||{};
    if(String(ud.role||"").toLowerCase()!=="astrologer")return res.status(403).json({error:"The submitted email is not an Astrologer account."});
    const astroRef=db.collection("smv_astrologers").doc(uid),astroSnap=await astroRef.get();if(!astroSnap.exists)return res.status(404).json({error:"Astrologer profile not found."});
    const ad=astroSnap.data()||{},passed=score>=cfg.passMark,autoApproved=cfg.enabled&&passed&&["pending","test_failed",""].includes(String(ad.status||"pending").toLowerCase());
    await db.runTransaction(async tx=>{
      const rs=await tx.get(resultRef);if(rs.exists)return;
      tx.set(resultRef,{responseId,email,uid,score,maxScore,passMark:cfg.passMark,passed,autoApproved,createdAt:FieldValue.serverTimestamp()});
      const quizPatch={quizStatus:passed?"passed":"failed",quizScore:score,quizMaxScore:maxScore,quizPassMark:cfg.passMark,quizResponseId:responseId,quizSubmittedAt:FieldValue.serverTimestamp()};
      if(autoApproved)Object.assign(quizPatch,{status:"approved",approvedAt:FieldValue.serverTimestamp(),approvedBy:"google_quiz_auto_approval",autoApproved:true});
      tx.set(astroRef,quizPatch,{merge:true});
      if(autoApproved)tx.set(db.collection("smv_users").doc(uid),{status:"active",updatedAt:FieldValue.serverTimestamp()},{merge:true});
      const note=db.collection("smv_notifications").doc(uid+"_quiz_"+Date.now());
      tx.set(note,{userId:uid,type:autoApproved?"approval":"astrologer_quiz_result",title:autoApproved?"Astrologer application auto approved":(passed?"Qualification test passed":"Qualification test not passed"),message:autoApproved?`You passed the qualification test (${score}/${maxScore}) and your astrologer account has been approved automatically.`:`Qualification test score: ${score}/${maxScore}. ${passed?"Auto Approval is currently disabled; Admin review remains pending.":"Required pass mark: "+cfg.passMark+"/25."}`,createdAt:FieldValue.serverTimestamp(),read:false});
    });
    return res.json({success:true,passed,autoApproved,score,maxScore,passMark:cfg.passMark});
  }catch(e){console.error("Google Form astrologer qualification webhook failed:",e);return res.status(500).json({error:e.message||"Unable to process qualification result."});}
});
app.get("/admin/settings-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const [commissionSnap,autoApprovalSnap,horoscopePaymentSnap]=await Promise.all([
      walletDomainDb().collection("smv_settings").doc("commission").get(),
      db.collection("smv_settings").doc("astrologerAutoApproval").get(),
      db.collection("smv_settings").doc("horoscopePayment").get()
    ]);
    const val=snap=>snap.exists?snap.data():null;
    return res.json({success:true,settings:{
      commission:val(commissionSnap),
      astrologerAutoApproval:val(autoApprovalSnap),
      horoscopePayment:normalizeHoroscopeSettings(val(horoscopePaymentSnap)||horoscopeFeatureDefaults())
    }});
  }catch(e){
    console.error("Admin settings targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin settings."});
  }
});

app.get("/admin/withdrawals-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const financeDb=walletDomainDb();
    const snap=await financeDb.collection("smv_withdrawals").orderBy("createdAt","desc").limit(50).get();
    const withdrawals=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a)).slice(0,50);
    // Fetch private payout snapshots in one server-side batch instead of issuing
    // one authenticated HTTP request per withdrawal card from the browser.
    const refs=withdrawals.map(w=>financeDb.collection("smv_withdrawal_payouts").doc(String(w.id||"")));
    const payoutSnaps=refs.length?await financeDb.getAll(...refs):[];
    const payoutById=new Map(payoutSnaps.filter(x=>x.exists).map(x=>[x.id,x.data()||{}]));
    const enriched=withdrawals.map(w=>{
      const p=payoutById.get(String(w.id||""))||{};
      const payout={
        bankName:String(p.bankName||"").trim(),accountName:String(p.accountName||"").trim(),
        accountNumber:String(p.accountNumber||"").trim(),ifsc:String(p.ifsc||"").trim().toUpperCase(),
        upi:String(p.upi||"").trim()
      };
      payout.available=!!(payout.bankName||payout.accountName||payout.accountNumber||payout.ifsc||payout.upi);
      return {...w,payout};
    });
    return res.set('Cache-Control','no-store').json({success:true,withdrawals:enriched});
  }catch(e){
    console.error("Admin withdrawals targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin withdrawal data."});
  }
});

app.get("/admin/reviews-data", async (req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const snap=await db.collection("smv_reviews").orderBy("createdAt","desc").limit(50).get();
    const reviews=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a)).slice(0,50);
    return res.set('Cache-Control','no-store').json({success:true,reviews});
  }catch(e){
    console.error("Admin reviews targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin reviews."});
  }
});

// Admin-only Astrologer approval/rejection. Apply all linked profile, login-status,
// price and notification writes atomically with the Admin SDK; do not depend on
// whichever Firestore client rules happen to be deployed in the browser.
app.post("/admin/approve-astrologer", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res);
  if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim();
  if(!astrologerId||astrologerId.length>200)return res.status(400).json({success:false,error:"A valid Astrologer profile ID is required."});
  try{
    const astroRef=db.collection("smv_astrologers").doc(astrologerId);
    const astroSnap=await astroRef.get();
    if(!astroSnap.exists)return res.status(404).json({success:false,error:"Astrologer application not found. Refresh the list and try again."});
    const astro=astroSnap.data()||{};
    const uid=String(astro.uid||astroSnap.id).trim();
    const currentStatus=String(astro.status||"").trim().toLowerCase();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"This Astrologer profile has no valid linked login UID."});
    if(!["pending","approved","active"].includes(currentStatus)){
      return res.status(409).json({success:false,error:"This application is no longer pending. Refresh the applications list."});
    }
    let authAccount;
    try{authAccount=await admin.auth().getUser(uid);}
    catch(_authError){return res.status(409).json({success:false,error:"The linked Firebase login account could not be found. Verify the Astrologer UID before approving."});}
    const userRef=db.collection("smv_users").doc(uid);
    const userSnap=await userRef.get();
    const userProfile=userSnap.exists?(userSnap.data()||{}):{};
    const batch=db.batch();
    const approvedAt=FieldValue.serverTimestamp();
    batch.set(astroRef,{
      uid,role:"astrologer",status:"approved",
      approvedAt,approvedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()
    },{merge:true});
    const userPatch={uid,role:"astrologer",status:"active",approvedAt,updatedAt:FieldValue.serverTimestamp()};
    if(!userProfile.name&&(astro.name||authAccount.displayName))userPatch.name=astro.name||authAccount.displayName;
    if(!userProfile.email&&authAccount.email)userPatch.email=authAccount.email;
    if(!userProfile.publicId&&astro.publicId)userPatch.publicId=astro.publicId;
    batch.set(userRef,userPatch,{merge:true});
    batch.set(db.collection("smv_notifications").doc("astro_approval_"+uid),{
      userId:uid,type:"approval",title:"Astrologer application approved",
      message:"Your profile has been approved by Admin.",astrologerId,
      createdAt:FieldValue.serverTimestamp(),read:false
    },{merge:true});
    await batch.commit();
    return res.set("Cache-Control","no-store").json({success:true,astrologerId,uid,status:"approved"});
  }catch(e){
    console.error("Admin Astrologer approval failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to approve the Astrologer application. The linked profile changes were not partially committed."});
  }
});

app.post("/admin/reject-astrologer", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res);
  if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim();
  const reason=String(req.body?.reason||"").trim();
  if(!astrologerId||astrologerId.length>200)return res.status(400).json({success:false,error:"A valid Astrologer profile ID is required."});
  if(!reason||reason.length>2000)return res.status(400).json({success:false,error:"Enter a rejection reason of up to 2000 characters."});
  try{
    const astroRef=db.collection("smv_astrologers").doc(astrologerId);
    const astroSnap=await astroRef.get();
    if(!astroSnap.exists)return res.status(404).json({success:false,error:"Astrologer application not found. Refresh the list and try again."});
    const astro=astroSnap.data()||{};
    const uid=String(astro.uid||astroSnap.id).trim();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"This Astrologer profile has no valid linked login UID."});
    if(String(astro.status||"").trim().toLowerCase()!=="pending")return res.status(409).json({success:false,error:"This application is no longer pending. Refresh the list and try again."});
    const batch=db.batch();
    batch.set(astroRef,{uid,role:"astrologer",status:"rejected",rejectionReason:reason,rejectedAt:FieldValue.serverTimestamp(),rejectedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    batch.set(db.collection("smv_users").doc(uid),{uid,role:"astrologer",status:"rejected",updatedAt:FieldValue.serverTimestamp()},{merge:true});
    batch.set(db.collection("smv_notifications").doc("astro_rejection_"+uid),{
      userId:uid,type:"rejection",title:"Astrologer application requires changes",message:reason,
      astrologerId,createdAt:FieldValue.serverTimestamp(),read:false
    },{merge:true});
    await batch.commit();
    return res.set("Cache-Control","no-store").json({success:true,astrologerId,uid,status:"rejected"});
  }catch(e){
    console.error("Admin Astrologer rejection failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to reject the Astrologer application. No partial changes were committed."});
  }
});

// Recover profiles that have an Admin-approved legacy/duplicate profile record but
// whose canonical UID-keyed document or smv_users status is still pending. This
// endpoint can only reconcile the signed-in user's own profile, and it never
// grants approval unless an already-approved owned record exists.
app.post("/astrologer/sync-approval", express.json({limit:"5kb"}), async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  const uid=String(user.uid||"").trim();
  if(!uid)return res.status(401).json({success:false,error:"Authentication required."});
  try{
    const [userSnap,pluralDirect,singularDirect,pluralByUid,singularByUid]=await Promise.all([
      db.collection("smv_users").doc(uid).get(),
      db.collection("smv_astrologers").doc(uid).get(),
      db.collection("smv_astrologer").doc(uid).get(),
      db.collection("smv_astrologers").where("uid","==",uid).limit(25).get(),
      db.collection("smv_astrologer").where("uid","==",uid).limit(25).get()
    ]);
    const userProfile=userSnap.exists?(userSnap.data()||{}):{};
    const records=new Map();
    const addRecord=(snap,direct=false)=>{
      if(!snap?.exists)return;
      const p=snap.data()||{};
      const recordUid=String(p.uid||"").trim();
      if(recordUid && recordUid!==uid)return;
      if(!recordUid && !direct)return;
      records.set(snap.ref.path,{ref:snap.ref,data:p});
    };
    addRecord(pluralDirect,true);addRecord(singularDirect,true);
    for(const snap of pluralByUid.docs)addRecord(snap,false);
    for(const snap of singularByUid.docs)addRecord(snap,false);
    const publicId=String(userProfile.publicId||"").trim();
    if(publicId){
      const [pluralById,singularById]=await Promise.all([
        db.collection("smv_astrologers").where("publicId","==",publicId).limit(10).get(),
        db.collection("smv_astrologer").where("publicId","==",publicId).limit(10).get()
      ]);
      for(const snap of [...pluralById.docs,...singularById.docs]){
        const p=snap.data()||{};
        if(String(p.publicId||"")===publicId && (!p.uid || String(p.uid)===uid))records.set(snap.ref.path,{ref:snap.ref,data:p});
      }
    }
    const owned=[...records.values()];
    const approvedRecord=owned.find(x=>["approved","active"].includes(String(x.data.status||"").trim().toLowerCase()));
    if(!approvedRecord){
      const current=owned.find(x=>x.ref.path==="smv_astrologers/"+uid)||owned[0];
      return res.set("Cache-Control","no-store").json({success:true,approved:false,status:String(current?.data?.status||userProfile.status||"pending").toLowerCase()});
    }
    const canonicalRef=db.collection("smv_astrologers").doc(uid);
    const canonicalSnap=await canonicalRef.get();
    if(canonicalSnap.exists && canonicalSnap.data()?.uid && String(canonicalSnap.data().uid)!==uid){
      return res.status(409).json({success:false,error:"The canonical Astrologer profile UID does not match the signed-in account. Admin repair is required."});
    }
    const source=approvedRecord.data;
    const price=Number(source.pricePerQuestion??source.chatPrice??0);
    const approvedAt=source.approvedAt||FieldValue.serverTimestamp();
    const sharedPatch={uid,role:"astrologer",status:"approved",approvedAt,updatedAt:FieldValue.serverTimestamp()};
    if(Number.isFinite(price)&&price>0)sharedPatch.pricePerQuestion=price;
    if(source.approvedBy)sharedPatch.approvedBy=source.approvedBy;
    const batch=db.batch();
    // Ensure the UID-keyed canonical record used by the Astrologer Dashboard
    // and protected APIs exists and carries the already-approved profile fields.
    batch.set(canonicalRef,{...source,...sharedPatch},{merge:true});
    for(const record of owned)batch.set(record.ref,sharedPatch,{merge:true});
    batch.set(db.collection("smv_users").doc(uid),{
      uid,role:"astrologer",status:"active",approvedAt,updatedAt:FieldValue.serverTimestamp()
    },{merge:true});
    await batch.commit();
    publicAstrologersCache={expiresAt:0,data:null};
    return res.set("Cache-Control","no-store").json({success:true,approved:true,status:"approved",pricePerQuestion:Number.isFinite(price)&&price>0?price:null,reconciledProfiles:owned.length});
  }catch(e){
    console.error("Astrologer approval state reconciliation failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to refresh the Astrologer approval state. Please try again."});
  }
});

// Admin Astrologer management writes use the trusted backend, rather than depending on client Firestore rules.
app.post("/admin/astrologer-profile-permission", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim();
  if(!astrologerId||astrologerId.length>200||typeof req.body?.allow!=="boolean")return res.status(400).json({success:false,error:"A valid Astrologer ID and permission value are required."});
  try{
    const selectedRef=db.collection("smv_astrologers").doc(astrologerId),selectedSnap=await selectedRef.get();
    if(!selectedSnap.exists)return res.status(404).json({success:false,error:"Astrologer profile not found."});
    const selected=selectedSnap.data()||{},uid=String(selected.uid||selectedSnap.id).trim();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"Astrologer profile has no valid login UID."});
    const linked=await db.collection("smv_astrologers").where("uid","==",uid).limit(25).get();
    const refs=new Map([[selectedRef.path,selectedRef],[db.collection("smv_astrologers").doc(uid).path,db.collection("smv_astrologers").doc(uid)]]);
    for(const row of linked.docs)refs.set(row.ref.path,row.ref);
    const patch={profileEditAllowed:req.body.allow,profileEditPermissionUpdatedAt:FieldValue.serverTimestamp(),profileEditPermissionUpdatedBy:actor.uid,updatedAt:FieldValue.serverTimestamp()};
    const batch=db.batch();for(const ref of refs.values())batch.set(ref,patch,{merge:true});
    await batch.commit();
    return res.set("Cache-Control","no-store").json({success:true,astrologerId,uid,allow:req.body.allow});
  }catch(e){console.error("Admin Astrologer profile permission update failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to save Astrologer profile permission."});}
});

app.post("/admin/astrologer-profile-description", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim(),action=String(req.body?.action||"save").trim().toLowerCase();
  if(!astrologerId||astrologerId.length>200||!["save","approve","reject"].includes(action))return res.status(400).json({success:false,error:"A valid Astrologer ID and description action are required."});
  try{
    const selectedRef=db.collection("smv_astrologers").doc(astrologerId),selectedSnap=await selectedRef.get();
    if(!selectedSnap.exists)return res.status(404).json({success:false,error:"Astrologer profile not found."});
    const selected=selectedSnap.data()||{},uid=String(selected.uid||selectedSnap.id).trim();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"Astrologer profile has no valid login UID."});
    let description=String(req.body?.description||"").trim();
    if(action==="approve")description=String(selected.profileDescriptionPending||"").trim();
    if(action==="save"&&(description.length<20||description.length>2000))return res.status(400).json({success:false,error:"Description must be 20–2000 characters."});
    if(action==="approve"&&!description)return res.status(409).json({success:false,error:"There is no pending description to approve."});
    const linked=await db.collection("smv_astrologers").where("uid","==",uid).limit(25).get();
    const refs=new Map([[selectedRef.path,selectedRef],[db.collection("smv_astrologers").doc(uid).path,db.collection("smv_astrologers").doc(uid)]]);
    for(const row of linked.docs)refs.set(row.ref.path,row.ref);
    const now=FieldValue.serverTimestamp();
    let patch;
    if(action==="save")patch={profileDescription:description,profileDescriptionPending:"",profileDescriptionStatus:"approved",profileDescriptionApprovedAt:now,profileDescriptionApprovedBy:actor.uid,updatedAt:now};
    else if(action==="approve")patch={profileDescription:description,profileDescriptionPending:"",profileDescriptionStatus:"approved",profileDescriptionApprovedAt:now,profileDescriptionApprovedBy:actor.uid,updatedAt:now};
    else patch={profileDescriptionPending:"",profileDescriptionStatus:"rejected",profileDescriptionRejectedAt:now,profileDescriptionRejectedBy:actor.uid,updatedAt:now};
    const batch=db.batch();for(const ref of refs.values())batch.set(ref,patch,{merge:true});
    if(action==="approve")batch.set(db.collection("smv_notifications").doc(uid+"_profile_approved_"+Date.now()),{userId:uid,type:"profile_description",title:"Profile description approved",message:"Your updated profile description has been approved by Admin.",createdAt:now,read:false});
    await batch.commit();
    return res.set("Cache-Control","no-store").json({success:true,astrologerId,uid,action,description:action==="reject"?"":description});
  }catch(e){console.error("Admin Astrologer profile description update failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to save Astrologer profile description."});}
});

// Android app releases are uploaded only by a verified Admin. The APK is inspected
// before it is stored: package, ordered versionCode, and permanent Release signing
// certificate must all match the native SMV ASTRO application.
const SMV_ANDROID_RELEASE_REF = () => db.collection('smv_app_releases').doc('android');
function smvPublicAndroidRelease(data) {
  if (!data || !data.downloadUrl || !Number.isSafeInteger(Number(data.versionCode))) {
    return { success: true, available: false };
  }
  return {
    success: true,
    available: true,
    packageName: SMV_ANDROID_PACKAGE,
    versionName: String(data.versionName || ''),
    versionCode: Number(data.versionCode),
    downloadUrl: String(data.downloadUrl),
    size: Number(data.size || 0),
    uploadedAt: Number(data.uploadedAt || 0)
  };
}
app.get('/public/android-app', async (_req, res) => {
  try {
    const snapshot = await SMV_ANDROID_RELEASE_REF().get();
    const data = snapshot.exists ? (snapshot.data() || {}) : null;
    return res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      .json(smvPublicAndroidRelease(data));
  } catch (error) {
    console.error('Public Android app release lookup failed:', error?.message || error);
    return res.status(503).set('Cache-Control', 'no-store')
      .json({ success: false, available: false, error: 'Android app information is temporarily unavailable.' });
  }
});
app.get('/admin/android-app', async (req, res) => {
  const actor = await requireUser(req, res);
  if (!actor) return;
  if (!(await isAdminUser(actor))) return res.status(403).json({ success: false, error: 'Admin access denied.' });
  try {
    const snapshot = await SMV_ANDROID_RELEASE_REF().get();
    const data = snapshot.exists ? (snapshot.data() || {}) : null;
    return res.set('Cache-Control', 'no-store').json({
      ...smvPublicAndroidRelease(data),
      uploadedBy: data?.uploadedBy ? String(data.uploadedBy) : '',
      certificateSha256: data?.certificateSha256 ? String(data.certificateSha256) : ''
    });
  } catch (error) {
    console.error('Admin Android app release lookup failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Unable to load the current Android app release.' });
  }
});
app.post('/admin/android-app/upload',
  async (req, res, next) => {
    const actor = await requireUser(req, res);
    if (!actor) return;
    if (!(await isAdminUser(actor))) return res.status(403).json({ success: false, error: 'Admin access denied.' });
    req.smvAndroidAppAdmin = actor;
    return next();
  },
  express.raw({ type: 'application/vnd.android.package-archive', limit: MAX_APK_BYTES }),
  async (req, res) => {
    const actor = req.smvAndroidAppAdmin;
    if (!actor) return res.status(401).json({ success: false, error: 'Admin authorization is required.' });
    if (!Buffer.isBuffer(req.body)) {
      return res.status(415).json({ success: false, error: 'Upload the APK as application/vnd.android.package-archive.' });
    }
    let apk;
    try {
      apk = inspectSmvAndroidApk(req.body);
    } catch (error) {
      return res.status(400).json({ success: false, error: error?.message || 'The APK failed SMV ASTRO release validation.' });
    }
    const releaseRef = SMV_ANDROID_RELEASE_REF();
    let currentCode = 1000;
    try {
      const currentSnapshot = await releaseRef.get();
      currentCode = Math.max(1000, currentSnapshot.exists ? Number(currentSnapshot.data()?.versionCode || 0) : 0);
    } catch (error) {
      console.error('Current Android release version lookup failed:', error?.message || error);
      return res.status(503).json({ success: false, error: 'Unable to verify the currently published Android app version.' });
    }
    if (apk.versionCode <= currentCode) {
      return res.status(409).json({
        success: false,
        error: 'The uploaded APK must have a higher versionCode than the current published version.',
        currentVersionCode: currentCode,
        uploadedVersionCode: apk.versionCode
      });
    }
    const bucketName = String(process.env.FIREBASE_STORAGE_BUCKET ||
      (IS_STAGING_DEPLOYMENT ? 'smv-astro-staging.firebasestorage.app' : 'smv-astro.firebasestorage.app')).trim();
    const token = crypto.randomUUID();
    const objectName = 'smv-astro/android/releases/' + apk.versionCode + '/' + crypto.randomUUID() + '.apk';
    let stored = false;
    try {
      const bucket = getStorage(admin.app()).bucket(bucketName);
      await bucket.file(objectName).save(req.body, {
        resumable: false,
        validation: 'crc32c',
        metadata: {
          contentType: 'application/vnd.android.package-archive',
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: {
            firebaseStorageDownloadTokens: token,
            smvPackageName: apk.packageName,
            smvVersionName: apk.versionName,
            smvVersionCode: String(apk.versionCode),
            smvSha256: apk.sha256
          }
        }
      });
      stored = true;
      const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
        encodeURIComponent(bucketName) + '/o/' + encodeURIComponent(objectName) +
        '?alt=media&token=' + encodeURIComponent(token);
      await db.runTransaction(async transaction => {
        const latest = await transaction.get(releaseRef);
        const latestCode = Math.max(1000, latest.exists ? Number(latest.data()?.versionCode || 0) : 0);
        if (apk.versionCode <= latestCode) {
          const conflict = new Error('A newer or equal Android APK version was published while this upload was processing.');
          conflict.httpStatus = 409;
          throw conflict;
        }
        transaction.set(releaseRef, {
          packageName: apk.packageName,
          versionName: apk.versionName,
          versionCode: apk.versionCode,
          downloadUrl,
          storagePath: objectName,
          sha256: apk.sha256,
          certificateSha256: apk.certificateSha256,
          size: apk.size,
          uploadedBy: actor.uid,
          uploadedAt: Date.now()
        });
      });
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        ...smvPublicAndroidRelease({ ...apk, downloadUrl, uploadedAt: Date.now() })
      });
    } catch (error) {
      if (stored) {
        try { await getStorage(admin.app()).bucket(bucketName).file(objectName).delete({ ignoreNotFound: true }); }
        catch (cleanupError) { console.error('Unpublished Android APK cleanup failed:', cleanupError?.message || cleanupError); }
      }
      console.error('Admin Android APK upload failed:', error?.stack || error);
      return res.status(error?.httpStatus || 503).json({
        success: false,
        error: error?.httpStatus === 409
          ? error.message
          : 'The APK could not be published to Firebase Storage. Check the backend Storage bucket configuration.'
      });
    }
  }
);

// Admin Content Manager reads and writes through Firebase Admin SDK so its UI does not depend on Firestore client rules.
// Public read-only view of published English content. Never expose drafts through this route.
app.get('/public/content', async (_req,res)=>{
  try{
    const snap=await contentStoreDb().collection('smv_content')
      .where('published','==',true).where('language','==','en').get();
    const items=snap.docs.map(d=>({id:d.id,...(d.data()||{})}))
      .sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a));
    return res.set('Cache-Control','public, max-age=60, stale-while-revalidate=300')
      .json({success:true,items});
  }catch(e){
    console.error('Public content read failed:',e?.message||e);
    return res.status(503).set('Cache-Control','no-store')
      .json({success:false,error:'Published content is temporarily unavailable.'});
  }
});

app.get("/admin/content", async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  try{
    const snap=await contentStoreDb().collection("smv_content").where("language","==","en").get();
    const items=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a));
    return res.set("Cache-Control","no-store").json({success:true,items});
  }catch(e){console.error("Admin content read failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to load Admin content."});}
});
app.post("/admin/content/save", express.json({limit:"30kb"}), async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const id=String(req.body?.id||"").trim(),input=req.body?.data;
  if(!id||id.length>200||id.includes("/")||!input||typeof input!=="object"||Array.isArray(input))return res.status(400).json({success:false,error:"A valid content ID and content payload are required."});
  const allowed=["kind","title","summary","language","bodyUrl","bodyPublicId","bodySize","coverUrl","coverPath","published","description","mediaType","url","storagePath","cloudinaryPublicId","size","mimeType","fileName"];
  const patch={};for(const key of allowed)if(Object.prototype.hasOwnProperty.call(input,key))patch[key]=input[key];
  if(patch.language!==undefined&&patch.language!=="en")return res.status(400).json({success:false,error:"Only English content can be managed here."});
  if(patch.kind!==undefined&&!["blog","media"].includes(String(patch.kind)))return res.status(400).json({success:false,error:"Unsupported content type."});
  if(patch.title!==undefined&&(typeof patch.title!=="string"||!patch.title.trim()||patch.title.length>240))return res.status(400).json({success:false,error:"Content title is required and must be 240 characters or less."});
  if(patch.published!==undefined&&typeof patch.published!=="boolean")return res.status(400).json({success:false,error:"Published must be true or false."});
  try{
    const ref=contentStoreDb().collection("smv_content").doc(id),old=await ref.get();
    const now=FieldValue.serverTimestamp();
    patch.updatedAt=now;patch.updatedBy=actor.uid;
    if(!old.exists){patch.createdAt=now;patch.authorUid=actor.uid;if(patch.published===true)patch.publishedAt=now;}
    else if(patch.published===true)patch.publishedAt=now;
    await ref.set(patch,{merge:true});
    await mirrorAdminContentPatch(id,patch);
    return res.set("Cache-Control","no-store").json({success:true,id});
  }catch(e){console.error("Admin content save failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to save Admin content."});}
});
app.post("/admin/content/toggle", express.json({limit:"5kb"}), async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const id=String(req.body?.id||"").trim();
  if(!id||id.length>200||id.includes("/")||typeof req.body?.published!=="boolean")return res.status(400).json({success:false,error:"Content ID and publish state are required."});
  try{const patch={published:req.body.published,publishedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.uid};const ref=contentStoreDb().collection("smv_content").doc(id),snap=await ref.get();if(!snap.exists)return res.status(404).json({success:false,error:"Content not found."});await ref.set(patch,{merge:true});await mirrorAdminContentPatch(id,patch);return res.json({success:true,id,published:req.body.published});}
  catch(e){console.error("Admin content toggle failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to update Admin content."});}
});
app.post("/admin/content/delete", express.json({limit:"5kb"}), async (req,res)=>{
  const actor=await requireUser(req,res); if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const id=String(req.body?.id||"").trim();
  if(!id||id.length>200||id.includes("/"))return res.status(400).json({success:false,error:"A valid content ID is required."});
  try{await contentStoreDb().collection("smv_content").doc(id).delete();await mirrorAdminContentDelete(id);return res.json({success:true,id});}
  catch(e){console.error("Admin content delete failed:",e?.stack||e);return res.status(500).json({success:false,error:"Unable to delete Admin content."});}
});

app.post("/admin/astrologer-languages", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res);
  if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim();
  const rawLanguages=Array.isArray(req.body?.languages)?req.body.languages:String(req.body?.languages||"").split(/[,;|]/);
  const languages=[...new Set(rawLanguages.map(v=>String(v||"").trim().replace(/\s+/g," ")).filter(Boolean))];
  if(!astrologerId||astrologerId.length>200)return res.status(400).json({success:false,error:"A valid Astrologer profile ID is required."});
  if(!languages.length||languages.length>12||languages.some(v=>v.length>40)||languages.join(", ").length>240)return res.status(400).json({success:false,error:"Enter 1–12 spoken languages, each up to 40 characters."});
  try{
    const collection=db.collection("smv_astrologers");
    const selectedRef=collection.doc(astrologerId),selectedSnap=await selectedRef.get();
    if(!selectedSnap.exists)return res.status(404).json({success:false,error:"Astrologer profile not found."});
    const selected=selectedSnap.data()||{},uid=String(selected.uid||selectedSnap.id).trim();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"This Astrologer profile has no valid linked login UID."});
    const canonicalRef=collection.doc(uid),linkedSnap=await collection.where("uid","==",uid).limit(25).get();
    const refs=new Map([[selectedRef.path,selectedRef],[canonicalRef.path,canonicalRef]]);
    for(const docSnap of linkedSnap.docs)refs.set(docSnap.ref.path,docSnap.ref);
    const batch=db.batch(),patch={languages,spokenLanguages:languages,updatedAt:FieldValue.serverTimestamp()};
    for(const ref of refs.values())batch.set(ref,patch,{merge:true});
    batch.set(db.collection("smv_users").doc(uid),patch,{merge:true});
    await batch.commit();
    return res.set("Cache-Control","no-store").json({success:true,astrologerId,uid,languages});
  }catch(e){
    console.error("Admin Astrologer language update failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to save Astrologer languages. No partial changes were committed."});
  }
});

app.post("/admin/astrologer-pricing", express.json({limit:"10kb"}), async (req,res)=>{
  const actor=await requireUser(req,res);
  if(!actor)return;
  if(!(await isAdminUser(actor)))return res.status(403).json({success:false,error:"Admin access denied."});
  const astrologerId=String(req.body?.astrologerId||"").trim();
  const body=req.body||{};
  const hasChat=Object.prototype.hasOwnProperty.call(body,"pricePerQuestion");
  const hasCall=Object.prototype.hasOwnProperty.call(body,"callPricePerMinute");
  const hasLiveChat=Object.prototype.hasOwnProperty.call(body,"chatPricePerMinute");
  const chatPrice=Number(body.pricePerQuestion);
  const callPrice=Number(body.callPricePerMinute);
  const liveChatPrice=Number(body.chatPricePerMinute);
  if(!astrologerId||astrologerId.length>200)return res.status(400).json({success:false,error:"A valid Astrologer profile ID is required."});
  if(!hasChat&&!hasCall&&!hasLiveChat)return res.status(400).json({success:false,error:"Enter a Live Call or Live Chat per-minute price before saving."});
  if(hasChat&&(!Number.isFinite(chatPrice)||chatPrice<1||chatPrice>100000||Math.abs(chatPrice*100-Math.round(chatPrice*100))>1e-7)){
    return res.status(400).json({success:false,error:"Chat Price must be between ₹1 and ₹100000, with up to two decimal places."});
  }
  if(hasCall&&(!Number.isFinite(callPrice)||callPrice<0||(callPrice!==0&&callPrice<1)||callPrice>10000||Math.abs(callPrice*100-Math.round(callPrice*100))>1e-7)){
    return res.status(400).json({success:false,error:"Live Call Price must be ₹0 (unset) or between ₹1 and ₹10000 per minute, with up to two decimal places."});
  }
  if(hasLiveChat&&(!Number.isFinite(liveChatPrice)||liveChatPrice<0||(liveChatPrice!==0&&liveChatPrice<1)||liveChatPrice>10000||Math.abs(liveChatPrice*100-Math.round(liveChatPrice*100))>1e-7)){
    return res.status(400).json({success:false,error:"Live Chat Price must be ₹0 (unset) or between ₹1 and ₹10000 per minute, with up to two decimal places."});
  }
  try{
    const collection=db.collection("smv_astrologers");
    const selectedRef=collection.doc(astrologerId);
    const selectedSnap=await selectedRef.get();
    if(!selectedSnap.exists)return res.status(404).json({success:false,error:"Astrologer profile not found. Refresh the profile list and try again."});
    const selected=selectedSnap.data()||{};
    const uid=String(selected.uid||selectedSnap.id).trim();
    if(!uid||uid.length>128)return res.status(409).json({success:false,error:"This Astrologer profile has no valid linked login UID."});
    if(!["approved","active"].includes(String(selected.status||"").toLowerCase())){
      return res.status(409).json({success:false,error:"Prices can only be changed for an approved Astrologer."});
    }
    const byUid=await collection.where("uid","==",uid).get();
    const targets=new Map([[selectedSnap.id,selectedRef]]);
    // Do not create a blank UID-keyed record just to save a price. Add the
    // canonical target only when it already exists (or it is the selected doc).
    if(uid===selectedSnap.id)targets.set(uid,selectedRef);
    else{
      const canonicalRef=collection.doc(uid),canonicalSnap=await canonicalRef.get();
      if(canonicalSnap.exists)targets.set(uid,canonicalRef);
    }
    for(const docSnap of byUid.docs){
      const record=docSnap.data()||{};
      if(!record.uid||String(record.uid)===uid)targets.set(docSnap.id,docSnap.ref);
    }
    if(selected.publicId){
      const byPublicId=await collection.where("publicId","==",String(selected.publicId)).get();
      for(const docSnap of byPublicId.docs){
        const record=docSnap.data()||{};
        if((!record.uid||String(record.uid)===uid)&&String(record.publicId||"")===String(selected.publicId)){
          targets.set(docSnap.id,docSnap.ref);
        }
      }
    }
    const patch={updatedAt:FieldValue.serverTimestamp()};
    if(hasChat){
      patch.pricePerQuestion=Math.round(chatPrice*100)/100;
      patch.chatPriceUpdatedAt=FieldValue.serverTimestamp();
      patch.chatPriceUpdatedBy=actor.uid;
    }
    if(hasCall){
      if(callPrice===0){
        patch.callPricePerMinute=FieldValue.delete();
        patch.pricePerMinute=FieldValue.delete();
        patch.callRatePerMinute=FieldValue.delete();
      }else patch.callPricePerMinute=Math.round(callPrice*100)/100;
      patch.callPriceUpdatedAt=FieldValue.serverTimestamp();
      patch.callPriceUpdatedBy=actor.uid;
    }
    if(hasLiveChat){
      if(liveChatPrice===0){
        patch.chatPricePerMinute=FieldValue.delete();
        patch.liveChatPricePerMinute=FieldValue.delete();
        patch.chatRatePerMinute=FieldValue.delete();
      }else patch.chatPricePerMinute=Math.round(liveChatPrice*100)/100;
      patch.liveChatPriceUpdatedAt=FieldValue.serverTimestamp();
      patch.liveChatPriceUpdatedBy=actor.uid;
    }
    const batch=db.batch();
    for(const ref of targets.values())batch.set(ref,patch,{merge:true});
    await batch.commit();
    publicAstrologersCache={expiresAt:0,data:null};
    return res.set("Cache-Control","no-store").json({
      success:true,astrologerId,uid,updatedProfiles:targets.size,
      pricePerQuestion:hasChat?Math.round(chatPrice*100)/100:Number(selected.pricePerQuestion||0),
      callPricePerMinute:hasCall?(callPrice===0?null:Math.round(callPrice*100)/100):(selected.callPricePerMinute??null),
      chatPricePerMinute:hasLiveChat?(liveChatPrice===0?null:Math.round(liveChatPrice*100)/100):(selected.chatPricePerMinute??null)
    });
  }catch(e){
    console.error("Admin Astrologer pricing update failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to save Astrologer pricing. The related profiles were not partially updated."});
  }
});

app.get("/admin/astrologers-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const [usersSnap,astrologersSnap]=await Promise.all([
      db.collection("smv_users").get(),
      db.collection("smv_astrologers").get()
    ]);
    return res.json({
      success:true,
      users:usersSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a)),
      astrologers:astrologersSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a))
    });
  }catch(e){
    console.error("Admin astrologers targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin astrologer data."});
  }
});

app.post("/admin/dashboard-touch", async (req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  // Cache invalidation + realtime signal are handled by the mutation middleware
  // after this successful response. This endpoint is used only after direct
  // Firestore Admin UI writes that do not pass through another backend route.
  return res.json({success:true});
});

app.get("/admin-data", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access denied." });
  if(adminDataCache.payload && Date.now()<adminDataCache.expiresAt){
    return res.set('Cache-Control','no-store').json(adminDataCache.payload);
  }

  const readCollection = async (name,source=db.collection(name)) => {
    try {
      const snap = await source.get();
      return { ok: true, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) {
      console.error(`Admin collection ${name} failed:`, e?.message || e);
      return { ok: false, items: [], error: e?.message || `Unable to read ${name}.` };
    }
  };
  const readCount = async (name,source) => {
    try {
      const snap = await source.count().get();
      return { ok:true, count:Number(snap.data()?.count||0), error:null };
    } catch (e) {
      console.error(`Admin aggregate count ${name} failed:`,e?.message||e);
      return { ok:false, count:null, error:e?.message||`Unable to count ${name}.` };
    }
  };

  try {
    // Admin landing only loads current management controls and Live Call/Chat earnings.
    // Retired Q&A counts and histories are not Dashboard dependencies.
    const [customerCountResult, astrologers, livePayments, commission, astrologerAutoApproval, horoscopePayment] = await Promise.all([
      readCount("customers",db.collection("smv_users").where("role","==","customer")),
      readCollection("smv_astrologers"),
      readCollection("smv_payments",walletDomainDb().collection("smv_payments").where("source","==","live_session")),
      walletDomainDb().collection("smv_settings").doc("commission").get().then(s=>s.exists?s.data():null).catch(()=>null),
      getAstrologerAutoApprovalSettings(true),
      getHoroscopePaymentSettings()
    ]);

    // Only pending Astrologers need user contact details on the landing page.
    // Fetch those UID-scoped profiles instead of reading every user document.
    const pendingAstrologers=astrologers.items.filter(a=>String(a.status||"").toLowerCase()==="pending");
    const pendingUserProfiles=await Promise.all(pendingAstrologers.map(async a=>{
      try{
        const snap=await db.collection("smv_users").doc(a.id).get();
        return [a.id,snap.exists?(snap.data()||{}):{}];
      }catch(e){
        console.warn("Pending Astrologer contact lookup skipped:",a.id,e?.message||e);
        return [a.id,{}];
      }
    }));
    const pendingUserMap=new Map(pendingUserProfiles);
    const astrologerItems=astrologers.items.map(a=>{
      if(String(a.status||"").toLowerCase()!=="pending")return a;
      const userProfile=pendingUserMap.get(a.id)||{};
      return {...a,adminContactEmail:String(userProfile.email||""),adminContactMobile:String(userProfile.mobile||userProfile.phone||"")};
    });
    const newestFirst = items => (items || []).slice().sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a));
    const payload={
      success: true,
      settings: {commission, astrologerAutoApproval, horoscopePayment},
      customerCount: customerCountResult.count,
      astrologerCount: astrologers.items.length,
      astrologers: newestFirst(astrologerItems),
      payments: newestFirst(livePayments.items),
      errors: { customers: customerCountResult.error || null, astrologers: astrologers.error || null, payments: livePayments.error || null }
    };
    adminDataCache={payload,expiresAt:Date.now()+8000};
    return res.set('Cache-Control','no-store').json(payload);
  } catch (e) {
    console.error("Admin data load failed:", e);
    return res.status(500).json({ error: e?.message || "Unable to load Admin data." });
  }
});


app.get("/astrologer/earnings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    // Live-session billing writes its earning payment in the same endSession
    // transaction. Do not scan and transactionally replay every historical
    // session each time the Astrologer opens the Dashboard.
    const uid=String(user.uid||"");
    const liveEarningsQuery=walletDomainDb().collection("smv_payments")
      .where("astrologerId", "==", uid)
      .where("source", "==", "live_session")
      .where("type", "==", "astrologer_earning")
      .where("status", "==", "credited");
    const [profileSnap, questionSnap, privateSnap, withdrawalSnap, liveRecentResult, liveAggregateResult] = await Promise.all([
      db.collection("smv_users").doc(uid).get(),
      db.collection("smv_questions")
        .where("astrologerId", "==", uid)
        .where("status", "==", "answered")
        .where("commissionStatus", "==", "credited")
        .select("astrologerCommissionAmount", "commissionAmount").get(),
      db.collection("smv_private_consultations")
        .where("astrologerId", "==", uid)
        .where("commissionStatus", "==", "credited")
        .select("astrologerCreditedAmount", "astrologerAmount").get(),
      walletDomainDb().collection("smv_withdrawals").where("astrologerId", "==", uid).get(),
      // The dashboard renders at most 50 earnings rows. Avoid transferring every
      // historical Live Session payment just to display that short history.
      liveEarningsQuery.orderBy("createdAt", "desc").limit(50).get()
        .then(snapshot=>({snapshot}),error=>({error})),
      // The total still includes every credited Live Session earning, but the
      // aggregate returns one number instead of every matching payment document.
      liveEarningsQuery.aggregate({
        liveEarningsTotal: admin.firestore.AggregateField.sum("earningAmount")
      }).get().then(snapshot=>({snapshot}),error=>({error}))
    ]);
    const profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
    const role = String(profile.role || user.role || "").toLowerCase();
    if (role && role !== "astrologer") {
      return res.status(403).json({ error: "Only an astrologer account can read earnings." });
    }

    // The query fallback keeps the Dashboard and totals working before the new
    // createdAt composite index finishes deploying, or if aggregation is unavailable.
    let liveEarningsSnap=liveRecentResult.snapshot||null;
    let liveEarningsTotal=liveAggregateResult.snapshot
      ?Number(liveAggregateResult.snapshot.data().liveEarningsTotal||0)
      :null;
    if(!liveEarningsSnap||liveEarningsTotal===null||!Number.isFinite(liveEarningsTotal)){
      const fullLiveEarningsSnap=await liveEarningsQuery.get();
      if(!liveEarningsSnap)liveEarningsSnap=fullLiveEarningsSnap;
      if(liveEarningsTotal===null||!Number.isFinite(liveEarningsTotal)){
        liveEarningsTotal=fullLiveEarningsSnap.docs.reduce((sum,docSnap)=>{
          const payment=docSnap.data()||{};
          return sum+Number(payment.earningAmount??payment.commissionAmount??0);
        },0);
      }
    }

    // Previously credited consultation earnings remain included for accurate withdrawal eligibility.
    // This is historical read-only accounting; the retired Q&A endpoints are gone.
    const questions = questionSnap.docs.map(d=>({id:d.id,questionId:d.id,...d.data()}));
    const allPrivate = privateSnap.docs.map(d=>({id:d.id,consultationId:d.id,...d.data()}));
    const withdrawals = withdrawalSnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>smvNewestActivityMillis(b)-smvNewestActivityMillis(a));

    // Keep historical settled commissions in the withdrawal-eligibility total so no
    // previously earned balance is lost, but show only Live Call/Chat earnings
    // in the current Dashboard history.
    let historicalEarnings = 0;
    for(const q of questions){
      historicalEarnings += Number(q.astrologerCommissionAmount || q.commissionAmount || 0);
    }
    for(const c of allPrivate){
      historicalEarnings += Number(c.astrologerCreditedAmount ?? c.astrologerAmount ?? 0);
    }
    const ledger = [];
    for (const paymentDoc of liveEarningsSnap.docs) {
      const payment = paymentDoc.data() || {};
      ledger.push({
        id: payment.sessionId || paymentDoc.id,
        question: payment.question || ("Live " + String(payment.mode || "chat").toUpperCase()),
        commission: Number(payment.earningAmount ?? payment.commissionAmount ?? 0),
        date: payment.commissionCreditedAt || payment.createdAt || null
      });
    }
    const toMs = value => value?.toMillis ? value.toMillis() : (value?.seconds ? Number(value.seconds) * 1000 : (value instanceof Date ? value.getTime() : Number(value || 0)));
    ledger.sort((a,b) => toMs(b.date) - toMs(a.date));
    const totalEarnings = Math.round((historicalEarnings + liveEarningsTotal) * 100) / 100;
    return res.set('Cache-Control','no-store').json({success:true,totalEarnings,ledger:ledger.slice(0,50),withdrawals});
  } catch (e) {
    console.error("Astrologer earnings load failed:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Unable to load astrologer earnings." });
  }
});

// V165 withdrawal request: all protected counter + withdrawal writes happen on Render
// with Firebase Admin SDK. The browser no longer needs permission to write smv_counters.
app.post("/astrologer/withdrawal-request", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const amount = Math.round(Number(req.body?.amount || 0) * 100) / 100;
    const minimumWithdrawal = 300;
    if (!Number.isFinite(amount) || amount < minimumWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal is ₹${minimumWithdrawal}.` });
    }

    const profileSnap = await db.collection("smv_users").doc(user.uid).get();
    const profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
    const role = String(profile.role || user.role || "").toLowerCase();
    if (role && role !== "astrologer") {
      return res.status(403).json({ error: "Only an astrologer account can request a withdrawal." });
    }

    // Wallet/earnings are written by the successful session settlement transaction.
    // Validate withdrawals using credited historic earnings and live-session earnings;
    // never replay every completed session on a button click.
    const [questionSnap, privateCreditSnap, liveCreditSnap, withdrawalSnap] = await Promise.all([
      db.collection("smv_questions")
        .where("astrologerId", "==", user.uid)
        .where("status", "==", "answered")
        .where("commissionStatus", "==", "credited").get(),
      db.collection("smv_private_consultations")
        .where("astrologerId", "==", user.uid)
        .where("commissionStatus", "==", "credited").get(),
      walletDomainDb().collection("smv_payments")
        .where("astrologerId", "==", user.uid)
        .where("source", "==", "live_session")
        .where("type", "==", "astrologer_earning")
        .where("status", "==", "credited").get(),
      walletDomainDb().collection("smv_withdrawals").where("astrologerId", "==", user.uid).get()
    ]);
    let totalEarnings = 0;
    questionSnap.docs.forEach(d => {
      const q = d.data() || {};
      totalEarnings += Number(q.astrologerCommissionAmount || q.commissionAmount || 0);
    });
    privateCreditSnap.docs.forEach(d => {
      const c = d.data() || {};
      totalEarnings += Number(c.astrologerCreditedAmount ?? c.astrologerAmount ?? 0);
    });
    liveCreditSnap.docs.forEach(d => {
      const payment = d.data() || {};
      totalEarnings += Number(payment.earningAmount ?? payment.commissionAmount ?? 0);
    });

    let reservedWithdrawals = 0;
    withdrawalSnap.docs.forEach(d => {
      const w = d.data() || {};
      if (["pending", "processing", "paid"].includes(String(w.status || "").toLowerCase())) {
        reservedWithdrawals += Number(w.amount || 0);
      }
    });

    const available = Math.max(0, Math.round((totalEarnings - reservedWithdrawals) * 100) / 100);
    if (amount > available + 0.0001) {
      return res.status(400).json({ error: `Withdrawal amount cannot exceed available earnings of ₹${available.toFixed(2)}.` });
    }

    // Withdrawal cooldown: once a non-rejected withdrawal is requested,
    // the next withdrawal is blocked for a full 7 x 24 hours. This is
    // enforced on the server as well as in the dashboard UI.
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    let latestWithdrawalMs = 0;
    withdrawalSnap.docs.forEach(d => {
      const w = d.data() || {};
      const st = String(w.status || 'pending').toLowerCase();
      if (!['pending','processing','paid'].includes(st)) return;
      const raw = w.createdAt || w.requestedAt || w.paidAt || null;
      let ms = 0;
      if (raw && typeof raw.toMillis === 'function') ms = raw.toMillis();
      else if (raw instanceof Date) ms = raw.getTime();
      else if (typeof raw === 'number') ms = raw;
      if (ms > latestWithdrawalMs) latestWithdrawalMs = ms;
    });
    if (latestWithdrawalMs && (Date.now() - latestWithdrawalMs < cooldownMs)) {
      const availableAt = new Date(latestWithdrawalMs + cooldownMs);
      return res.status(400).json({
        error: `Withdrawal is blocked for 7 days after the last withdrawal request. Available again on ${availableAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`
      });
    }

    const withdrawalId = newSmvId("smvwd");

    // The approved payout method is stored in smv_payouts/{astrologerUid}.
    // Read it at withdrawal time so Admin can pay to the exact approved method.
    const payoutSnap = await db.collection("smv_payouts").doc(user.uid).get();
    const payout = payoutSnap.exists ? (payoutSnap.data() || {}) : {};
    const payoutStatus = String(payout.status || "").toLowerCase();
    if (!payoutSnap.exists || !["approved", "pending_admin_review"].includes(payoutStatus)) {
      return res.status(400).json({ error: "Your bank/UPI payment method is not available for withdrawal. Please contact Admin." });
    }
    const requiredPayout = ["bankName", "accountName", "accountNumber", "ifsc"];
    if (requiredPayout.some(k => !String(payout[k] || "").trim())) {
      return res.status(400).json({ error: "Your approved bank payment details are incomplete. Please contact Admin." });
    }

    const financeDb=walletDomainDb();
    const withdrawalRef = financeDb.collection("smv_withdrawals").doc();
    const payoutSnapshotRef = financeDb.collection("smv_withdrawal_payouts").doc(withdrawalRef.id);
    const createdAt = FieldValue.serverTimestamp();
    const withdrawalData = {
      astrologerId: user.uid,
      astrologerName: profile.name || user.name || user.displayName || "Astrologer",
      amount,
      withdrawalId,
      status: "pending",
      createdAt,
      requestedAt: createdAt
    };
    // Keep the financial withdrawal request and its private payout snapshot atomic
    // inside the same selected Wallet domain; the browser never receives bank details.
    const payoutSnapshotData = {
      withdrawalDocId: withdrawalRef.id,
      withdrawalId,
      astrologerId: user.uid,
      astrologerName: profile.name || user.name || user.displayName || "Astrologer",
      bankName: String(payout.bankName || "").trim(),
      accountName: String(payout.accountName || "").trim(),
      accountNumber: String(payout.accountNumber || "").trim(),
      ifsc: String(payout.ifsc || "").trim().toUpperCase(),
      upi: String(payout.upi || "").trim(),
      payoutStatus,
      createdAt
    };
    const withdrawalBatch = financeDb.batch();
    withdrawalBatch.set(withdrawalRef, withdrawalData);
    withdrawalBatch.set(payoutSnapshotRef, payoutSnapshotData);
    await withdrawalBatch.commit();

    console.log("Withdrawal request created", { astrologerId:user.uid, withdrawalId, amount, payoutStatus });
    return res.json({
      ok: true,
      withdrawalId,
      paymentId: withdrawalId,
      amount,
      availableAfter: Math.max(0, Math.round((available - amount) * 100) / 100)
    });
  } catch (e) {
    console.error("Withdrawal request error:", e?.stack || e);
    return res.status(500).json({ error: e?.message || "Unable to create withdrawal request." });
  }
});

// V196: Admin marks an astrologer withdrawal as paid.
// Idempotent: creates smvpt exactly once, including repairing an older
// paid withdrawal that was saved without an Admin Payment ID.
app.post("/admin/withdrawal-mark-paid", express.json({limit:"5kb"}), async (req, res) => {
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try {
    const withdrawalDocId = String(req.body?.withdrawalDocId || "").trim();
    if (!withdrawalDocId) return res.status(400).json({error:"Withdrawal document ID is required."});
    const financeDb=walletDomainDb();
    const withdrawalRef = financeDb.collection("smv_withdrawals").doc(withdrawalDocId);
    const result = await financeDb.runTransaction(async tx => {
      const snap = await tx.get(withdrawalRef);
      if (!snap.exists) throw new Error("Withdrawal request not found.");
      const w = snap.data() || {};
      const status = String(w.status || "").toLowerCase();

      // Already paid with a proper PMT: safe retry, return the same ID.
      const existingAdminPaymentId = String(w.adminPaymentId || "").trim();
      if (status === "paid" && /^(?:smvpt-|smv-pmt-)/i.test(existingAdminPaymentId)) {
        return {paymentId: existingAdminPaymentId, withdrawalId:String(w.withdrawalId || ""), amount:Number(w.amount || 0), repaired:false};
      }

      // A previous version may have marked the withdrawal paid but failed to
      // attach smvpt. Repair it here without changing the existing Withdrawal ID.
      if (status !== "processing" && status !== "paid") {
        throw new Error("Only a processing withdrawal can be marked as paid.");
      }

      const id = newSmvId("smvpt");
      tx.update(withdrawalRef, {
        status:"paid",
        adminPaymentId:id,
        paymentId:id,
        paidAt:w.paidAt || FieldValue.serverTimestamp(),
        updatedAt:FieldValue.serverTimestamp(),
        updatedBy:user.uid
      });
      return {paymentId:id, withdrawalId:String(w.withdrawalId || ""), amount:Number(w.amount || 0), repaired:status === "paid"};
    });

    return res.json({ok:true, ...result});
  } catch (e) {
    console.error("Admin withdrawal mark-paid error:", e?.stack || e);
    return res.status(500).json({error:e?.message || "Unable to mark withdrawal as paid."});
  }
});

// V167 admin-only withdrawal payout details.
// Prefer the private withdrawal snapshot; fall back to the astrologer's currently
// approved payout method so older withdrawal requests can still be paid by Admin.
app.get("/admin/withdrawal-payout/:withdrawalDocId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access denied." });
  try {
    const withdrawalDocId = String(req.params.withdrawalDocId || "").trim();
    if (!withdrawalDocId) return res.status(400).json({ error: "Withdrawal document ID is required." });

    const financeDb=walletDomainDb();
    const withdrawalSnap = await financeDb.collection("smv_withdrawals").doc(withdrawalDocId).get();
    if (!withdrawalSnap.exists) return res.status(404).json({ error: "Withdrawal request not found." });
    const withdrawal = withdrawalSnap.data() || {};

    const snapshotRef = financeDb.collection("smv_withdrawal_payouts").doc(withdrawalDocId);
    const snapshot = await snapshotRef.get();
    let payout = snapshot.exists ? (snapshot.data() || {}) : {};
    let source = snapshot.exists ? "withdrawal_snapshot" : "current_payout_method";

    if (!snapshot.exists && withdrawal.astrologerId) {
      const current = await db.collection("smv_payouts").doc(withdrawal.astrologerId).get();
      if (current.exists) payout = current.data() || {};
    }

    return res.json({
      success: true,
      source,
      bankName: String(payout.bankName || "").trim(),
      accountName: String(payout.accountName || "").trim(),
      accountNumber: String(payout.accountNumber || "").trim(),
      ifsc: String(payout.ifsc || "").trim().toUpperCase(),
      upi: String(payout.upi || "").trim(),
      available: !!(payout.bankName || payout.accountName || payout.accountNumber || payout.ifsc || payout.upi)
    });
  } catch (e) {
    console.error("Admin withdrawal payout details error:", e?.stack || e);
    return res.status(500).json({ error: "Unable to load private payment details." });
  }
});

// STRICT OFFLINE: Place Search uses bundled browser data; /api/geocode is intentionally absent.
// STRICT OFFLINE: /api/horoscope/* and Horoscope AI endpoints are intentionally absent.

app.post("/razorpay/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.get("X-Razorpay-Signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).send("Invalid webhook configuration");
    const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
    if (!signatureEqual(expected, signature)) return res.status(401).send("Invalid signature");
    const event = JSON.parse(req.body.toString("utf8"));
    const eventType = event.event || "unknown";
    const paymentEntity = event?.payload?.payment?.entity || null;
    const orderEntity = event?.payload?.order?.entity || null;
    const paymentId = paymentEntity?.id || null;
    const orderId = orderEntity?.id || paymentEntity?.order_id || null;
    const eventKey = `${eventType}_${paymentId || orderId || crypto.createHash("sha256").update(req.body).digest("hex")}`.replace(/\//g, "_");
    if (!eventKey) return res.status(400).send("Invalid webhook event key");
    const eventDb = walletDomainDb();
    const eventRef = eventDb.collection("razorpay_webhook_events").doc(eventKey);
    const previousEventSnap = await eventRef.get();
    if (previousEventSnap.exists && previousEventSnap.data()?.processed === true) return res.status(200).send("OK");
    if (previousEventSnap.exists) {
      // A prior attempt failed before marking the event complete. Allow Razorpay retries
      // to resume; Wallet credits themselves are protected by a transactional ledger key.
      await eventRef.set({ retryCount: FieldValue.increment(1), lastRetryAt: FieldValue.serverTimestamp(), processed: false }, { merge: true });
    } else {
      await eventRef.set({ event: eventType, razorpayPaymentId: paymentId, razorpayOrderId: orderId, receivedAt: FieldValue.serverTimestamp(), retryCount: 0, processed: false });
    }
    if (orderId) {
      let orderDb = eventDb;
      let orderRef = orderDb.collection("razorpay_orders").doc(orderId);
      let orderSnap = await orderRef.get();
      if (!orderSnap.exists && eventDb !== db) {
        const primaryOrderRef = db.collection("razorpay_orders").doc(orderId);
        const primaryOrderSnap = await primaryOrderRef.get();
        const primaryOrder = primaryOrderSnap.exists ? (primaryOrderSnap.data() || {}) : {};
        if (primaryOrder.walletRechargeId) {
          throw new Error("Wallet recharge Razorpay order is missing from Project 5. Repair/backfill this order before webhook processing.");
        }
        orderDb = db;
        orderRef = primaryOrderRef;
        orderSnap = primaryOrderSnap;
      }
      const stored = orderSnap.exists ? orderSnap.data() : {};
      const newStatus = ["payment.captured", "order.paid"].includes(eventType) ? "paid" : eventType === "payment.failed" ? "failed" : null;
      if (newStatus) await orderRef.set({ status: newStatus, razorpayPaymentId: paymentId, lastWebhookEvent: eventType, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (newStatus === "paid" && stored.walletRechargeId && paymentId) {
        try {
          await walletService.handleCapturedWebhook({
            rechargeId: stored.walletRechargeId, orderId, paymentId,
            amountPaise: Number(paymentEntity?.amount), currency: String(paymentEntity?.currency || "INR")
          });
        } catch (walletError) {
          console.error("Wallet recharge webhook credit failed; return 500 for retry:", walletError?.stack || walletError);
          throw walletError;
        }
      }
      
    }
    // Refund and other Razorpay transaction events are always copied to Admin.
    if (eventType.startsWith("refund.")) {
      const refundEntity = event?.payload?.refund?.entity || {};
      const amount = refundEntity.amount != null ? Number(refundEntity.amount) / 100 : null;

      await sendAdminTransactionEmail({
        eventType: eventType.toUpperCase(),
        paymentId: refundEntity.payment_id || paymentId,
        orderId,
        amount,
        currency: refundEntity.currency || "INR",
        questionId: null,
        customerEmail: stored?.customerEmail || null,
        status: refundEntity.status || eventType
      });
    } else if (!["payment.captured","order.paid","payment.failed"].includes(eventType)) {
      await sendAdminTransactionEmail({
        eventType: eventType.toUpperCase(),
        paymentId,
        orderId,
        amount: paymentEntity?.amount != null ? Number(paymentEntity.amount) / 100 : null,
        currency: paymentEntity?.currency || orderEntity?.currency || "INR",
        questionId: null,
        customerEmail: null,
        status: eventType
      });
    }
    await eventRef.set({ processed: true, processedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).send("OK");
  } catch (e) {
    console.error("Webhook processing error:", e);
    return res.status(500).send("Webhook processing failed");
  }
});

// Horoscope application/runtime files are not served by this backend.
// The frontend/PWA owns its permitted static-asset delivery and offline cache policy.

// V131 — SMV HOROSCOPE paid-feature control. Calculations remain browser-local;
// the backend only supplies Admin pricing, creates/verifies Razorpay orders and
// records a per-customer/per-report entitlement.
const HOROSCOPE_FEATURES=new Set(["advanced_analysis","marriage_matching"]);
function horoscopeFeatureDefaults(){return {advancedAnalysisEnabled:false,advancedAnalysisPrice:0,marriageMatchingEnabled:false,marriageMatchingPrice:0};}
function normalizeHoroscopeFeature(enabled,price){
  const p=Math.round(Number(price)*100)/100;
  // V260: Preserve the Admin-configured price even when the payment switch is
  // OFF. OFF + Rs.1 grants the free full report after Customer login, whereas
  // OFF + Rs.0 is basic only. ON + Rs.1+ retains the paid/Razorpay flow.
  const savedPrice=Number.isFinite(p)&&p>=0?p:0;
  return {enabled:enabled===true&&savedPrice>=1,price:savedPrice};
}
function normalizeHoroscopeSettings(raw={}){
  const a=normalizeHoroscopeFeature(raw.advancedAnalysisEnabled,raw.advancedAnalysisPrice);
  const m=normalizeHoroscopeFeature(raw.marriageMatchingEnabled,raw.marriageMatchingPrice);
  return {...raw,advancedAnalysisEnabled:a.enabled,advancedAnalysisPrice:a.price,marriageMatchingEnabled:m.enabled,marriageMatchingPrice:m.price};
}
async function getHoroscopePaymentSettings(){
  try{const snap=await db.collection("smv_settings").doc("horoscopePayment").get();return normalizeHoroscopeSettings({...horoscopeFeatureDefaults(),...(snap.exists?snap.data():{})});}
  catch(_){return horoscopeFeatureDefaults();}
}
function horoscopeFeaturePrice(cfg,feature){return feature==="advanced_analysis"?normalizeHoroscopeFeature(cfg.advancedAnalysisEnabled,cfg.advancedAnalysisPrice):normalizeHoroscopeFeature(cfg.marriageMatchingEnabled,cfg.marriageMatchingPrice);}
function cleanReportKey(v){const s=String(v||"").trim();return /^[a-f0-9]{64}$/i.test(s)?s:"";}
function horoscopeEntitlementId(uid,feature,reportKey){return crypto.createHash("sha256").update(`${uid}|${feature}|${reportKey}`).digest("hex");}
async function requireCustomerOnly(user,res){
  const snap=await db.collection("smv_users").doc(user.uid).get();const role=String(snap.data()?.role||"customer").toLowerCase();
  if(role!=="customer"){res.status(403).json({error:"Customer login is required for Horoscope payment."});return false;}return true;
}
app.get("/horoscope-auth/session",async(req,res)=>{const user=await requireUser(req,res);if(!user)return;const snap=await db.collection("smv_users").doc(user.uid).get();const role=String(snap.data()?.role||"customer").toLowerCase();return res.json({success:true,role});});
app.get("/horoscope-feature-config",async(_req,res)=>{res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.set("Pragma","no-cache");res.set("Expires","0");const c=await getHoroscopePaymentSettings(),a=horoscopeFeaturePrice(c,"advanced_analysis"),m=horoscopeFeaturePrice(c,"marriage_matching");return res.json({success:true,advanced_analysis:{...a,mode:a.enabled?"paid":"free_login"},marriage_matching:{...m,mode:m.enabled?"paid":"free_login"}});});
app.post("/admin/horoscope-feature-settings",async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const b=req.body||{},ae=b.advancedAnalysisEnabled===true,me=b.marriageMatchingEnabled===true;
  const ap=Math.round(Number(b.advancedAnalysisPrice)*100)/100,mp=Math.round(Number(b.marriageMatchingPrice)*100)/100;
  if(ae&&(!Number.isFinite(ap)||ap<1))return res.status(400).json({error:"Advanced Analysis ON requires a price of at least ₹1."});
  if(me&&(!Number.isFinite(mp)||mp<1))return res.status(400).json({error:"Marriage Matching ON requires a price of at least ₹1."});
  if(!Number.isFinite(ap)||ap<0||!Number.isFinite(mp)||mp<0)return res.status(400).json({error:"Horoscope prices must be zero or a positive number."});
  // Do not zero-out prices while Admin is OFF; the OFF 0/1 access policy
  // depends on this value surviving the Admin save and public config API.
  const data={advancedAnalysisEnabled:ae,advancedAnalysisPrice:ap,marriageMatchingEnabled:me,marriageMatchingPrice:mp,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid};
  await db.collection("smv_settings").doc("horoscopePayment").set(data,{merge:true});return res.json({success:true,settings:data});
});
app.post("/horoscope-payment/create-order",async(req,res)=>{
   if(!razorpayRuntime.configured)return res.status(503).json({error:'Razorpay is not configured on this Render service.',code:'RAZORPAY_NOT_CONFIGURED'});
  const user=await requireUser(req,res);if(!user)return;if(!(await requireCustomerOnly(user,res)))return;
  const feature=String(req.body?.feature||""),reportKey=cleanReportKey(req.body?.reportKey);if(!HOROSCOPE_FEATURES.has(feature)||!reportKey)return res.status(400).json({error:"Invalid Horoscope payment request."});
  const cfg=await getHoroscopePaymentSettings(),f=horoscopeFeaturePrice(cfg,feature);
  if(!f.enabled||!Number.isFinite(f.price)||Number(f.price)<1)return res.status(409).json({error:"Payment is OFF for this feature. Customer Login unlocks the full report free."});
  const eid=horoscopeEntitlementId(user.uid,feature,reportKey),eref=db.collection("smv_horoscope_entitlements").doc(eid),es=await eref.get();
  if(es.exists&&es.data()?.paymentStatus==="paid")return res.json({success:true,entitled:true,feature,reportKey});
  const amount=Math.round(f.price*100),order=await requireRazorpay().orders.create({amount,currency:"INR",receipt:`SMV_H_${feature==='advanced_analysis'?'A':'M'}_${Date.now()}`,notes:{uid:user.uid,feature,reportKey}});
  await eref.set({uid:user.uid,feature,reportKey,price:f.price,amount,currency:"INR",razorpayOrderId:order.id,paymentStatus:"created",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return res.json({success:true,entitled:false,feature,reportKey,orderId:order.id,keyId:RAZORPAY_KEY_ID,amount:order.amount,currency:order.currency,price:f.price});
});
app.post("/horoscope-payment/verify",async(req,res)=>{
   if(!razorpayRuntime.configured)return res.status(503).json({error:'Razorpay is not configured on this Render service.',code:'RAZORPAY_NOT_CONFIGURED'});
  const user=await requireUser(req,res);if(!user)return;if(!(await requireCustomerOnly(user,res)))return;
  const feature=String(req.body?.feature||""),reportKey=cleanReportKey(req.body?.reportKey),orderId=String(req.body?.razorpay_order_id||""),paymentId=String(req.body?.razorpay_payment_id||""),signature=String(req.body?.razorpay_signature||"");
  if(!HOROSCOPE_FEATURES.has(feature)||!reportKey||!orderId||!paymentId||!signature)return res.status(400).json({error:"Incomplete payment verification data."});
  const expected=crypto.createHmac("sha256",RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");if(!signatureEqual(expected,signature))return res.status(400).json({error:"Razorpay signature verification failed."});
  const eid=horoscopeEntitlementId(user.uid,feature,reportKey),eref=db.collection("smv_horoscope_entitlements").doc(eid),es=await eref.get();if(!es.exists)return res.status(404).json({error:"Payment order record was not found."});const stored=es.data()||{};
  if(stored.razorpayOrderId!==orderId)return res.status(409).json({error:"Razorpay order mismatch."});
  const payment=await requireRazorpay().payments.fetch(paymentId);if(String(payment.order_id||"")!==orderId||Number(payment.amount)!==Number(stored.amount)||String(payment.currency||"")!==String(stored.currency||"INR"))return res.status(409).json({error:"Razorpay payment details do not match this report."});
  if(!["captured","authorized"].includes(String(payment.status||"")))return res.status(409).json({error:"Razorpay payment is not successful yet."});
  await eref.set({paymentStatus:"paid",razorpayPaymentId:paymentId,razorpaySignature:signature,paidAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return res.json({success:true,verified:true,entitled:true,feature,reportKey});
});


// V249 — deterministic online prediction synthesis. No AI/LLM/model is called.
function smvPredictionRoute(kind){
  return (req,res)=>{
    try{
      const evidence=req.body?.evidence;
      if(!evidence||typeof evidence!=="object")return res.status(400).json({error:"Prediction evidence is required."});
      const result=PredictionSynthesis.synthesize(kind,evidence);
      res.set("Cache-Control","no-store");
      return res.json(result);
    }catch(e){
      console.error(`[Prediction ${kind}]`,e?.stack||e);
      return res.status(400).json({error:e?.message||"Prediction synthesis failed.",nonAI:true});
    }
  };
}
app.post("/api/prediction/horoscope",smvPredictionRoute("horoscope"));
app.post("/api/prediction/matching",smvPredictionRoute("matching"));

// GeoNames place search + selected-place timezoneId (username kept server-side).
registerGeoNamesRoutes(app);

// Wallet routes must be registered before the final 404. All balance/ledger writes use Admin SDK transactions.
const walletService = registerWalletRoutes({
  app, db:walletDomainDb(), profileDb:db, FieldValue, crypto, razorpay,
  razorpayKeyId: RAZORPAY_KEY_ID, razorpayKeySecret: RAZORPAY_KEY_SECRET,
  adminUid: ADMIN_UID, requireUser, isAdminUser
});

// Admin-only, read-only Wallet ledger view. The result is explicitly a recent
// sample, not a complete reconciliation report; no account mutation is exposed.
app.get("/admin/wallet/transactions", async (req,res)=>{
  const user=await requireUser(req,res);
  if(!user)return;
  try{
    if(!(await isAdminUser(user)))return res.status(403).json({success:false,error:"Admin access required."});
    const rawLimit=Number(req.query?.limit||50);
    const limit=Number.isFinite(rawLimit)?Math.max(1,Math.min(100,Math.floor(rawLimit))):50;
    const ownerUid=String(req.query?.ownerUid||"").trim().slice(0,160);
    const transactionCollection=walletDomainDb().collection("smv_wallet_transactions");
    let snap;
    try{
      let query=transactionCollection;
      if(ownerUid)query=query.where("ownerUid","==",ownerUid);
      snap=await query.orderBy("createdAt","desc").limit(limit).get();
    }catch(error){
      const code=String(error?.code||"").toLowerCase();
      const missingCompositeIndex=!!ownerUid&&(code==="9"||code==="failed-precondition"||/requires an index|create_composite/i.test(String(error?.message||"")));
      if(!missingCompositeIndex)throw error;
      const fallbackLimit=Math.min(2000,Math.max(limit,limit*20));
      snap=await transactionCollection.where("ownerUid","==",ownerUid).limit(fallbackLimit).get();
      const millis=value=>{
        if(value&&typeof value.toMillis==="function")return value.toMillis();
        if(value&&Number.isFinite(Number(value.seconds??value._seconds)))return Number(value.seconds??value._seconds)*1000;
        const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0;
      };
      snap={docs:snap.docs.slice().sort((a,b)=>millis(b.data()?.createdAt)-millis(a.data()?.createdAt)).slice(0,limit)};
    }
    const transactions=snap.docs.map(docSnap=>{
      const t=docSnap.data()||{};
      let createdAt=null;
      try{if(t.createdAt?.toDate)createdAt=t.createdAt.toDate().toISOString();else if(t.createdAt instanceof Date)createdAt=t.createdAt.toISOString();else if(typeof t.createdAt==="string")createdAt=new Date(t.createdAt).toISOString();}catch(_){}
      return {
        id:docSnap.id,ownerUid:String(t.ownerUid||""),ownerRole:String(t.ownerRole||""),
        type:String(t.type||"transaction"),direction:String(t.direction||""),
        amountPaise:Number.isSafeInteger(Number(t.amountPaise))?Number(t.amountPaise):0,
        balanceAfterPaise:Number.isSafeInteger(Number(t.balanceAfterPaise))?Number(t.balanceAfterPaise):null,
        reservedBalanceAfterPaise:Number.isSafeInteger(Number(t.reservedBalanceAfterPaise))?Number(t.reservedBalanceAfterPaise):null,
        status:String(t.status||""),source:String(t.source||""),
        referenceType:String(t.referenceType||""),referenceId:String(t.referenceId||""),
        idempotencyKey:String(t.idempotencyKey||""),createdAt
      };
    });
    const pageTotals=transactions.reduce((out,t)=>{
      out.transactionCount++;
      out[t.direction==="credit"?"creditPaise":t.direction==="debit"?"debitPaise":"otherPaise"]+=t.amountPaise;
      out.byType[t.type]=(out.byType[t.type]||0)+1;
      return out;
    },{transactionCount:0,creditPaise:0,debitPaise:0,otherPaise:0,byType:{}});
    let wallet=null;
    if(ownerUid){
      const ws=await walletDomainDb().collection("smv_wallets").doc(ownerUid).get();
      if(ws.exists){
        const w=ws.data()||{};
        wallet={ownerUid,ownerRole:String(w.ownerRole||""),availableBalancePaise:Number(w.availableBalancePaise||0),reservedBalancePaise:Number(w.reservedBalancePaise||0),updatedAt:w.updatedAt?.toDate?w.updatedAt.toDate().toISOString():null};
      }
    }
    res.set("Cache-Control","no-store");
    return res.json({success:true,sampled:true,limit,ownerUid:ownerUid||null,transactions,pageTotals,wallet});
  }catch(e){
    console.error("Admin Wallet ledger read failed:",e?.stack||e);
    return res.status(500).json({success:false,error:"Unable to load Wallet transaction audit."});
  }
});

// Admin-managed Wallet recharge bonus-minute Offers.
// These records are isolated from any legacy cash-discount offers still in Firestore.
// A bonus is selected and credited only inside the captured-recharge Wallet transaction.
function walletOfferText(value, maxLength = 120) {
  return String(value ?? '').trim().slice(0, maxLength);
}
function walletOfferWholeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : fallback;
}
function walletOfferDate(value, fieldName) {
  if (value == null || String(value).trim() === '') return null;
  if (offerDateMilliseconds(value) === null) throw new Error(fieldName + ' must be a valid date and time (India time).');
  return String(value).trim();
}
function walletOfferView(docSnap) {
  const offer = docSnap.data() || {};
  return {
    id: docSnap.id,
    offerType: WALLET_RECHARGE_OFFER_TYPE,
    name: walletOfferText(offer.name),
    bannerTheme: WALLET_OFFER_THEMES.includes(offer.bannerTheme) ? offer.bannerTheme : 'auto',
    enabled: offer.enabled === true,
    minimumRechargeAmountPaise: Number.isSafeInteger(Number(offer.minimumRechargeAmountPaise)) ? Number(offer.minimumRechargeAmountPaise) : 0,
    bonusMinutes: walletOfferWholeNumber(offer.bonusMinutes, 0),
    perCustomerLimit: walletOfferWholeNumber(offer.perCustomerLimit, 1),
    totalUsageLimit: walletOfferWholeNumber(offer.totalUsageLimit, 0),
    priority: walletOfferWholeNumber(offer.priority, 0),
    usedCount: walletOfferWholeNumber(offer.usedCount, 0),
    successfulRedemptions: walletOfferWholeNumber(offer.successfulRedemptions, 0),
    totalBonusMinutesAwarded: walletOfferWholeNumber(offer.totalBonusMinutesAwarded, 0),
    startAt: offer.startAt || null,
    endAt: offer.endAt || null,
    createdAt: offer.createdAt || null,
    updatedAt: offer.updatedAt || null
  };
}
// Public, display-only list for the Home-page Wallet Offer banner.
// Award eligibility is still checked again inside the captured-recharge transaction.
app.get('/wallet/recharge-offers', async (req, res) => {
  try {
    const snap = await walletDomainDb().collection('smv_offers')
      .where('offerType', '==', WALLET_RECHARGE_OFFER_TYPE).limit(100).get();
    const nowMs = Date.now();
    const offers = snap.docs.map(docSnap => {
      const offer = docSnap.data() || {};
      const minimum = Number(offer.minimumRechargeAmountPaise ?? 0);
      const bonus = Number(offer.bonusMinutes);
      const used = Number(offer.usedCount ?? 0);
      const totalLimit = Number(offer.totalUsageLimit ?? 0);
      const perCustomerLimit = Number(offer.perCustomerLimit ?? 1);
      if (offer.enabled !== true ||
          !Number.isSafeInteger(minimum) || minimum < 0 ||
          !Number.isSafeInteger(bonus) || bonus < 1 || bonus > 1440 ||
          !Number.isSafeInteger(used) || used < 0 ||
          !Number.isSafeInteger(totalLimit) || totalLimit < 0 ||
          !Number.isSafeInteger(perCustomerLimit) || perCustomerLimit < 0 ||
          (totalLimit > 0 && used >= totalLimit)) return null;
      if (offer.startAt) {
        const start = offerDateMilliseconds(offer.startAt);
        if (start === null || nowMs < start) return null;
      }
      if (offer.endAt) {
        const end = offerDateMilliseconds(offer.endAt);
        if (end === null || nowMs >= end) return null;
      }
      return {
        id: docSnap.id,
        name: walletOfferText(offer.name),
        bannerTheme: WALLET_OFFER_THEMES.includes(offer.bannerTheme) ? offer.bannerTheme : 'auto',
        minimumRechargeAmountPaise: minimum,
        bonusMinutes: bonus,
        perCustomerLimit,
        startAt: offer.startAt || null,
        endAt: offer.endAt || null,
        priority: walletOfferWholeNumber(offer.priority, 0)
      };
    }).filter(Boolean).sort((a, b) =>
      b.priority - a.priority || b.bonusMinutes - a.bonusMinutes || a.name.localeCompare(b.name)
    );
    return res.set('Cache-Control', 'no-store').json({ success: true, offers });
  } catch (error) {
    console.error('Public Wallet recharge offers read failed:', error?.stack || error);
    return res.status(500).json({ success: false, error: 'Unable to load active Wallet offers.' });
  }
});

app.get('/admin/offers', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ success: false, error: 'Admin access denied.' });
  try {
    const snap = await walletDomainDb().collection('smv_offers')
      .where('offerType', '==', WALLET_RECHARGE_OFFER_TYPE).limit(100).get();
    const offers = snap.docs.map(walletOfferView).sort((a, b) => b.priority - a.priority || b.bonusMinutes - a.bonusMinutes || a.name.localeCompare(b.name));
    return res.set('Cache-Control', 'no-store').json({ success: true, offers });
  } catch (error) {
    console.error('Admin Wallet Offers read failed:', error?.stack || error);
    return res.status(500).json({ success: false, error: 'Unable to load Wallet recharge offers.' });
  }
});
app.post('/admin/offers/save', express.json({ limit: '20kb' }), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ success: false, error: 'Admin access denied.' });
  try {
    const body = req.body || {};
    const requestedId = walletOfferText(body.id, 100);
    if (requestedId && !/^[A-Za-z0-9_-]+$/.test(requestedId)) {
      return res.status(400).json({ success: false, error: 'Invalid Offer ID.' });
    }
    const offerRef = requestedId
      ? walletDomainDb().collection('smv_offers').doc(requestedId)
      : walletDomainDb().collection('smv_offers').doc();
    const existingSnap = requestedId ? await offerRef.get() : null;
    if (requestedId && !existingSnap.exists) return res.status(404).json({ success: false, error: 'Wallet Offer was not found.' });
    const existing = existingSnap?.exists ? (existingSnap.data() || {}) : {};
    if (existingSnap?.exists && existing.offerType !== WALLET_RECHARGE_OFFER_TYPE) {
      return res.status(409).json({ success: false, error: 'This Offer belongs to a different Offer type and cannot be overwritten.' });
    }

    const name = walletOfferText(body.name, 120);
    const theme = String(body.bannerTheme || 'auto');
    const minimumRechargeAmountPaise = parseRupeesToPaise(body.minimumRechargeAmount ?? '0', { allowZero: true });
    const bonusMinutes = Number(body.bonusMinutes);
    const perCustomerLimit = Number(body.perCustomerLimit ?? 1);
    const totalUsageLimit = Number(body.totalUsageLimit ?? 0);
    const priority = Number(body.priority ?? 0);
    const startAt = walletOfferDate(body.startAt, 'Start Date');
    const endAt = walletOfferDate(body.endAt, 'End Date');
    if (!name) return res.status(400).json({ success: false, error: 'Offer Name is required.' });
    if (!WALLET_OFFER_THEMES.includes(theme) || theme === 'welcome') return res.status(400).json({ success: false, error: 'Choose an available festival Offer theme.' });
    if (minimumRechargeAmountPaise === null || minimumRechargeAmountPaise < 0) {
      return res.status(400).json({ success: false, error: 'Minimum recharge must be ₹0 or a positive amount with up to two decimal places.' });
    }
    if (!Number.isSafeInteger(bonusMinutes) || bonusMinutes < 1 || bonusMinutes > 1440) {
      return res.status(400).json({ success: false, error: 'Free minutes must be a whole number from 1 to 1,440.' });
    }
    if (!Number.isSafeInteger(perCustomerLimit) || perCustomerLimit < 0 || perCustomerLimit > 10000) {
      return res.status(400).json({ success: false, error: 'Per-customer limit must be 0 (unlimited) or a whole number up to 10,000.' });
    }
    if (!Number.isSafeInteger(totalUsageLimit) || totalUsageLimit < 0 || totalUsageLimit > 1000000) {
      return res.status(400).json({ success: false, error: 'Total usage limit must be 0 (unlimited) or a whole number up to 1,000,000.' });
    }
    if (!Number.isSafeInteger(priority) || priority < -1000 || priority > 1000) {
      return res.status(400).json({ success: false, error: 'Offer priority must be a whole number from -1,000 to 1,000.' });
    }
    if (startAt && endAt && offerDateMilliseconds(startAt) >= offerDateMilliseconds(endAt)) {
      return res.status(400).json({ success: false, error: 'End Date must be later than Start Date.' });
    }

    const now = FieldValue.serverTimestamp();
    const data = {
      offerType: WALLET_RECHARGE_OFFER_TYPE,
      name, bannerTheme: theme, enabled: body.enabled === true,
      minimumRechargeAmountPaise, bonusMinutes, perCustomerLimit, totalUsageLimit, priority,
      startAt, endAt,
      // Preserve redemption statistics already stored on the Offer. Do not copy stale
      // counters from a non-transactional read while successful recharges update them.
      createdAt: existing.createdAt || now, updatedAt: now, updatedBy: user.uid
    };
    await offerRef.set(data, { merge: true });
    return res.set('Cache-Control', 'no-store').json({ success: true, id: offerRef.id, offer: { id: offerRef.id, ...data } });
  } catch (error) {
    if (Number(error?.httpStatus)) return res.status(error.httpStatus).json({ success: false, error: error.message });
    console.error('Admin Wallet Offer save failed:', error?.stack || error);
    return res.status(400).json({ success: false, error: error?.message || 'Unable to save Wallet Offer.' });
  }
});
app.post('/admin/offers/delete', express.json({ limit: '10kb' }), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ success: false, error: 'Admin access denied.' });
  const id = walletOfferText(req.body?.id, 100);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return res.status(400).json({ success: false, error: 'Invalid Offer ID.' });
  try {
    const ref = walletDomainDb().collection('smv_offers').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.offerType !== WALLET_RECHARGE_OFFER_TYPE) {
      return res.status(404).json({ success: false, error: 'Wallet Offer was not found.' });
    }
    if (walletOfferWholeNumber(snap.data()?.usedCount, 0) > 0) {
      return res.status(409).json({ success: false, error: 'This Offer has redemption history. Turn it OFF instead of deleting it.' });
    }
    await ref.delete();
    return res.json({ success: true, id });
  } catch (error) {
    console.error('Admin Wallet Offer delete failed:', error?.stack || error);
    return res.status(500).json({ success: false, error: 'Unable to delete Wallet Offer.' });
  }
});

// The Web Push VAPID public key is public by design. Keep it in Render Environment,
// not in source, and expose it only to let the authenticated Astrologer browser register FCM.
app.get('/public/push-config', (_req, res) => {
  const vapidPublicKey = String(process.env.FCM_VAPID_PUBLIC_KEY || '').trim();
  return res.set('Cache-Control', 'no-store').json({ success: true, vapidPublicKey });
});

// Live Call / Chat session, signaling, booking queue and server-side Wallet settlement.
// Register only on the active service; the staging deployment is routed by its own config.
const liveSessionSettlementDb=walletDomainDb();
const liveSessionSettlementProject=multiProjectFirestore.walletDomainCutoverComplete===true
  ? String(multiProjectFirestore.projectIds.walletDomain||'Project 5')
  : String(multiProjectFirestore.projectIds.primary||process.env.FIREBASE_PROJECT_ID||'Project 1 primary');
console.info('[Live Session] Settlement Firestore route:', JSON.stringify({
  projectId:liveSessionSettlementProject,
  walletDomainEnabled:multiProjectFirestore.walletDomainEnabled===true,
  walletDomainCutoverComplete:multiProjectFirestore.walletDomainCutoverComplete===true
}));
const liveSessionService=registerLiveSessionRoutes({app,db:liveSessionSettlementDb,profileDb:db,FieldValue,crypto,requireUser,isAdminUser,admin,multiProjectFirestore});

// Final 404 must remain AFTER every functional route, including Wallet and Horoscope payment routes.
app.use((req, res) => {
  console.warn("Unhandled backend route:", req.method, req.originalUrl);
  if (req.path.startsWith("/api/") || req.path.includes("withdrawal")) {
    return res.status(404).json({ error: "Backend endpoint not found.", path: req.originalUrl });
  }
  return res.status(404).send("Not Found");
});



app.listen(PORT, "0.0.0.0", () => console.log(`SMV ASTRO Razorpay backend running on port ${PORT}`));
