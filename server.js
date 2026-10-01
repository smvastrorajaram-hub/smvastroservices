const {createRefundService,bankReferences}=require('./refund-service');
const express = require("express");
let SwissVedic = null;
try { SwissVedic = require('./swiss_vedic'); } catch (e) { console.error('Swiss Ephemeris module unavailable:', e.message); }
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { renderHtmlPdf } = require("./html-pdf-renderer");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;
const Razorpay = require("razorpay");
let advancedAstrology = null;
let phase4Dasa = null;
try { advancedAstrology = require('./astro_advanced').advanced; } catch (e) { console.error('Advanced astrology module unavailable:', e.message); }
try { phase4Dasa = require('./dasa_engine').phase4Dasa; } catch (e) { console.error('Phase 4 Dasa engine unavailable:', e.message); }
let TransitPanchang = null;
try { TransitPanchang = require('./transit_panchang'); } catch (e) { console.error('Transit/Panchang module unavailable:', e.message); }
const admin = require("firebase-admin");
let Astronomy = null;
try { Astronomy = require("astronomy-engine"); } catch (_) {
  console.warn("astronomy-engine is not installed. Install dependencies before using /api/horoscope/calculate.");
}


const app = express();
app.use((req,res,next)=>{
 const started=process.hrtime.bigint();const json=res.json.bind(res);
 res.json=body=>{if(!res.headersSent)res.set('Server-Timing','app;dur='+Number(process.hrtime.bigint()-started)/1e6);return json(body);};next();
});
const PORT = process.env.PORT || 10000;
const ADMIN_UID = String(process.env.ADMIN_UID || "TwjeEIFS3Zcf1SxboLZoujm91Ky2").trim();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
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
// Horoscope/Matching PDF storage is isolated from the existing Blog Cloudinary setup.
// Signed backend uploads only; API secret is never exposed to the browser.
const CLOUDINARY_REPORT_CLOUD_NAME = String(process.env.CLOUDINARY_REPORT_CLOUD_NAME || "nc1zlbkg").trim();
const CLOUDINARY_REPORT_API_KEY = String(process.env.CLOUDINARY_REPORT_API_KEY || "").trim();
const CLOUDINARY_REPORT_API_SECRET = String(process.env.CLOUDINARY_REPORT_API_SECRET || "").trim();
const CLOUDINARY_REPORT_UPLOAD_PRESET = String(process.env.CLOUDINARY_REPORT_UPLOAD_PRESET || "smvastro_reports_signed").trim();
if (CLOUDINARY_REPORT_CLOUD_NAME && CLOUDINARY_REPORT_API_KEY && CLOUDINARY_REPORT_API_SECRET) {
  cloudinary.config({ cloud_name:CLOUDINARY_REPORT_CLOUD_NAME, api_key:CLOUDINARY_REPORT_API_KEY, api_secret:CLOUDINARY_REPORT_API_SECRET, secure:true });
}
function reportCloudReady(){ return Boolean(CLOUDINARY_REPORT_CLOUD_NAME && CLOUDINARY_REPORT_API_KEY && CLOUDINARY_REPORT_API_SECRET); }
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = "gemini-3.7-flash";
const AI_RATE_LIMIT_MAX = Number(process.env.AI_RATE_LIMIT_MAX || 10);
const AI_RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const aiRateBuckets = new Map();

const PHONE_VERIFICATION_MODE = String(process.env.PHONE_VERIFICATION_MODE || "email_unique").trim().toLowerCase();
const WHATSAPP_OTP_PROVIDER = String(process.env.WHATSAPP_OTP_PROVIDER || "").trim().toLowerCase();

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

async function resolveCustomerEmail(record = {}) {
  const stored = String(record.customerEmail || record.email || "").trim();
  if (stored) return stored;
  const uid = String(record.customerId || record.customerUid || record.firebaseUid || "").trim();
  return uid ? String(await getUserEmail(uid) || "").trim() : "";
}

async function resolveAstrologerEmail(record = {}) {
  const stored = String(record.astrologerEmail || "").trim();
  if (stored) return stored;
  const uid = String(record.astrologerId || "").trim();
  return uid ? String(await getUserEmail(uid) || "").trim() : "";
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

async function addAdminEventNotification(type, title, message, extra = {}) {
  try {
    await db.collection("smv_notifications").add({userId:"admin",audience:"admin",type,title,message,...extra,createdAt:FieldValue.serverTimestamp(),read:false});
  } catch (e) { console.error("Admin notification write failed:", type, e?.message || e); }
}


const PUBLIC_SITE_URL = String(process.env.PUBLIC_SITE_URL || "https://smvastroservices.in").trim().replace(/\/$/, "");

function cleanAstrologerAnswer(raw) {
  const senderAddress = String(RESEND_FROM || "").match(/<([^>]+)>/)?.[1] || String(RESEND_FROM || "");
  const senderEsc = senderAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const identityPatterns = [
    /^\s*SMV\s+ASTRO\s*<\s*noreply@smvastroservices\.in\s*>\s*$/gim,
    /^\s*noreply@smvastroservices\.in\s*$/gim
  ];
  if (senderEsc) identityPatterns.push(new RegExp(`^\\s*(?:SMV\\s+ASTRO\\s*<\\s*)?${senderEsc}(?:\\s*>)?\\s*$`, "gim"));
  let answer = String(raw || "").replace(/\r\n/g, "\n");
  for (const re of identityPatterns) answer = answer.replace(re, "");
  return answer.replace(/\n{3,}/g, "\n\n").trim();
}

function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function answerReadyEmail({customerName, astrologerName, question, questionId, answer}) {
  const cleanAnswer = cleanAstrologerAnswer(answer);
  const subject = "Your Astrology Consultation Answer is Ready | SMV ASTRO";
  const reviewUrl = `${PUBLIC_SITE_URL}/#dashboard`;
  const text = [
    `Dear ${customerName},`, "",
    `${astrologerName || "Your SMV ASTRO astrologer"} has answered your astrology consultation.`,
    "Your answer is now available for review.", "",
    `Question: ${question || ""}`, `Question ID: ${questionId}`, "",
    "Astrologer’s Answer:", cleanAnswer, "",
    "Write a Review / Rate your consultation:", reviewUrl,
    "Sign in to your Customer Dashboard and select Rate & Review for this consultation.", "",
    "Thank you for choosing SMV ASTRO.", "",
    "Warm regards,", "SMV ASTRO", "Sri Madurai Veerayah Astro Services"
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#202124"><div style="max-width:640px;margin:auto;padding:24px"><h2 style="margin:0 0 18px">Your Astrology Consultation Answer is Ready</h2><p>Dear ${escapeEmailHtml(customerName)},</p><p>${escapeEmailHtml(astrologerName || "Your SMV ASTRO astrologer")} has answered your astrology consultation. Your answer is now available for review.</p><p><b>Question:</b> ${escapeEmailHtml(question || "")}<br><b>Question ID:</b> ${escapeEmailHtml(questionId)}</p><div style="padding:16px;border:1px solid #e0e0e0;border-radius:10px;white-space:pre-wrap"><b>Astrologer’s Answer:</b><br><br>${escapeEmailHtml(cleanAnswer)}</div><p style="margin-top:24px">We value your feedback. You can rate your consultation and write a review from your Customer Dashboard.</p><p><a href="${escapeEmailHtml(reviewUrl)}" style="display:inline-block;padding:12px 20px;background:#a40000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Write a Review</a></p><p style="font-size:13px;color:#5f6368">For your security, sign in to the same SMV ASTRO customer account used for this consultation. The existing one-review-per-consultation rule remains in effect.</p><p>Thank you for choosing SMV ASTRO.</p><p>Warm regards,<br><b>SMV ASTRO</b><br>Sri Madurai Veerayah Astro Services</p></div></body></html>`;
  return {subject, text, html, cleanAnswer};
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
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render.");
}
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(x => x.trim()).filter(Boolean);
// Parse JSON request bodies for normal API routes. Keep Razorpay webhook raw so its
// HMAC signature can still be verified against the original request bytes.
app.use((req, res, next) => {
  if (req.path === "/razorpay/webhook") return next();
  return express.json({ limit: "15mb" })(req, res, next);
});

app.use((req, res, next) => {
  // The Blogger frontend uses Firebase ID-token Authorization headers, not
  // cookie credentials, so wildcard CORS is safe for this API and prevents
  // Blogger/custom-domain deployments from failing with a browser
  // "Failed to fetch" before the request reaches Express.
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// V48 DASHBOARD READ HARDENING
// Admin realtime uses one tiny version document instead of listening to entire
// collections. Bump it only after a successful mutating API response and do the
// write after the response has finished so it never delays Razorpay/payment or
// any other request's critical path.
const DASHBOARD_SIGNAL_PATHS=new Set([
  '/register-customer-profile','/register-astrologer-profile','/astrologer/edit-answer','/submit-answer',
  '/customer/submit-review','/admin/appointment-status','/admin/approve-question','/admin/reallocate-question','/admin/reject-question','/admin/retry-refund','/admin/sync-refund',
  '/admin/edit-question','/admin/takeover-answer','/astrologer/change-payout','/admin/payout-change-status',
  '/admin/set-open-workflow','/customer/mark-answer-viewed','/admin/astrologer-quiz/load-defaults',
  '/admin/astrologer-quiz/questions','/admin/astrologer-quiz/questions/delete','/admin/astrologer-auto-approval/settings',
  '/webhooks/google-form/astrologer-qualification','/admin/private-consultation/set-commission',
  '/admin/private-consultation/set-word-count','/admin/private-consultation/set-workflow',
  '/admin/private-consultation/approve-question','/admin/private-consultation/reject-question',
  '/admin/private-consultation/retry-refund','/admin/private-consultation/sync-refund',
  '/astrologer/private-consultation/submit-answer','/admin/private-consultation/approve-answer',
  '/admin/private-consultation/reject-answer','/admin/offers/save','/admin/offers/delete',
  '/private-consultation/recover-payment','/private-consultation/verify-payment','/admin/credit-commission',
  '/admin/reject-answer','/admin/approve-answer','/customer/private-consultation/mark-viewed','/verify-payment',
  '/astrologer/withdrawal-request','/admin/withdrawal-mark-paid','/razorpay/webhook'
]);
function dashboardSignalCategory(path=''){
  const p=String(path||'');
  if(p.startsWith('/admin/offers/'))return 'offers';
  if(p.includes('/private-consultation/'))return 'private_consultations';
  if(p.includes('/withdrawal')||p.includes('/payout'))return 'withdrawals_payouts';
  if(p.includes('/review'))return 'reviews';
  if(p.includes('/astrologer-quiz/')||p.includes('/astrologer-auto-approval/'))return 'astrologer_settings';
  if(p.includes('/set-open-workflow')||p.includes('/set-commission')||p.includes('/set-word-count')||p.includes('/set-workflow'))return 'settings';
  if(p.includes('/approve-question')||p.includes('/reallocate-question')||p.includes('/reject-question')||p.includes('/retry-refund')||p.includes('/sync-refund')||p.includes('/edit-question')||p.includes('/takeover-answer')||p.includes('/approve-answer')||p.includes('/reject-answer')||p.includes('/submit-answer')||p.includes('/mark-answer-viewed'))return 'questions';
  if(p.includes('/register-astrologer-profile')||p.includes('/google-form/astrologer-qualification'))return 'astrologers';
  if(p.includes('/verify-payment')||p.includes('/recover-payment')||p.includes('/razorpay/webhook')||p.includes('/credit-commission'))return 'financial';
  return 'unknown';
}

app.use((req,res,next)=>{
  if(DASHBOARD_SIGNAL_PATHS.has(req.path)){
    res.once('finish',()=>{
      if(res.statusCode>=200 && res.statusCode<300){
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

async function isAdminUser(user) {
  if (!user) return false;
  if (user.uid === ADMIN_UID) return true;
  if (user.admin === true || user.role === "admin") return true;
  try {
    const snap = await db.collection("smv_users").doc(user.uid).get();
    return snap.exists && String(snap.data()?.role || "").toLowerCase() === "admin";
  } catch (e) {
    console.error("Admin role lookup failed:", e?.message || e);
    return false;
  }
}

function signatureEqual(expected, actual) {
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(String(actual || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

async function nextCustomerId() {
  // Customer IDs are date-based in India (IST): SMV-CUS-DDMMYYYY-01, -02, ...
  const dateKey = indiaDateKey();
  const ref = db.collection("smv_counters").doc(`customer_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `SMV-CUS-${dateKey}-${String(next).padStart(2, "0")}`;
  });
}

app.post("/lookup-customer-login", async (req, res) => {
  try {
    const customerId = String(req.body?.customerId || "").trim().toUpperCase();
    if (!/^SMV-CUS-\d{8}-\d{2,}$/.test(customerId)) {
      return res.status(400).json({ error: "Enter a valid Customer ID, for example SMV-CUS-20082026-01." });
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

async function nextPublicId(prefix, dateKey) {
  const isCustomer = prefix === "CS";
  const kind = isCustomer ? "customer" : "astrologer";
  const ref = db.collection("smv_counters").doc(`${kind}_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const idPrefix = isCustomer ? "SMV-CUS" : "SMV-AST";
    return `${idPrefix}-${dateKey}-${String(next).padStart(2, "0")}`;
  });
}

app.post("/lookup-id-login", async (req, res) => {
  try {
    const publicId = String(req.body?.publicId || "").trim().toUpperCase();
    if (!/^SMV-(CUS|AST)-\d{8}-\d{2,}$/.test(publicId)) {
      return res.status(400).json({ error: "Enter a valid Customer or Astrologer ID." });
    }
    const snap = await db.collection("smv_users").where("publicId", "==", publicId).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "This ID was not found. Please check the ID and try again." });
    const data = snap.docs[0].data() || {};
    const expectedRole = publicId.startsWith("SMV-AST-") ? "astrologer" : "customer";
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
      return res.json({ ok: true, alreadyRegistered: true, publicId: existing.data().publicId });
    }
    const preflight = await findExistingPhoneOwners(phoneNorm, user.uid);
    if (preflight.taken) return phoneAlreadyRegisteredResponse(res, req.body?.language === "ta" ? "ta" : "en");
    const publicId = await nextCustomerId();
    await db.runTransaction(async tx => {
      await claimUniquePhoneInTransaction(tx, phoneNorm, user.uid, "customer");
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
    });
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
    const bankName=String(b.bankName||"").trim(), accountName=String(b.accountName||"").trim(), accountNumber=String(b.accountNumber||"").trim(), ifsc=String(b.ifsc||"").trim(), upi=String(b.upi||"").trim(), photoData=String(b.photoData||"");
    if(!name||!mobile||!specialization||!bio||!bankName||!accountName||!accountNumber||!ifsc||!photoData) return res.status(400).json({error:"Please complete all required astrologer registration details."});
    if(!Number.isFinite(experience)||experience<0) return res.status(400).json({error:"Invalid experience."});
    const phoneNorm = normalizeRegistrationPhone(mobile);
    if(!phoneNorm) return res.status(400).json({error:"Enter a valid mobile number."});
    const userRef=db.collection("smv_users").doc(user.uid), astroRef=db.collection("smv_astrologers").doc(user.uid), payoutRef=db.collection("smv_payouts").doc(user.uid);
    const existing=await userRef.get();
    const existingRole=existing.exists?String(existing.data()?.role||"").toLowerCase():"";
    if(existing.exists && existingRole && existingRole!=="astrologer") return res.status(409).json({error:"This Firebase account already belongs to a different SMV ASTRO role. Please use the correct account."});
    if(existing.exists && existingRole==="astrologer" && existing.data()?.publicId) return res.json({ok:true,alreadyRegistered:true,publicId:existing.data().publicId});
    const preflight = await findExistingPhoneOwners(phoneNorm, user.uid);
    if (preflight.taken) return phoneAlreadyRegisteredResponse(res, b.language === "ta" ? "ta" : "en");
    const dateKey=indiaDateKey(), publicId=await nextPublicId("AT",dateKey);
    const notificationRef=db.collection("smv_notifications").doc(user.uid+"_"+Date.now());
    await db.runTransaction(async tx => {
      await claimUniquePhoneInTransaction(tx, phoneNorm, user.uid, "astrologer");
      tx.set(userRef,{uid:user.uid,name,phone:phoneNorm.e164,mobile:phoneNorm.e164,phoneNormalized:phoneNorm.e164,email:user.email||"",publicId,role:"astrologer",status:"pending",emailVerificationRequired:true,phoneVerificationRequired:PHONE_VERIFICATION_MODE === "whatsapp",phoneVerified:false,verificationMethod:PHONE_VERIFICATION_MODE === "whatsapp" ? "whatsapp" : "email",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.set(astroRef,{uid:user.uid,name,publicId,specialization,expertise:specialization,experience,about:bio,bio,photoData,status:"pending",role:"astrologer",createdAt:FieldValue.serverTimestamp()},{merge:true});
      tx.set(payoutRef,{uid:user.uid,bankName,accountName,accountNumber,ifsc,upi,updatedAt:FieldValue.serverTimestamp(),status:"pending_admin_review"},{merge:true});
      tx.set(notificationRef,{userId:user.uid,type:"registration",title:"Registration submitted",message:"Your astrologer application is pending Admin approval.",createdAt:FieldValue.serverTimestamp(),read:false});
    });
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
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return res.status(500).json({ ok: false, error: "Razorpay credentials are missing in Render." });
    const mode = RAZORPAY_KEY_ID.startsWith("rzp_test_") ? "test" : (RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "live" : "unknown");
    if(mode!=='live')return res.status(503).json({ok:false,mode,error:'This deployed backend is using '+mode+' credentials. Live credentials are required.'});
    await razorpay.orders.all({ count: 1 });
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








async function getOpenWorkflowSettings() {
  try {
    const snap = await db.collection("smv_settings").doc("workflow").get();
    return { allowWithoutAdminApproval: snap.exists && snap.data()?.allowWithoutAdminApproval === true };
  } catch (e) {
    console.warn("Workflow settings read failed:", e?.message || e);
    return { allowWithoutAdminApproval: false };
  }
}

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

/**
 * Re-open an astrologer answer for editing/resubmission.
 *
 * This route intentionally uses the trusted Firebase Admin SDK so the browser
 * does not need direct Firestore write permission for workflow/status fields.
 * The same question is returned to the Astrologer Question Box; no new
 * question is created and the existing answer is preserved for editing.
 */
app.post("/astrologer/edit-answer", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const questionId = String(req.body?.questionId || "").trim();
  if (!questionId) {
    return res.status(400).json({ error: "Question ID is required." });
  }

  try {
    const questionRef = db.collection("smv_questions").doc(questionId);
    const snap = await questionRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Question not found." });
    }

    const q = snap.data() || {};
    if (String(q.astrologerId || "") !== String(user.uid)) {
      return res.status(403).json({ error: "This question is not assigned to you." });
    }

    const workflow = await getOpenWorkflowSettings();
    const bypassEditable = workflow.allowWithoutAdminApproval && String(q.status || "") === "answered" && q.adminApprovalBypassed === true && !q.customerAnswerViewedAt && q.commissionStatus!=="credited";
    // In normal Admin-approval mode, approved answers are final. In open mode,
    // the astrologer may reopen the answer only until the customer has viewed it.
    if ((String(q.status || "") === "answered" || String(q.astrologerAnswerStatus || "") === "approved") && !bypassEditable) {
      return res.status(409).json({ error: "This answer is final or has already been viewed by the customer." });
    }

    // Only submitted answers waiting for approval or requiring revision can
    // be reopened. A draft/unanswered question is already in the Question Box.
    const allowedStatuses = ["processing", "answer_draft", "admin_review", "revision_required"];
    const status = String(q.status || "");
    const hasAnswer = !!String(q.answer || "").trim();
    if (!hasAnswer || (!allowedStatuses.includes(status) && q.astrologerEditMode !== true && !bypassEditable)) {
      return res.status(409).json({ error: "This answer is not available for editing right now." });
    }

    await questionRef.update({
      // Keep the same question and same astrologer allocation.
      allocationStatus: "claimed_by_astrologer",
      astrologerEditMode: true,
      // admin_approved here means the QUESTION was approved/allocated, not
      // that the ANSWER was approved. /submit-answer moves it back to processing.
      status: "admin_approved",
      astrologerAnswerStatus: "draft",
      editReopenedAt: FieldValue.serverTimestamp(),
      editReopenedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp()
    });

    await writeAdminAudit("ASTROLOGER_ANSWER_REOPENED_FOR_EDIT", questionId, user.uid, {
      previousStatus: status,
      nextStatus: "admin_approved"
    });

    return res.json({ success: true, questionId, status: "admin_approved", astrologerEditMode: true });
  } catch (e) {
    console.error("Astrologer answer edit reopen failed:", e);
    return res.status(500).json({ error: e?.message || "Unable to open answer for editing." });
  }
});

/**
 * Server-side astrologer answer submission.
 *
 * The answer is written by the trusted backend first. Email notification is
 * then attempted from the server (never from the browser), and the result of
 * each recipient is persisted in the question document.
 */
app.post("/submit-answer", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const questionId = String(req.body?.questionId || "").trim();
  const answer = String(req.body?.answer || "").trim();

  try {
    if (!questionId || !answer) {
      return res.status(400).json({ error: "Question ID and answer are required." });
    }

    const questionRef = db.collection("smv_questions").doc(questionId);
    const snap = await questionRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Question not found." });

    const q = snap.data() || {};
    const workflow = await getOpenWorkflowSettings();
    // Backward-compatible Auto Allow resolution:
    // New records persist adminApprovalBypassed explicitly. Older paid/open questions may
    // predate that field; when the CURRENT workflow is Auto Allow ON, treat only an
    // explicit false as Admin-required. This lets legacy unanswered questions follow the
    // same release path without changing login/dashboard code.
    const bypassApproval = workflow.allowWithoutAdminApproval && q.adminApprovalBypassed !== false;
    if (String(q.astrologerId || "") !== String(user.uid)) {
      return res.status(403).json({ error: "This question is not assigned to you." });
    }

    // Astrologer may edit and resubmit the answer while it is still waiting
    // for Admin approval. Once Admin approves it (status = answered), editing
    // is no longer allowed.
    const editableStatuses = ["admin_approved", "revision_required", "processing", "admin_review"];
    if (bypassApproval && String(q.status||"")==="answered" && (q.customerAnswerViewedAt||q.commissionStatus==="credited")) return res.status(409).json({error:"The customer has already viewed this answer. It can no longer be edited."});
    if (!editableStatuses.includes(String(q.status || "")) && !(bypassApproval && String(q.status||"")==="answered")) {
      return res.status(409).json({ error: "This answer can no longer be edited." });
    }

    const minWords = Number(q.answerMinWords || 150);
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    if (wordCount < minWords) {
      return res.status(400).json({ error: `Please write at least ${minWords} words.` });
    }

    const commissionPercent = Number(q.commissionPercent || q.commissionRate || 20);
    const commissionAmount =
      Math.round(Number(q.amount || 0) * commissionPercent) / 100;

    // Save the answer before attempting email. This makes the submission
    // independent of browser notification calls and email-provider latency.
    await updateEditableAnswer(questionRef,"customerAnswerViewedAt",{
      answer,
      answerWordCount: wordCount,
      answerSubmittedAt: FieldValue.serverTimestamp(),
      astrologerAnswerStatus: "submitted",
      // Once resubmitted, remove edit mode so the same question is no longer
      // shown in both the Question Box and Answers section.
      astrologerEditMode: false,
      status: bypassApproval ? "answered" : "processing",
      astrologerAnswerStatus: bypassApproval ? "approved" : "submitted",
      answerAvailableAt: bypassApproval ? (q.answerAvailableAt||q.answerApprovedAt||FieldValue.serverTimestamp()) : FieldValue.delete(),
      answerApprovedAt: bypassApproval ? FieldValue.serverTimestamp() : FieldValue.delete(),
      adminAnswerApprovedAt: bypassApproval ? FieldValue.serverTimestamp() : FieldValue.delete(),
      customerAnswerViewedAt: bypassApproval ? FieldValue.delete() : (q.customerAnswerViewedAt || FieldValue.delete()),
      astrologerCommissionAmount: commissionAmount,
      commissionPercent,
      commissionRate: commissionPercent,
      commissionStatus: bypassApproval ? "pending_customer_view" : "pending_admin_approval",
      commissionCreditedAt: FieldValue.delete(),
      answerEmailStatus: {
        state: "pending",
        updatedAt: FieldValue.serverTimestamp()
      }
    });

    await writeAdminAudit("ASTROLOGER_ANSWER_SUBMITTED", questionId, user.uid, {
      wordCount, previousStatus: String(q.status || ""), nextStatus: bypassApproval ? "answered" : "processing", bypassApproval
    });

    // Customer email must follow the answer-release workflow exactly:
    // - Auto Allow ON: the answer is released now, so email the customer now.
    // - Auto Allow OFF: do not email the customer before Admin approval.
    //   /admin/approve-answer is the single release/email point for that path.
    const customerEmail = await resolveCustomerEmail(q);
    const customerName = String(q.customerName || q.birthName || "Customer");
    const astrologerEmail = String(await getUserEmail(q.astrologerId) || "").trim();
    const astrologerName = String(q.astrologerName || "Astrologer");
    const answerHash=crypto.createHash("sha256").update(cleanAstrologerAnswer(answer)).digest("hex").slice(0,16);

    // Every actual submission produces Admin + Astrologer event notifications once.
    // These are event-driven writes only: no listener/retry loop and no MutationObserver.
    await Promise.allSettled([
      addAdminEventNotification(
        bypassApproval ? "answer_auto_released" : "answer_waiting_approval",
        bypassApproval ? "Answer Auto Released" : "Answer Waiting for Approval",
        `${astrologerName} submitted an answer for ${customerName} (${questionId}).`,
        {questionId,customerId:q.customerId||null,astrologerId:q.astrologerId||null}
      ),
      db.collection("smv_notifications").add({
        userId:q.astrologerId,type:bypassApproval?"answer_auto_released":"answer_submitted",
        title:bypassApproval?"Answer submitted and released":"Answer submitted",
        message:bypassApproval?"Your answer was released to the customer.":"Your answer is waiting for Admin approval.",
        questionId,createdAt:FieldValue.serverTimestamp(),read:false
      }),
      sendEventEmailOnce({
        eventKey:`public:${questionId}:answer_submitted_admin:${answerHash}`,to:[ADMIN_EMAIL],
        subject:bypassApproval?"SMV ASTRO — Answer Submitted & Released":"SMV ASTRO — Answer Waiting for Approval",
        text:`${astrologerName} submitted an answer for ${customerName}.\n\nQuestion ID: ${questionId}\nStatus: ${bypassApproval?"Released automatically to customer":"Waiting for Admin approval"}`,
        context:{questionId,event:bypassApproval?"answer_auto_released":"answer_waiting_approval"}
      }),
      sendEventEmailOnce({
        eventKey:`public:${questionId}:answer_submitted_astrologer:${answerHash}`,to:[astrologerEmail],replyTo:ADMIN_EMAIL,
        subject:bypassApproval?"SMV ASTRO — Your Answer Was Released":"SMV ASTRO — Answer Submitted for Review",
        text:`Your answer for Question ID ${questionId} was submitted successfully. ${bypassApproval?"It has been released to the customer.":"It is waiting for Admin approval."}`,
        context:{questionId,event:"answer_submission_confirmation"}
      })
    ]);

    if (!bypassApproval) {
      await questionRef.set({
        answerEmailStatus: {
          state: "awaiting_admin_approval",
          updatedAt: FieldValue.serverTimestamp()
        }
      }, { merge: true });

      return res.json({ok:true,answerSaved:true,status:"processing"});
    }

    const emailContent = answerReadyEmail({customerName, astrologerName, question:q.question, questionId, answer});
    const {subject, text, html} = emailContent;

    const recipients = uniqueRecipients([customerEmail]);
    const emailResults = {};
    const emailStatusPatch = {
      state: "completed",
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!recipients.length) {
      const error = "No customer email address is configured.";
      console.error(`Resend delivery issue | Question ID: ${questionId} | Reason: ${error}`);
      emailStatusPatch.state = "failed";
      emailStatusPatch.error = error;
      emailStatusPatch.recipients = {};
    } else {
      for (const recipient of recipients) {
        const recipientKey = recipient.toLowerCase();
        const result = await sendEventEmailOnce({
          eventKey:`public:${questionId}:answer_ready:${answerHash}`,
          to: [recipient],
          replyTo: ADMIN_EMAIL || astrologerEmail || customerEmail,
          subject,
          text,
          html,
          context:{questionId,event:"answer_ready"}
        });

        if (result?.failed) {
          emailResults[recipientKey] = {
            status: "failed",
            error: String(result.error || "Unknown email error")
          };
          console.error(
            `Resend delivery issue | Question ID: ${questionId} | Recipient Email: ${recipient} | Reason: ${result.error || "Unknown email error"}`
          );
        } else {
          emailResults[recipientKey] = {
            status: "sent",
            messageId: result?.id || null
          };
          console.log(
            `ANSWER EMAIL SENT | Question ID: ${questionId} | Recipient Email: ${recipient}`
          );
        }
      }

      const failed = Object.values(emailResults).some(x => x.status === "failed");
      emailStatusPatch.state = failed
        ? (Object.values(emailResults).every(x => x.status === "failed") ? "failed" : "partial")
        : "sent";
      emailStatusPatch.recipients = emailResults;
    }

    await questionRef.set({ answerEmailStatus: emailStatusPatch }, { merge: true });

    // Email delivery is intentionally independent from the business workflow.
    // Never expose Resend/email delivery state to Customer or Astrologer UI.
    return res.json({
      ok: true,
      answerSaved: true,
      status: bypassApproval ? "answered" : "processing"
    });
  } catch (e) {
    console.error(
      `Answer submission failed | Question ID: ${questionId || "N/A"} | Reason:`,
      e?.message || e
    );
    return res.status(500).json({
      error: e?.message || "Unable to submit answer."
    });
  }
});

app.post("/question-notify", express.json({limit:"20kb"}), async(req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  try{
    if(!ADMIN_EMAIL || (!RESEND_API_KEY && !smtpTransport)) return res.status(503).json({error:"Email service is not configured in Render. Set ADMIN_EMAIL, RESEND_API_KEY and RESEND_FROM."});
    const questionId=String(req.body?.questionId||"").trim();
    const event=String(req.body?.event||"").trim();
    const reason=String(req.body?.reason||"").trim();
    const allowed=["payment_verified","question_approved","question_rejected","answer_submitted","answer_approved","answer_rejected"];
    if(!questionId||!allowed.includes(event)) return res.status(400).json({error:"Invalid question notification request."});
    const qSnap=await db.collection("smv_questions").doc(questionId).get();
    if(!qSnap.exists) return res.status(404).json({error:"Question not found."});
    const q=qSnap.data()||{};
    const isAdmin=await isAdminUser(user);
    const isCustomer=q.customerId===user.uid;
    const isAstrologer=q.astrologerId===user.uid;
    if(event==="payment_verified" && !isCustomer) return res.status(403).json({error:"Only the question owner can send this notification."});
    if(["question_approved","question_rejected","answer_approved","answer_rejected"].includes(event) && !isAdmin) return res.status(403).json({error:"Admin access required for this notification."});
    if(event==="answer_submitted" && !isAstrologer) return res.status(403).json({error:"Only the assigned astrologer can send this notification."});

    async function userEmail(uid){
      if(!uid)return "";
      try{const u=await admin.auth().getUser(uid);return String(u.email||"").trim();}catch(e){}
      try{const s=await db.collection("smv_users").doc(uid).get();return String(s.data()?.email||"").trim();}catch(e){return "";}
    }
    const customerEmail=String(q.customerEmail||await userEmail(q.customerId)||"").trim();
    const astrologerEmail=await userEmail(q.astrologerId);
    const customerName=String(q.customerName||q.birthName||"Customer");
    const astrologerName=String(q.astrologerName||"Astrologer");
    let subject="", text="", to=[];
    if(event==="payment_verified"){
      if(customerEmail)to=[customerEmail]; subject="SMV ASTRO — Question payment received"; text=`Dear ${customerName},\n\nYour payment for your astrology question has been successfully verified. Your question is now waiting for Admin approval.\n\nQuestion: ${q.question||""}\nQuestion ID: ${questionId}\n\nRegards,\nSMV ASTRO`;
    } else if(event==="question_approved"){
      if(customerEmail)to=[customerEmail]; subject="SMV ASTRO — Your question has been approved"; text=`Dear ${customerName},\n\nYour paid astrology question has been approved by Admin and is now available to an approved astrologer.\n\nQuestion: ${q.question||""}\nQuestion ID: ${questionId}\n\nRegards,\nSMV ASTRO`;
    } else if(event==="question_rejected"){
      if(customerEmail)to=[customerEmail]; subject="SMV ASTRO — Question update"; text=`Dear ${customerName},\n\nYour astrology question was not approved by Admin.\n\nReason: ${reason||"Please contact SMV ASTRO."}\nQuestion ID: ${questionId}\n\nRegards,\nSMV ASTRO`;
    } else if(event==="answer_submitted"){
      if(customerEmail)to=[customerEmail]; if(ADMIN_EMAIL&&!to.includes(ADMIN_EMAIL))to.push(ADMIN_EMAIL); subject="SMV ASTRO — Astrologer answer submitted"; text=`Dear ${customerName},\n\n${astrologerName} has submitted an answer to your astrology question. It is now waiting for Admin review.\n\nQuestion: ${q.question||""}\nQuestion ID: ${questionId}\n\nRegards,\nSMV ASTRO`;
    } else if(event==="answer_approved"){
      if(customerEmail)to=[customerEmail]; { const c=answerReadyEmail({customerName,astrologerName,question:q.question,questionId,answer:q.answer}); subject=c.subject; text=c.text; }
    } else if(event==="answer_rejected"){
      if(astrologerEmail)to=[astrologerEmail]; subject="SMV ASTRO — Answer revision required"; text=`Dear ${astrologerName},\n\nYour submitted answer requires revision.\n\nReason: ${reason||"Please review and resubmit the answer."}\nQuestion ID: ${questionId}\n\nRegards,\nSMV ASTRO`;
    }
    // Astrologer answer delivery is Customer-only. Other workflow events may keep the Admin copy.
    if (!["answer_submitted","answer_approved"].includes(event) && ADMIN_EMAIL && !to.includes(ADMIN_EMAIL)) to.push(ADMIN_EMAIL);
    to = uniqueRecipients(to);
    if(!to.length) return res.status(400).json({error:"No recipient email address is available for this update."});
    await sendSystemEmail({to,replyTo:ADMIN_EMAIL,subject,text});
    return res.json({ok:true,recipients:to.length,event});
  }catch(e){console.error("Question notification failed:",e);return res.status(500).json({error:"Unable to send question update email right now."});}
});


async function nextQuestionId() {
  const dateKey = indiaDateKey();
  const ref = db.collection("smv_counters").doc(`question_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `SMV-QST-${dateKey}-${String(next).padStart(2, "0")}`;
  });
}

function nextPaymentIdInTransaction(dateKey, snap) {
  const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
  return {
    id: `SMV-PAY-${dateKey}-${String(next).padStart(2, "0")}`,
    next
  };
}


async function nextPaymentId() {
  const dateKey = indiaDateKey();
  const ref = db.collection("smv_counters").doc(`payment_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `SMV-PAY-${dateKey}-${String(next).padStart(2, "2")}`;
  });
}

async function nextBookingId() {
  const dateKey = indiaDateKey();
  const ref = db.collection("smv_counters").doc(`booking_${dateKey}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
    tx.set(ref, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `SMV-BKG-${dateKey}-${String(next).padStart(2, "0")}`;
  });
}

app.post("/appointment-booking", express.json({ limit: "20kb" }), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const name=String(req.body?.name||"").trim(), email=String(req.body?.email||user.email||"").trim(), mobile=String(req.body?.mobile||"").trim();
    const type=String(req.body?.type||"").trim(), preferredDate=String(req.body?.preferredDate||"").trim(), preferredTime=String(req.body?.preferredTime||"").trim(), notes=String(req.body?.notes||"").trim();
    if(!name||!email||!mobile||!type||!preferredDate||!preferredTime) return res.status(400).json({error:"Please fill all required appointment fields."});
    if(!["Chat Consultation","Call Consultation"].includes(type)) return res.status(400).json({error:"Please choose Chat or Call consultation."});
    if(name.length>100||email.length>160||mobile.length>20||notes.length>2000) return res.status(400).json({error:"One or more fields are too long."});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Please enter a valid email address."});

    const bookingId = await nextBookingId();
    const ref=db.collection("smv_appointments").doc();
    const data={bookingId,customerUid:user.uid,customerEmail:user.email||email,name,email,mobile,type,preferredDate,preferredTime,notes,status:"new",paymentStatus:"not_required",bookingStatus:"requested",createdAt:FieldValue.serverTimestamp(),source:"website-appointment-form",updatedAt:FieldValue.serverTimestamp()};
    await ref.set(data);

    // Email notification is best-effort. Booking creation must not fail just because
    // the optional notification provider is unavailable.
    if(ADMIN_EMAIL && (RESEND_API_KEY || smtpTransport)){
      try {
        await sendEmail({to:ADMIN_EMAIL,replyTo:email,subject:`SMV ASTRO ${type} Booking — ${bookingId}`,text:["New SMV ASTRO Booking Request","",`Booking ID: ${bookingId}`,`Customer UID: ${user.uid}`,`Name: ${name}`,`Email: ${email}`,`Mobile: ${mobile}`,`Type: ${type}`,`Preferred: ${preferredDate} ${preferredTime}`,`Notes: ${notes||"None"}`].join("\n")});
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
      return {id:d.id,name:x.name||"Astrologer",expertise:x.expertise||x.specialization||"Astrology",specialization:x.specialization||x.expertise||"Astrology",experience:x.experience||0,profileDescription:x.profileDescription||x.bio||x.about||"",bio:x.profileDescription||x.bio||x.about||"",about:x.profileDescription||x.about||x.bio||"",photoData:x.photoData||x.photoURL||x.photoUrl||"",rating:x.rating||x.averageRating||"New",publicId:x.publicId||"",chatPrice:Number(x.pricePerQuestion||0),status:x.status||""};
    }));
    const astrologers=checked.filter(Boolean);
    publicAstrologersCache={expiresAt:now+60000,data:astrologers};
    res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
    return res.json({success:true,astrologers});
  }catch(e){console.error("Public astrologers load failed:",e);return res.status(500).json({error:e?.message||"Unable to load approved astrologers."});}
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
    // Reviews are keyed as `${questionId}_${customerUid}`. Public review lookup
    // stays bounded and index-free: use the astrologer field equality query first.
    // If an old project has no usable field index, return the actual backend error
    // to the browser instead of hiding it behind a generic message.
    const snap=await sharedPublicRead("reviews:"+astrologerId,()=>db.collection("smv_reviews").where("astrologerId","==",astrologerId).limit(100).get());
    const reviews=snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(r=>r.approved===true || String(r.status||"").toLowerCase()==="approved");
    publicReviewsCache.set(astrologerId,{expiresAt:now+60000,reviews});
    res.set("Cache-Control","public, max-age=30, stale-while-revalidate=60");
    return res.json({success:true,astrologerId,reviews});
   }catch(e){console.error("Public astrologer reviews load failed:",e);return res.status(500).json({error:e?.message||"Unable to load astrologer reviews.",code:e?.code||"REVIEWS_LOAD_FAILED"});}
});
// ============================================================
// CUSTOMER REVIEW API
// Server-side review submission — avoids Firestore client
// permission problems and prevents duplicate reviews.
// ============================================================

app.get("/customer/reviews", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const snap = await db.collection("smv_reviews")
      .where("customerId", "==", user.uid)
      .limit(200)
      .get();

    const reviews = snap.docs
      .map(d => ({
        id: d.id,
        questionId: String(d.data()?.questionId || "")
      }))
      .filter(x => x.questionId);

    return res.json({
      success: true,
      reviews
    });
  } catch (e) {
    console.error(
      "Customer review status load failed:",
      e?.message || e
    );

    return res.status(500).json({
      error: e?.message || "Unable to load customer review status."
    });
  }
});


app.post("/customer/submit-review", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const questionId =
    String(req.body?.questionId || "").trim();

  const astrologerId =
    String(req.body?.astrologerId || "").trim();

  const rating =
    Number(req.body?.rating);

  const review =
    String(req.body?.review || "").trim();

  try {

    if (!questionId || !astrologerId) {
      return res.status(400).json({
        error: "Consultation information is missing."
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        error: "Please select a rating from 1 to 5."
      });
    }

    if (!review) {
      return res.status(400).json({
        error: "Please write your review."
      });
    }

    const questionRef =
      db.collection("smv_questions").doc(questionId);

    const questionSnap =
      await questionRef.get();

    if (!questionSnap.exists) {
      return res.status(404).json({
        error: "Consultation not found."
      });
    }

    const q = questionSnap.data() || {};

    // Customer ownership check
    if (
      String(q.customerId || "") !==
      String(user.uid)
    ) {
      return res.status(403).json({
        error: "You are not allowed to review this consultation."
      });
    }

    // Review is allowed only after final answer
    if (String(q.status || "") !== "answered") {
      return res.status(409).json({
        error: "You can review only after the answer has been approved."
      });
    }

    // Astrologer check
    if (
      String(q.astrologerId || "") !==
      astrologerId
    ) {
      return res.status(409).json({
        error: "Astrologer information does not match."
      });
    }

    // One review per customer + question
    const reviewId =
      `${questionId}_${user.uid}`;

    const reviewRef =
      db.collection("smv_reviews").doc(reviewId);

    const existing =
      await reviewRef.get();

    // Already reviewed
    if (existing.exists) {

      await questionRef.set({
        reviewed: true,
        reviewSubmittedAt:
          q.reviewSubmittedAt ||
          FieldValue.serverTimestamp()
      }, {
        merge: true
      });

      return res.json({
        success: true,
        alreadySubmitted: true,
        reviewId
      });
    }

    // Create review
    await reviewRef.set({

      questionId,

      customerId: user.uid,

      customerName:
        q.customerName ||
        q.birthName ||
        "Customer",

      astrologerId,

      astrologerName:
        q.astrologerName ||
        "Astrologer",

      rating,

      review,

      verified: true,

      approved: false,

      status: "pending",

      createdAt:
        FieldValue.serverTimestamp()

    });

    // Mark consultation as reviewed
    await questionRef.set({

      reviewed: true,

      reviewSubmittedAt:
        FieldValue.serverTimestamp()

    }, {
      merge: true
    });

    return res.json({
      success: true,
      alreadySubmitted: false,
      reviewId
    });

  } catch (e) {

    console.error(
      "Customer review submission failed:",
      e?.message || e
    );

    return res.status(500).json({
      error:
        e?.message ||
        "Unable to submit review."
    });
  }
});

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

app.post("/admin/approve-question", express.json({limit:"10kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.body?.questionId||"").trim();
    const astrologerId=String(req.body?.astrologerId||"").trim();
    const pct=Number(req.body?.commissionPercent);
    if(!questionId||!astrologerId) return res.status(400).json({error:"Question ID and astrologer are required."});
    if(!Number.isFinite(pct)||pct<0||pct>100) return res.status(400).json({error:"Commission percentage must be between 0 and 100."});
    const qRef=db.collection("smv_questions").doc(questionId);
    const aRef=db.collection("smv_astrologers").doc(astrologerId);
    const [qSnap,aSnap]=await Promise.all([qRef.get(),aRef.get()]);
    if(!qSnap.exists) return res.status(404).json({error:"Question not found."});
    if(!aSnap.exists) return res.status(404).json({error:"Astrologer not found."});
    const q=qSnap.data()||{}, a=aSnap.data()||{};
    if(String(a.status||"").toLowerCase()!=="approved") return res.status(409).json({error:"Selected astrologer is not approved."});
    if(["answered","question_rejected"].includes(String(q.status||""))) return res.status(409).json({error:"This question is already closed."});
    const amount=Number(q.amount||q.paymentAmount||0);
    if(!Number.isFinite(amount)||amount<=0) return res.status(409).json({error:"This question does not have a valid paid amount."});
    const astroCommission=Math.round(amount*pct)/100;
    const adminCommission=Math.round((amount-astroCommission)*100)/100;
    await qRef.update({
      status:"paid", allocationStatus:"assigned_to_astrologer", astrologerId, astrologerName:a.name||"Astrologer",
      commissionPercent:pct, commissionRate:pct, astrologerCommissionAmount:astroCommission,
      adminCommissionAmount:adminCommission, adminQuestionApprovedAt:FieldValue.serverTimestamp(),
      adminQuestionApprovedBy:user.uid, commissionStatus:"allocated_pending_answer", updatedAt:FieldValue.serverTimestamp()
    });
    await writeAdminAudit("QUESTION_APPROVED",questionId,user.uid,{astrologerId,commissionPercent:pct,astrologerCommissionAmount:astroCommission,adminCommissionAmount:adminCommission});
    await db.collection("smv_notifications").add({userId:astrologerId,type:"question_assigned",title:"New Question Assigned",message:"A paid question has been assigned to you by Admin.",questionId,commissionAmount:astroCommission,createdAt:FieldValue.serverTimestamp(),read:false});
    setImmediate(async()=>{
      const astrologerEmail=await resolveAstrologerEmail({astrologerId,astrologerEmail:a.email});
      const customerEmail=await resolveCustomerEmail(q);
      await Promise.allSettled([
        sendEventEmailOnce({eventKey:`public:${questionId}:assigned:${astrologerId}`,to:[astrologerEmail],subject:"SMV ASTRO — New Paid Question Assigned",text:`A paid astrology question has been assigned to you by Admin.\n\nQuestion ID: ${questionId}\nCustomer: ${q.customerName||"Customer"}`,context:{questionId,astrologerId,event:"assigned"}}),
        sendEventEmailOnce({eventKey:`public:${questionId}:approved_customer`,to:[customerEmail],subject:"SMV ASTRO — Your Question Has Been Approved",text:`Your paid astrology question has been approved and assigned to ${a.name||"an approved astrologer"}.\n\nQuestion ID: ${questionId}`,context:{questionId,event:"approved_customer"}})
      ]);
    });
    return res.json({success:true,questionId,astrologerId,commissionPercent:pct,astrologerCommissionAmount:astroCommission,adminCommissionAmount:adminCommission});
  }catch(e){console.error("Admin approve question error:",e);return res.status(500).json({error:e?.message||"Unable to approve and allocate question."});}
});


app.post('/astrologer/claim-question', express.json({limit:'10kb'}), async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;
 const questionId=String(req.body?.questionId||'').trim();
 if(!questionId)return res.status(400).json({error:'Question ID is required.'});
 try{
  const [workflow,commissionSnap]=await Promise.all([getOpenWorkflowSettings(),db.collection('smv_settings').doc('commission').get().catch(()=>null)]);
  const defaultPct=Number(commissionSnap?.exists?commissionSnap.data()?.astroPercent:20);
  let astroName='Astrologer',commissionPercent=Number.isFinite(defaultPct)?defaultPct:20,commissionAmount=0;
  await db.runTransaction(async tx=>{
   const qRef=db.collection('smv_questions').doc(questionId),aRef=db.collection('smv_astrologers').doc(user.uid);
   const [qs,as]=await Promise.all([tx.get(qRef),tx.get(aRef)]);
   const fail=(status,message)=>{throw Object.assign(new Error(message),{httpStatus:status});};
   if(!qs.exists)fail(404,'Question not found.');
   if(!as.exists||String(as.data()?.status||'').toLowerCase()!=='approved')fail(403,'Your astrologer profile is not approved.');
   const q=qs.data()||{}; astroName=String(as.data()?.name||'Astrologer');
   const isOpen=workflow.allowWithoutAdminApproval && !q.astrologerId && q.paymentStatus==='paid' && String(q.status||'')==='available_to_astrologers' && String(q.allocationStatus||'')==='available_to_astrologers';
   const isAllocated=String(q.astrologerId||'')===String(user.uid) && !!q.adminQuestionApprovedAt && ['paid','admin_approved'].includes(String(q.status||'')) && ['assigned_to_astrologer','available_to_astrologers','reallocated','claimed_by_astrologer'].includes(String(q.allocationStatus||''));
   if(!isOpen && !isAllocated) fail(409,'This question is no longer available to claim.');
   commissionPercent=Number(q.commissionPercent??q.commissionRate??defaultPct??20);
   commissionAmount=Math.round(Number(q.amount||0)*commissionPercent)/100;
   tx.update(qRef,{status:'admin_approved',allocationStatus:'claimed_by_astrologer',astrologerId:user.uid,astrologerName:astroName,claimedAt:FieldValue.serverTimestamp(),claimedBy:user.uid,commissionPercent,commissionRate:commissionPercent,astrologerCommissionAmount:commissionAmount,adminApprovalBypassed:isOpen||q.adminApprovalBypassed===true,updatedAt:FieldValue.serverTimestamp()});
  });
  return res.json({success:true,questionId,astrologerId:user.uid,astrologerName:astroName,status:'admin_approved',allocationStatus:'claimed_by_astrologer',commissionPercent,astrologerCommissionAmount:commissionAmount});
 }catch(e){return res.status(e.httpStatus||500).json({error:e.message||'Unable to claim the question.'});}
});

const refundService=()=>createRefundService({db,razorpay,FieldValue,keyId:RAZORPAY_KEY_ID,keySecret:RAZORPAY_KEY_SECRET});
app.get('/api-version', (req,res)=>res.set('Cache-Control','no-store').json({version:'20260913-refund-v5-email-mobile-unique-v6',features:['refund-retry','original-price-payment-retry','email-verification-only','one-phone-one-account','whatsapp-otp-switch-ready']}));

for(const [path,retry] of [['/admin/reject-question',false],['/admin/retry-refund',true]]){
 app.post(path,express.json({limit:'10kb'}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:'Admin access denied.'});
  const id=String(req.body?.questionId||'').trim();
  if(!/^[A-Za-z0-9_-]+$/.test(id))return res.status(400).json({error:'A valid Question ID is required.'});
  try{const result=await refundService().reject(id,String(req.body?.reason||'').trim(),user,{retry});return res.status(result.success?200:502).json(result);}
  catch(e){return res.status(e.httpStatus||500).json({error:e.message||'Refund request failed.'});}
 });
}

// Admin-only diagnostic endpoint. It does NOT create a refund.
// It verifies that the rejected question contains the real Razorpay payment ID
// and, when a refund ID exists, reads that refund from Razorpay. Exact API error
// fields are returned without exposing credentials or request headers.
app.get("/admin/refund-trace/:questionId", async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.params.questionId||"").trim();
    if(!questionId) return res.status(400).json({error:"Question ID is required."});
    const qSnap=await db.collection("smv_questions").doc(questionId).get();
    if(!qSnap.exists) return res.status(404).json({error:"Question not found."});
    const q=qSnap.data()||{};
    const paymentId=String(q.razorpayPaymentId||"").trim();
    const result={
      questionId,
      questionStatus:String(q.status||""),
      paymentStatus:String(q.paymentStatus||""),
      customerPaymentId:String(q.customerPaymentId||""),
      razorpayPaymentId:paymentId||null,
      refundStatus:String(q.refundStatus||""),
      refundId:String(q.refundId||""),
      refundAmount:Number(q.refundAmount||q.amount||0),
      storedRefundError:String(q.refundError||"")||null,
      storedRefundErrorCode:String(q.refundErrorCode||"")||null,
      storedRefundErrorStatusCode:Number(q.refundErrorStatusCode||0)||null,
      storedRefundErrorReason:String(q.refundErrorReason||"")||null,
      storedRefundErrorSource:String(q.refundErrorSource||"")||null,
      storedRefundErrorStep:String(q.refundErrorStep||"")||null
    };
    if(!paymentId){
      return res.json({...result,paymentLookup:"not_available",diagnosis:"No razorpayPaymentId is stored on this question."});
    }
    try{
      const payment=await razorpay.payments.fetch(paymentId);
      result.paymentLookup={id:payment?.id||paymentId,status:payment?.status||null,amount:payment?.amount!=null?Number(payment.amount)/100:null,currency:payment?.currency||null,orderId:payment?.order_id||null};
    }catch(e){
      const err={statusCode:Number(e?.statusCode||e?.status||0)||null,code:String(e?.error?.code||e?.code||"").trim()||null,description:String(e?.error?.description||e?.description||e?.message||"Razorpay payment lookup failed.").trim(),reason:String(e?.error?.reason||e?.reason||"").trim()||null,source:String(e?.error?.source||e?.source||"").trim()||null,step:String(e?.error?.step||e?.step||"").trim()||null};
      console.error("[REFUND_TRACE] Payment lookup failed",{questionId,razorpayPaymentId:paymentId,error:err});
      return res.status(502).json({...result,paymentLookupError:err});
    }
    if(result.refundId){
      try{
        const refund=await razorpay.refunds.fetch(result.refundId);
        result.refundLookup={id:refund?.id||result.refundId,status:refund?.status||null,amount:refund?.amount!=null?Number(refund.amount)/100:null,paymentId:refund?.payment_id||null,createdAt:refund?.created_at||null};
      }catch(e){
        const err={statusCode:Number(e?.statusCode||e?.status||0)||null,code:String(e?.error?.code||e?.code||"").trim()||null,description:String(e?.error?.description||e?.description||e?.message||"Razorpay refund lookup failed.").trim(),reason:String(e?.error?.reason||e?.reason||"").trim()||null,source:String(e?.error?.source||e?.source||"").trim()||null,step:String(e?.error?.step||e?.step||"").trim()||null};
        console.error("[REFUND_TRACE] Refund lookup failed",{questionId,refundId:result.refundId,error:err});
        result.refundLookupError=err;
      }
    }
    result.diagnosis=result.refundId?"A Razorpay refund ID is stored; inspect refundLookup/status.":(String(q.refundStatus||"").toLowerCase()==="failed"?"No refund ID was created. Inspect stored refund error and paymentLookup; the refund API did not create a Razorpay refund.":"Payment ID is present and available for refund processing.");
    return res.json(result);
  }catch(e){
    console.error("[REFUND_TRACE] Diagnostic endpoint failed:",e);
    return res.status(500).json({error:e?.message||"Refund trace failed."});
  }
});

// Customer/Admin can explicitly reconcile a Razorpay refund. This is a safe
// fallback when the Razorpay webhook is delayed or not configured yet.
for(const [path,customer] of [['/customer/sync-refund',true],['/admin/sync-refund',false]]){
 app.post(path,express.json({limit:'10kb'}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!customer&&!(await isAdminUser(user)))return res.status(403).json({error:'Admin access denied.'});
  const id=String(req.body?.questionId||'').trim();
  if(!/^[A-Za-z0-9_-]+$/.test(id))return res.status(400).json({error:'A valid Question ID is required.'});
  try{return res.json(await refundService().sync(id,user,{customer}));}
  catch(e){return res.status(e.httpStatus||502).json({error:e.message||'Refund sync failed.'});}
 });
}

app.post("/admin/reallocate-question", express.json({limit:"10kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.body?.questionId||"").trim();
    const astrologerId=String(req.body?.astrologerId||"").trim();
    const pct=Number(req.body?.commissionPercent);
    if(!questionId||!astrologerId) return res.status(400).json({error:"Question ID and astrologer are required."});
    if(!Number.isFinite(pct)||pct<0||pct>100) return res.status(400).json({error:"Commission percentage must be between 0 and 100."});
    const qRef=db.collection("smv_questions").doc(questionId);
    const aRef=db.collection("smv_astrologers").doc(astrologerId);
    const [qSnap,aSnap]=await Promise.all([qRef.get(),aRef.get()]);
    if(!qSnap.exists) return res.status(404).json({error:"Question not found."});
    if(!aSnap.exists) return res.status(404).json({error:"Astrologer not found."});
    const q=qSnap.data()||{}, a=aSnap.data()||{};
    if(String(a.status||"").toLowerCase()!=="approved") return res.status(409).json({error:"Selected astrologer is not approved."});
    if(["answered","question_rejected","admin_rejected"].includes(String(q.status||""))) return res.status(409).json({error:"This question is already closed."});
    if(!q.adminQuestionApprovedAt || !q.astrologerId) return res.status(409).json({error:"This question has not been allocated yet."});
    const amount=Number(q.amount||q.paymentAmount||0);
    const astroCommission=Math.round(amount*pct)/100;
    const adminCommission=Math.round((amount-astroCommission)*100)/100;
    const oldAstrologerId=String(q.astrologerId||"");
    await qRef.update({
      astrologerId, astrologerName:a.name||"Astrologer", commissionPercent:pct, commissionRate:pct,
      astrologerCommissionAmount:astroCommission, adminCommissionAmount:adminCommission,
      allocationStatus:"assigned_to_astrologer", commissionStatus:"allocated_pending_answer",
      astrologerAnswerStatus:"pending", status:"admin_approved",
      answer:"", answerWordCount:0, answerAuthorType:"", adminTakeover:false,
      adminRejectionReason:FieldValue.delete(), adminRejectedAt:FieldValue.delete(), adminRejectedBy:FieldValue.delete(),
      reallocatedAt:FieldValue.serverTimestamp(), reallocatedBy:user.uid, updatedAt:FieldValue.serverTimestamp()
    });
    if(oldAstrologerId && oldAstrologerId!==astrologerId){
      await db.collection("smv_notifications").add({userId:oldAstrologerId,type:"question_reallocated",title:"Question Re-allocated",message:"Admin has re-allocated this question to another astrologer. It is no longer assigned to you.",questionId,createdAt:FieldValue.serverTimestamp(),read:false});
    }
    await db.collection("smv_notifications").add({userId:astrologerId,type:"question_assigned",title:"Question Re-allocated",message:"Admin has assigned a paid question to you. Please submit your answer.",questionId,commissionAmount:astroCommission,createdAt:FieldValue.serverTimestamp(),read:false});
    return res.json({success:true,questionId,astrologerId,commissionPercent:pct,astrologerCommissionAmount:astroCommission,adminCommissionAmount:adminCommission});
  }catch(e){console.error("Admin reallocate question error:",e);return res.status(500).json({error:e?.message||"Unable to re-allocate question."});}
});


app.post("/admin/edit-question", express.json({limit:"20kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.body?.questionId||"").trim();
    const question=String(req.body?.question||"").trim();
    if(!questionId||!question) return res.status(400).json({error:"Question ID and question text are required."});
    if(question.length>10000) return res.status(400).json({error:"Question is too long."});
    const ref=db.collection("smv_questions").doc(questionId);
    const snap=await ref.get(); if(!snap.exists) return res.status(404).json({error:"Question not found."});
    const q=snap.data()||{};
    if(["answered","question_rejected"].includes(q.status)) return res.status(409).json({error:"This question can no longer be edited."});
    await ref.update({question,adminQuestionEditedAt:FieldValue.serverTimestamp(),adminQuestionEditedBy:user.uid});
    return res.json({success:true,questionId});
  }catch(e){console.error("Admin edit question error:",e);return res.status(500).json({error:e?.message||"Unable to edit question."});}
});

app.post("/admin/takeover-answer", express.json({limit:"30kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.body?.questionId||"").trim();
    const answer=String(req.body?.answer||"").trim();
    if(!questionId||!answer) return res.status(400).json({error:"Question ID and Admin answer are required."});
    const ref=db.collection("smv_questions").doc(questionId);
    const snap=await ref.get(); if(!snap.exists) return res.status(404).json({error:"Question not found."});
    const q=snap.data()||{};
    if(!q.customerId) return res.status(409).json({error:"Customer information is missing."});
    if(["answered","question_rejected"].includes(q.status)) return res.status(409).json({error:"This question is already closed."});
    const wordCount=answer.split(/\s+/).filter(Boolean).length;
    const minWords=Math.max(1,Number(q.answerMinWords||1));
    if(wordCount<minWords) return res.status(400).json({error:`Admin answer must contain at least ${minWords} words.`});
    await ref.update({
      question: q.question || "",
      answer,
      answerWordCount:wordCount,
      answerAuthorType:"admin",
      adminAnswered:true,
      adminAnswerBy:user.uid,
      adminAnswerAt:FieldValue.serverTimestamp(),
      status:"answered",
      astrologerAnswerStatus:"not_required",
      commissionStatus:"admin_retained",
      astrologerCommissionAmount:0,
      commissionAmount:0,
      commissionCreditedAt:FieldValue.delete(),
      astrologerPaymentId:FieldValue.delete(),
      adminTakeover:true,
      answeredAt:FieldValue.serverTimestamp(),
      updatedAt:FieldValue.serverTimestamp()
    });
    await db.collection("smv_notifications").add({userId:q.customerId,type:"answer_approved",title:"Your astrology answer is ready",message:"SMV ASTRO Admin answered your question directly.",questionId,createdAt:FieldValue.serverTimestamp(),read:false});
    return res.json({success:true,questionId,answerAuthorType:"admin",adminRetained:true});
  }catch(e){console.error("Admin takeover answer error:",e);return res.status(500).json({error:e?.message||"Unable to save Admin answer."});}
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



app.post("/admin/set-open-workflow", express.json({limit:"10kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const allow=req.body?.allowWithoutAdminApproval===true;
    await db.collection("smv_settings").doc("workflow").set({allowWithoutAdminApproval:allow,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});
    let opened=0;
    let closed=0;
    if(allow){
      const snap=await db.collection("smv_questions").where("status","in",["pending_admin_approval","paid"]).get();
      const batch=db.batch();
      for(const d of snap.docs){
        const q=d.data()||{};
        if(q.paymentStatus==='paid' && !q.astrologerId && ['pending_admin_approval','paid'].includes(String(q.status||''))){
          batch.update(d.ref,{status:'available_to_astrologers',allocationStatus:'available_to_astrologers',adminApprovalBypassed:true,openedToAstrologersAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
          opened++;
        }
      }
      if(opened) await batch.commit();
    } else {
      const snap=await db.collection("smv_questions").where("status","==","available_to_astrologers").get();
      const batch=db.batch();
      for(const d of snap.docs){
        const q=d.data()||{};
        if(q.paymentStatus==='paid' && !q.astrologerId && String(q.status||'')==='available_to_astrologers'){
          batch.update(d.ref,{status:'pending_admin_approval',allocationStatus:'awaiting_admin',adminApprovalBypassed:false,updatedAt:FieldValue.serverTimestamp()});
          closed++;
        }
      }
      if(closed) await batch.commit();
    }
    await writeAdminAudit("OPEN_WORKFLOW_"+(allow?"ENABLED":"DISABLED"),null,user.uid,{opened,closed});
    return res.json({success:true,allowWithoutAdminApproval:allow,opened,closed});
  }catch(e){console.error("Open workflow setting failed:",e);return res.status(500).json({error:e?.message||"Unable to update workflow setting."});}
});

require('./dashboard-events')(app,{db,requireUser,isAdminUser});

app.get("/astrologer/open-questions", async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  try{
    const astro=await db.collection("smv_astrologers").doc(user.uid).get();
    if(!astro.exists || String(astro.data()?.status||'').toLowerCase()!=='approved') return res.status(403).json({error:"Your astrologer profile is not approved."});
    const workflow=await getOpenWorkflowSettings();
    if(!workflow.allowWithoutAdminApproval) return res.json({success:true,allowWithoutAdminApproval:false,questions:[]});
    const [snap,commissionSnap]=await Promise.all([db.collection("smv_questions").where("status","==","available_to_astrologers").get(),db.collection("smv_settings").doc("commission").get().catch(()=>null)]);
    const pct=Number(commissionSnap?.exists?commissionSnap.data()?.astroPercent:20);
    const questions=snap.docs.map(d=>({id:d.id,...d.data()})).filter(q=>q.paymentStatus==='paid' && !q.astrologerId && String(q.status||'')==='available_to_astrologers' && String(q.allocationStatus||'')==='available_to_astrologers').slice(0,100).map(q=>({...q,commissionPercent:Number.isFinite(pct)?pct:20,astrologerCommissionAmount:Math.round(Number(q.amount||0)*(Number.isFinite(pct)?pct:20))/100}));
    return res.json({success:true,allowWithoutAdminApproval:true,questions});
  }catch(e){console.error("Open questions load failed:",e);return res.status(500).json({error:e?.message||"Unable to load open questions."});}
});

async function updateEditableAnswer(ref,viewKey,patch){
 return db.runTransaction(async tx=>{const snap=await tx.get(ref);const current=snap.data()||{};
 if(current[viewKey]||current.commissionStatus==='credited')throw Object.assign(new Error('Answer is completed. Editing is closed.'),{httpStatus:409});
 tx.update(ref,patch);});
}
const answerCredit=require('./answer-credit')({db,FieldValue,privateAmounts:async c=>{
 const saved={astrologerAmount:Number(c.astrologerAmount),adminAmount:Number(c.adminAmount),privateAstrologerCommissionRate:Number(c.privateAstrologerCommissionRate)};
 return Object.values(saved).every(Number.isFinite)?saved:privateCommissionSnapshot(Number(c.chatPrice||c.amount||0),await getPrivateCommissionSettings());
}});
function markViewedRoute(kind,idKey){return async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;
 const id=String(req.body?.[idKey]||'').trim();if(!id)return res.status(400).json({error:'Answer ID is required.'});
 try{const result=await answerCredit.settle(kind,id,{customerId:user.uid});return res.json({success:true,[idKey]:id,viewed:true,...result});}
 catch(e){return res.status(e.httpStatus||500).json({error:e.message||'Unable to mark answer viewed.'});}
};}
app.post('/customer/mark-answer-viewed',express.json({limit:'10kb'}),markViewedRoute('public','questionId'));


async function getAstrologerAutoApprovalSettings(includeSecret=false){
  try{
    const s=await db.collection("smv_settings").doc("astrologerAutoApproval").get(),d=s.exists?s.data()||{}:{};
    const out={enabled:d.enabled===true,formUrl:String(d.formUrl||""),syncWebAppUrl:String(d.syncWebAppUrl||""),passMark:Math.max(1,Math.min(25,Number(d.passMark||20))),defaultChatPrice:Math.max(1,Number(d.defaultChatPrice||25))};
    if(includeSecret)out.webhookSecret=String(d.webhookSecret||"");
    return out;
  }catch(_){return {enabled:false,formUrl:"",syncWebAppUrl:"",passMark:20,defaultChatPrice:25,...(includeSecret?{webhookSecret:""}:{})};}
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
    const b=req.body||{},enabled=b.enabled===true,formUrl=String(b.formUrl||"").trim(),syncWebAppUrl=String(b.syncWebAppUrl||"").trim(),passMark=Math.round(Number(b.passMark||20)),defaultChatPrice=Math.round(Number(b.defaultChatPrice||25)*100)/100;
    if(passMark<1||passMark>25)return res.status(400).json({error:"Pass mark must be between 1 and 25."});
    if(syncWebAppUrl&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/i.test(syncWebAppUrl))return res.status(400).json({error:"Enter a valid deployed Google Apps Script Web App /exec URL."});
    if(!Number.isFinite(defaultChatPrice)||defaultChatPrice<1)return res.status(400).json({error:"Default Private Consultation Chat Price must be at least ₹1."});
    if(enabled&&!/^https:\/\/docs\.google\.com\/forms\//i.test(formUrl))return res.status(400).json({error:"Enter the published Google Form URL before enabling Auto Approval."});
    const ref=db.collection("smv_settings").doc("astrologerAutoApproval"),old=await ref.get(),oldSecret=old.exists?String(old.data()?.webhookSecret||""):"";
    const webhookSecret=b.rotateSecret===true||!oldSecret?crypto.randomBytes(32).toString("hex"):oldSecret;
    await ref.set({enabled,formUrl,syncWebAppUrl,passMark,defaultChatPrice,webhookSecret,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});
    return res.json({success:true,enabled,formUrl,syncWebAppUrl,passMark,defaultChatPrice,webhookSecret});
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
      if(autoApproved)Object.assign(quizPatch,{status:"approved",pricePerQuestion:cfg.defaultChatPrice,approvedAt:FieldValue.serverTimestamp(),approvedBy:"google_quiz_auto_approval",autoApproved:true});
      tx.set(astroRef,quizPatch,{merge:true});
      if(autoApproved)tx.set(db.collection("smv_users").doc(uid),{status:"active",updatedAt:FieldValue.serverTimestamp()},{merge:true});
      const note=db.collection("smv_notifications").doc(uid+"_quiz_"+Date.now());
      tx.set(note,{userId:uid,type:autoApproved?"approval":"astrologer_quiz_result",title:autoApproved?"Astrologer application auto approved":(passed?"Qualification test passed":"Qualification test not passed"),message:autoApproved?`You passed the qualification test (${score}/${maxScore}) and your astrologer account has been approved automatically.`:`Qualification test score: ${score}/${maxScore}. ${passed?"Auto Approval is currently disabled; Admin review remains pending.":"Required pass mark: "+cfg.passMark+"/25."}`,createdAt:FieldValue.serverTimestamp(),read:false});
    });
    return res.json({success:true,passed,autoApproved,score,maxScore,passMark:cfg.passMark});
  }catch(e){console.error("Google Form astrologer qualification webhook failed:",e);return res.status(500).json({error:e.message||"Unable to process qualification result."});}
});
app.get("/admin/private-consultations-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const [consultSnap,usersSnap,astrologersSnap,privateCommissionSnap,privateWorkflowSnap]=await Promise.all([
      db.collection("smv_private_consultations").get(),
      db.collection("smv_users").get(),
      db.collection("smv_astrologers").get(),
      db.collection("smv_settings").doc("privateCommission").get(),
      db.collection("smv_settings").doc("privateConsultationWorkflow").get()
    ]);
    return res.json({
      success:true,
      privateConsultations:consultSnap.docs.map(d=>({id:d.id,...d.data()})),
      users:usersSnap.docs.map(d=>({id:d.id,...d.data()})),
      astrologers:astrologersSnap.docs.map(d=>({id:d.id,...d.data()})),
      settings:{
        privateCommission:privateCommissionSnap.exists?privateCommissionSnap.data():null,
        privateConsultationWorkflow:privateWorkflowSnap.exists?privateWorkflowSnap.data():null
      }
    });
  }catch(e){
    console.error("Admin private consultations targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin private consultations."});
  }
});

app.get("/admin/settings-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const [commissionSnap,questionSnap,workflowSnap,privateCommissionSnap,privateWorkflowSnap,autoApprovalSnap]=await Promise.all([
      db.collection("smv_settings").doc("commission").get(),
      db.collection("smv_settings").doc("question").get(),
      db.collection("smv_settings").doc("workflow").get(),
      db.collection("smv_settings").doc("privateCommission").get(),
      db.collection("smv_settings").doc("privateConsultationWorkflow").get(),
      db.collection("smv_settings").doc("astrologerAutoApproval").get()
    ]);
    const val=snap=>snap.exists?snap.data():null;
    return res.json({success:true,settings:{
      commission:val(commissionSnap),question:val(questionSnap),workflow:val(workflowSnap),
      privateCommission:val(privateCommissionSnap),privateConsultationWorkflow:val(privateWorkflowSnap),
      astrologerAutoApproval:val(autoApprovalSnap)
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
    const snap=await db.collection("smv_withdrawals").get();
    return res.json({success:true,withdrawals:snap.docs.map(d=>({id:d.id,...d.data()}))});
  }catch(e){
    console.error("Admin withdrawals targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin withdrawal data."});
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
      users:usersSnap.docs.map(d=>({id:d.id,...d.data()})),
      astrologers:astrologersSnap.docs.map(d=>({id:d.id,...d.data()}))
    });
  }catch(e){
    console.error("Admin astrologers targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin astrologer data."});
  }
});

app.get("/admin/questions-data", async (req, res) => {
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const [questionsSnap,astrologersSnap,commissionSnap,workflowSnap]=await Promise.all([
      db.collection("smv_questions").get(),
      db.collection("smv_astrologers").where("status","==","approved").get(),
      db.collection("smv_settings").doc("commission").get(),
      db.collection("smv_settings").doc("workflow").get()
    ]);
    return res.json({
      success:true,
      questions:questionsSnap.docs.map(d=>({id:d.id,...d.data()})),
      astrologers:astrologersSnap.docs.map(d=>({id:d.id,...d.data()})),
      settings:{
        commission:commissionSnap.exists?commissionSnap.data():null,
        workflow:workflowSnap.exists?workflowSnap.data():{allowWithoutAdminApproval:false}
      }
    });
  }catch(e){
    console.error("Admin questions targeted load failed:",e);
    return res.status(500).json({error:e?.message||"Unable to load Admin question data."});
  }
});

app.get("/admin-data", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access denied." });

  const readCollection = async (name,source=db.collection(name)) => {
    try {
      const snap = await source.get();
      return { ok: true, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) {
      console.error(`Admin collection ${name} failed:`, e?.message || e);
      return { ok: false, items: [], error: e?.message || `Unable to read ${name}.` };
    }
  };

  try {
    // Read each collection independently. One damaged/missing collection must
    // never prevent the Admin Dashboard itself from opening.
    const [users, astrologers, questions, payments, privateConsultations, adminNotifications, legacyNotifications, offers, commission, privateCommission, workflow, privateWorkflow, astrologerAutoApproval] = await Promise.all([
      readCollection("smv_users"),
      readCollection("smv_astrologers"),
      readCollection("smv_questions"),
      readCollection("smv_payments"),
      readCollection("smv_private_consultations"),
      readCollection("smv_admin_notifications"),
      readCollection("smv_notifications",db.collection("smv_notifications").where("userId","==",ADMIN_UID)),
      readCollection(OFFER_COLLECTION),
      db.collection("smv_settings").doc("commission").get().then(s=>s.exists?s.data():null).catch(()=>null),
      getPrivateCommissionSettings(),
      db.collection("smv_settings").doc("workflow").get().then(s=>s.exists?s.data():{allowWithoutAdminApproval:false}).catch(()=>({allowWithoutAdminApproval:false})),
      db.collection("smv_settings").doc("privateConsultationWorkflow").get().then(s=>s.exists?s.data():{allowWithoutAdminApproval:false,minimumAnswerWords:20}).catch(()=>({allowWithoutAdminApproval:false,minimumAnswerWords:20})),
      getAstrologerAutoApprovalSettings(true)
    ]);

    const customers = users.items.filter(x => String(x.role || "").toLowerCase() === "customer");
    return res.json({
      success: true,
      settings: {commission, privateCommission, workflow, privateWorkflow, astrologerAutoApproval},
      customers,
      users: users.items,
      astrologers: astrologers.items,
      questions: questions.items,
      offers: offers.items,
      privateConsultations: privateConsultations.items,
      adminNotifications: [
        ...adminNotifications.items,
        ...legacyNotifications.items.filter(n=>String(n.userId||"")===String(ADMIN_UID||"")),
        ...privateConsultations.items.flatMap(c=>{
          const id=String(c.consultationId||c.id||"");
          const base={consultationId:id,source:"private_consultation_history",customerId:c.customerId||null,astrologerId:c.astrologerId||null};
          const events=[];
          if(c.paymentStatus==="paid")events.push({...base,id:"history-payment-"+id,type:"private_payment_received",title:"Private Consultation Payment Received",message:`${c.customerName||"Customer"} paid ₹${Number(c.chatPrice||c.amount||0).toFixed(2)} for ${c.astrologerName||"the selected astrologer"}.`,createdAt:c.paidAt||c.updatedAt||c.createdAt});
          if(c.questionApprovedAt||c.questionApprovalBypassed===true)events.push({...base,id:"history-question-approved-"+id,type:"private_question_approved",title:c.questionApprovalBypassed===true?"Private Question Auto Allowed":"Private Question Approved",message:`Private consultation question is visible to ${c.astrologerName||"the selected astrologer"}.`,createdAt:c.questionApprovedAt||c.paidAt||c.updatedAt});
          if(c.answerSubmittedAt)events.push({...base,id:"history-answer-submitted-"+id,type:"private_answer_submitted",title:"Private Answer Submitted",message:`${c.astrologerName||"Selected astrologer"} submitted an answer for ${c.customerName||"Customer"}.`,createdAt:c.answerSubmittedAt});
          if(c.answerRejectedAt)events.push({...base,id:"history-answer-rejected-"+id,type:"private_answer_rejected",title:"Private Answer Rejected — Revision Required",message:`Admin rejected the private answer.${c.answerRejectionReason?" Reason: "+c.answerRejectionReason:""}`,createdAt:c.answerRejectedAt});
          if(c.answerApprovedAt)events.push({...base,id:"history-answer-approved-"+id,type:"private_answer_approved",title:"Private Answer Approved",message:`Private answer for ${c.customerName||"Customer"} was approved and released to the customer.`,createdAt:c.answerApprovedAt});
          if(c.customerViewedAt)events.push({...base,id:"history-answer-viewed-"+id,type:"private_answer_viewed",title:"Private Answer Viewed by Customer",message:`${c.customerName||"Customer"} viewed the private consultation answer.`,createdAt:c.customerViewedAt});
          if(c.refundId||c.status==="question_rejected")events.push({...base,id:"history-refund-"+id,type:"private_question_refund",title:"Private Question Rejected / Refund",message:`Private consultation was rejected. Refund status: ${c.refundStatus||"pending"}.`,createdAt:c.refundProcessedAt||c.refundCreatedAt||c.adminQuestionRejectedAt||c.updatedAt});
          return events;
        })
      ],
      payments: payments.items,
      errors: { users: users.error || null, astrologers: astrologers.error || null, questions: questions.error || null, payments: payments.error || null, offers: offers.error || null }
    });
  } catch (e) {
    console.error("Admin data load failed:", e);
    return res.status(500).json({ error: e?.message || "Unable to load Admin data." });
  }
});


async function getPrivateCommissionSettings(){
  try{
    const s=await db.collection("smv_settings").doc("privateConsultationCommission").get();
    const d=s.exists?s.data()||{}:{};
    const astrologerRate=Math.max(0,Math.min(100,Number(d.astrologerRate??20)));
    return {astrologerRate,adminRate:Math.round((100-astrologerRate)*100)/100};
  }catch(_e){return {astrologerRate:20,adminRate:80};}
}
function privateCommissionSnapshot(chatPrice,settings){
  const price=Math.round(Number(chatPrice||0)*100)/100;
  const astrologerRate=Math.max(0,Math.min(100,Number(settings?.astrologerRate??20)));
  const adminRate=Math.round((100-astrologerRate)*100)/100;
  const astrologerAmount=Math.round(price*astrologerRate)/100;
  const adminAmount=Math.round((price-astrologerAmount)*100)/100;
  return {privateAstrologerCommissionRate:astrologerRate,privateAdminCommissionRate:adminRate,astrologerAmount,adminAmount};
}
async function addAdminPrivateNotification(type,title,message,consultationId,extra={}){
  try{
    await db.collection("smv_admin_notifications").add({
      type,title,message,consultationId:String(consultationId||""),read:false,
      source:"private_consultation",...extra,createdAt:FieldValue.serverTimestamp()
    });
  }catch(e){console.warn("Admin private notification write skipped:",e?.message||e);}
}
async function getPrivateConsultWorkflow(){
  try{
    const s=await db.collection("smv_settings").doc("privateConsultationWorkflow").get();
    const d=s.exists?s.data()||{}:{};
    return {allowWithoutAdminApproval:d.allowWithoutAdminApproval===true,minimumAnswerWords:Math.max(1,Math.min(10000,Number(d.minimumAnswerWords||20)))};
  }catch(_e){return {allowWithoutAdminApproval:false,minimumAnswerWords:20};}
}
app.post("/admin/private-consultation/set-commission",express.json({limit:"5kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const astrologerRate=Number(req.body?.astrologerRate);
  if(!Number.isFinite(astrologerRate)||astrologerRate<0||astrologerRate>100)return res.status(400).json({error:"Astrologer commission must be between 0 and 100."});
  const adminRate=Math.round((100-astrologerRate)*100)/100;
  await db.collection("smv_settings").doc("privateConsultationCommission").set({astrologerRate,adminRate,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});

  // One-time backward credit/backfill: only paid, answered, approved, customer-viewed,
  // non-refunded consultations that have not already been credited.
  const snap=await db.collection("smv_private_consultations").get();
  let backfilled=0,skipped=0;
  for(const d of snap.docs){
    const c=d.data()||{},id=d.id;
    const eligible=c.paymentStatus==="paid"&&c.status==="answered"&&c.answerStatus==="approved"&&!!c.customerViewedAt&&!c.refundId&&String(c.commissionStatus||"")!=="credited";
    if(!eligible){skipped++;continue;}
    const amounts=privateCommissionSnapshot(c.chatPrice||c.amount,{astrologerRate});
    const earningId="SMV-PC-EARN-"+id,earningRef=db.collection("smv_payments").doc(earningId);
    await db.runTransaction(async tx=>{
      const fresh=await tx.get(d.ref),e=await tx.get(earningRef);if(!fresh.exists)return;
      const fc=fresh.data()||{};if(String(fc.commissionStatus||"")==="credited"||e.exists)return;
      tx.set(earningRef,{paymentId:earningId,type:"astrologer_earning",source:"private_consultation_backfill",customerId:fc.customerId||null,astrologerId:fc.astrologerId,consultationId:id,questionId:null,question:fc.question||"Private Consultation",grossAmount:Number(fc.chatPrice||fc.amount||0),commissionPercent:amounts.privateAstrologerCommissionRate,commissionAmount:amounts.astrologerAmount,earningAmount:amounts.astrologerAmount,adminCommissionAmount:amounts.adminAmount,status:"credited",paymentStatus:"pending_withdrawal",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
      tx.update(d.ref,{...amounts,commissionStatus:"credited",commissionCreditedAt:FieldValue.serverTimestamp(),astrologerPaymentId:earningId,astrologerCreditedAmount:amounts.astrologerAmount,adminCommissionStatus:"credited",adminCommissionCreditedAt:FieldValue.serverTimestamp(),adminCreditedAmount:amounts.adminAmount,commissionBackfilled:true,updatedAt:FieldValue.serverTimestamp()});
    });
    backfilled++;
  }
  await addAdminPrivateNotification("private_commission_setting","Private Consultation Commission Updated",`Global Private Consultation commission set to Astrologer ${astrologerRate}% / Admin ${adminRate}%. Eligible past viewed consultations backfilled: ${backfilled}.`,"",{astrologerRate,adminRate,backfilled});
  return res.json({success:true,astrologerRate,adminRate,backfilled,skipped});
});
app.post("/admin/private-consultation/set-word-count",express.json({limit:"5kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const n=Math.round(Number(req.body?.minimumAnswerWords));
  if(!Number.isFinite(n)||n<1||n>10000)return res.status(400).json({error:"Minimum answer words must be between 1 and 10000."});
  await db.collection("smv_settings").doc("privateConsultationWorkflow").set({minimumAnswerWords:n,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});
  return res.json({success:true,minimumAnswerWords:n});
});
app.post("/admin/private-consultation/set-workflow",express.json({limit:"5kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const allow=req.body?.allowWithoutAdminApproval===true;
  await db.collection("smv_settings").doc("privateConsultationWorkflow").set({allowWithoutAdminApproval:allow,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid},{merge:true});
  return res.json({success:true,allowWithoutAdminApproval:allow});
});
app.post("/admin/private-consultation/approve-question",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id);
  const s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});
  const c=s.data()||{};if(c.paymentStatus!=="paid")return res.status(409).json({error:"Payment is not verified."});
  if(c.status!=="pending_admin_approval")return res.status(409).json({error:"This private consultation is not waiting for question approval."});
  await ref.update({status:"approved_for_astrologer",allocationStatus:"selected_astrologer",questionApprovedAt:FieldValue.serverTimestamp(),questionApprovedBy:user.uid,commissionStatus:"pending_answer",updatedAt:FieldValue.serverTimestamp()});
  await db.collection("smv_notifications").add({userId:c.astrologerId,type:"private_question_assigned",title:"New Private Consultation",message:"Admin approved a paid private consultation selected for you.",consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await db.collection("smv_notifications").add({userId:c.customerId,type:"private_question_approved",title:"Private consultation question approved",message:`Your private consultation question has been approved and sent to ${c.astrologerName||"the selected astrologer"}.`,consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await addAdminPrivateNotification("private_question_approved","Private Question Approved",`Question from ${c.customerName||"Customer"} was approved for ${c.astrologerName||"the selected astrologer"}.`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
  setImmediate(async()=>{
    const customerEmail=await resolveCustomerEmail(c),astrologerEmail=await resolveAstrologerEmail(c);
    await Promise.allSettled([
      sendEventEmailOnce({eventKey:`private:${id}:question_approved_customer`,to:[customerEmail],subject:"SMV ASTRO — Private Consultation Approved",text:`Your private consultation question has been approved and sent to ${c.astrologerName||"your selected astrologer"}.\n\nConsultation ID: ${id}`,context:{consultationId:id,event:"question_approved_customer"}}),
      sendEventEmailOnce({eventKey:`private:${id}:question_assigned_astrologer`,to:[astrologerEmail],subject:"SMV ASTRO — New Paid Private Consultation",text:`Admin approved a paid private consultation selected for you.\n\nConsultation ID: ${id}\nCustomer: ${c.customerName||"Customer"}`,context:{consultationId:id,event:"question_assigned_astrologer"}})
    ]);
  });
  return res.json({success:true,consultationId:id});
});
async function privateConsultRefund(id,reason,user){
  const ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();
  if(!s.exists)throw Object.assign(new Error("Private consultation not found."),{httpStatus:404});
  const c=s.data()||{};if(c.paymentStatus!=="paid"||!c.razorpayPaymentId)throw Object.assign(new Error("No verified Razorpay payment exists."),{httpStatus:409});
  if(c.refundId){
    const rr=await razorpay.refunds.fetch(c.refundId),refs=bankReferences(rr,c);
    await ref.set({refundStatus:String(rr.status||"pending"),...refs,refundSyncedAt:FieldValue.serverTimestamp()},{merge:true});
    return {success:true,consultationId:id,refundId:rr.id,refundStatus:rr.status,...refs};
  }
  const amount=Math.round(Number(c.chatPrice||c.amount||0)*100);
  const payment=await razorpay.payments.fetch(c.razorpayPaymentId);
  if(payment.order_id!==c.razorpayOrderId)throw Object.assign(new Error("Payment/order mismatch."),{httpStatus:409});
  const digest=crypto.createHash("sha256").update("private:"+id+":"+c.razorpayPaymentId+":"+amount).digest("hex").slice(0,32);
  const response=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(c.razorpayPaymentId)+"/refund",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(RAZORPAY_KEY_ID+":"+RAZORPAY_KEY_SECRET).toString("base64"),"Content-Type":"application/json","X-Refund-Idempotency":"smv-private-"+digest},body:JSON.stringify({amount,speed:"normal",receipt:"SMV-PC-"+digest,notes:{consultationId:id}}),signal:AbortSignal.timeout(25000)});
  const rr=await response.json();if(!response.ok)throw Object.assign(new Error(rr?.error?.description||"Razorpay refund failed."),{httpStatus:502});
  const refs=bankReferences(rr,c);
  await ref.set({status:"question_rejected",allocationStatus:"rejected_by_admin",refundReason:reason,refundId:rr.id,refundStatus:String(rr.status||"pending"),refundAmount:Number(rr.amount||amount)/100,...refs,refundCreatedAt:FieldValue.serverTimestamp(),commissionStatus:"refund_pending",adminQuestionRejectedAt:FieldValue.serverTimestamp(),adminQuestionRejectedBy:user.uid,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  await db.collection("smv_notifications").add({userId:c.customerId,type:"private_question_rejected",title:"Private consultation question rejected",message:`Your private consultation question was rejected by Admin. Refund ₹${(Number(rr.amount||amount)/100).toFixed(2)} has been initiated. Reason: ${reason}`,consultationId:id,refundId:rr.id,createdAt:FieldValue.serverTimestamp(),read:false});
  await addAdminPrivateNotification("private_question_rejected","Private Question Rejected / Refund",`Private question from ${c.customerName||"Customer"} was rejected. Refund ₹${(Number(rr.amount||amount)/100).toFixed(2)} initiated.`,id,{customerId:c.customerId,astrologerId:c.astrologerId,refundId:rr.id});
  return {success:true,consultationId:id,refundId:rr.id,refundStatus:rr.status,...refs};
}
app.post("/admin/private-consultation/reject-question",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{const id=String(req.body?.consultationId||"").trim(),reason=String(req.body?.reason||"").trim();if(!id||!reason)return res.status(400).json({error:"Consultation ID and reason are required."});return res.json(await privateConsultRefund(id,reason,user));}
  catch(e){const id=String(req.body?.consultationId||"").trim();if(id)await db.collection("smv_private_consultations").doc(id).set({status:"question_rejected",refundStatus:"failed",refundReason:String(req.body?.reason||"Question rejected by Admin"),refundLastError:String(e.message||e),refundLastAttemptAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});return res.status(e.httpStatus||500).json({error:e.message||"Private consultation refund failed."});}
});
app.post("/admin/private-consultation/retry-refund",express.json({limit:"10kb"}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
 try{const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});const c=s.data()||{};if(c.refundId)return res.status(409).json({error:"Refund ID already exists. Use Sync Razorpay Refund."});return res.json(await privateConsultRefund(id,String(c.refundReason||"Question rejected by Admin"),user));}
 catch(e){const id=String(req.body?.consultationId||"").trim();if(id)await db.collection("smv_private_consultations").doc(id).set({refundStatus:"failed",refundLastError:String(e.message||e),refundLastAttemptAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});return res.status(e.httpStatus||500).json({error:e.message||"Private refund retry failed."});}
});
app.post("/admin/private-consultation/sync-refund",express.json({limit:"10kb"}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
 try{const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});const c=s.data()||{};if(!c.refundId)return res.status(409).json({error:"Refund ID is not available. Use Retry Refund."});
 const rr=await razorpay.refunds.fetch(c.refundId),refs=bankReferences(rr,c),status=String(rr.status||"pending"),patch={refundStatus:status,...refs,refundSyncedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};if(["processed","completed"].includes(status.toLowerCase()))patch.refundProcessedAt=FieldValue.serverTimestamp();await ref.set(patch,{merge:true});
 return res.json({success:true,consultationId:id,refundId:rr.id,refundStatus:status,...refs});
 }catch(e){return res.status(502).json({error:e.message||"Unable to sync Razorpay refund."});}
});
app.get("/astrologer/private-consultations",async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  const a=await db.collection("smv_astrologers").doc(user.uid).get();if(!a.exists||!["approved","active"].includes(String(a.data()?.status||"").toLowerCase()))return res.status(403).json({error:"Approved astrologer access required."});
  const snap=await db.collection("smv_private_consultations").where("astrologerId","==",user.uid).get();
  const allItems=snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.paymentStatus==="paid");
  const items=allItems.filter(c=>!["pending_admin_approval","question_rejected"].includes(String(c.status||"")));
  const history=allItems.filter(c=>{
    const st=String(c.status||"");
    return st==="question_rejected" || st==="revision_required" || st==="answer_pending_admin_approval" || st==="answered" || !!c.customerViewedAt || String(c.commissionStatus||"")==="credited";
  });
  const privateWorkflow=await getPrivateConsultWorkflow();
  return res.json({success:true,consultations:items,history,settings:{minimumAnswerWords:privateWorkflow.minimumAnswerWords,allowWithoutAdminApproval:privateWorkflow.allowWithoutAdminApproval,privateCommission:await getPrivateCommissionSettings()}});
});
app.post("/astrologer/private-consultation/submit-answer",express.json({limit:"30kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  const id=String(req.body?.consultationId||"").trim(),answer=String(req.body?.answer||"").trim();
  const ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});
  const c=s.data()||{};if(c.astrologerId!==user.uid)return res.status(403).json({error:"This private consultation is assigned to another astrologer."});
  if(c.customerViewedAt||c.commissionStatus==="credited")return res.status(409).json({error:"Customer has already viewed this answer. Editing is closed."});
  if(!["approved_for_astrologer","revision_required","answer_pending_admin_approval","answered"].includes(String(c.status||"")))return res.status(409).json({error:"This consultation is not available for answering or editing."});
  const wf=await getPrivateConsultWorkflow(),minimumWords=wf.minimumAnswerWords||20,wordCount=answer.split(/\s+/).filter(Boolean).length;
  if(!id||wordCount<minimumWords)return res.status(400).json({error:`Enter an answer of at least ${minimumWords} words.`,minimumAnswerWords:minimumWords,wordCount});
  const direct=wf.allowWithoutAdminApproval===true;
  await updateEditableAnswer(ref,"customerViewedAt",{answer,status:direct?"answered":"answer_pending_admin_approval",answerStatus:direct?"approved":"pending_admin_approval",answerSubmittedAt:FieldValue.serverTimestamp(),answerLastEditedAt:FieldValue.serverTimestamp(),answerAvailableAt:direct?(c.answerAvailableAt||c.answerApprovedAt||c.answerSubmittedAt||FieldValue.serverTimestamp()):FieldValue.delete(),commissionStatus:"pending_customer_view",updatedAt:FieldValue.serverTimestamp()});
  if(!direct)await addAdminPrivateNotification("private_answer_waiting","Private Answer Waiting for Approval",`${c.astrologerName||"Selected astrologer"} submitted an answer for ${c.customerName||"Customer"}.`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
  else await addAdminPrivateNotification("private_answer_auto_allowed","Private Answer Auto Allowed",`${c.astrologerName||"Selected astrologer"} submitted an answer for ${c.customerName||"Customer"}; Auto Allow released it directly.`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
  await db.collection("smv_notifications").add({userId:c.customerId,type:direct?"private_answer_ready":"private_answer_submitted",title:direct?"Private consultation answer ready":"Astrologer answer submitted",message:direct?`${c.astrologerName||"Your astrologer"} submitted your private consultation answer. It is ready to view.`:`${c.astrologerName||"Your astrologer"} submitted an answer. It is waiting for Admin approval.`,consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  setImmediate(async()=>{
    const customerEmail=await resolveCustomerEmail(c), astrologerEmail=await resolveAstrologerEmail(c);
    if(direct){
      const mail=answerReadyEmail({customerName:c.customerName||"Customer",astrologerName:c.astrologerName||"Astrologer",question:c.question,questionId:id,answer});
      await sendEventEmailOnce({eventKey:`private:${id}:answer_ready:${String(c.answerSubmittedAt?.toMillis?.()||Date.now())}`,to:[customerEmail],replyTo:ADMIN_EMAIL||astrologerEmail||customerEmail,subject:mail.subject,text:mail.text,html:mail.html,context:{consultationId:id,event:"answer_ready"}});
    } else {
      await sendEventEmailOnce({eventKey:`private:${id}:answer_waiting_admin`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — Private Answer Waiting for Approval",text:`${c.astrologerName||"Astrologer"} submitted an answer for ${c.customerName||"Customer"}.\n\nConsultation ID: ${id}`,context:{consultationId:id,event:"answer_waiting_admin"}});
    }
  });
  return res.json({success:true,consultationId:id,status:direct?"answered":"answer_pending_admin_approval",minimumAnswerWords:minimumWords,wordCount});
});
app.post("/admin/private-consultation/approve-answer",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});
  const c=s.data()||{};if(!String(c.answer||"").trim())return res.status(409).json({error:"No answer is waiting."});
  if(c.status!=="answer_pending_admin_approval")return res.status(409).json({error:"This answer is not waiting for Admin approval."});
  await ref.update({status:"answered",answerStatus:"approved",answerAvailableAt:FieldValue.serverTimestamp(),answerApprovedAt:FieldValue.serverTimestamp(),answerApprovedBy:user.uid,commissionStatus:"pending_customer_view",updatedAt:FieldValue.serverTimestamp()});
  await db.collection("smv_notifications").add({userId:c.customerId,type:"private_answer_ready",title:"Private consultation answer ready",message:`Admin approved the answer from ${c.astrologerName||"your selected astrologer"}. Your answer is ready to view.`,consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await db.collection("smv_notifications").add({userId:c.astrologerId,type:"private_answer_approved",title:"Private consultation answer approved",message:"Admin approved your private consultation answer. Earnings remain pending until the customer views the answer.",consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await addAdminPrivateNotification("private_answer_approved","Private Answer Approved",`Answer from ${c.astrologerName||"Selected astrologer"} for ${c.customerName||"Customer"} was approved.`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
  setImmediate(async()=>{
    const customerEmail=await resolveCustomerEmail(c), astrologerEmail=await resolveAstrologerEmail(c);
    const mail=answerReadyEmail({customerName:c.customerName||"Customer",astrologerName:c.astrologerName||"Astrologer",question:c.question,questionId:id,answer:c.answer});
    await sendEventEmailOnce({eventKey:`private:${id}:answer_approved`,to:[customerEmail],replyTo:ADMIN_EMAIL||astrologerEmail||customerEmail,subject:mail.subject,text:mail.text,html:mail.html,context:{consultationId:id,event:"answer_approved"}});
  });
  return res.json({success:true,consultationId:id});
});
app.post("/admin/private-consultation/reject-answer",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const id=String(req.body?.consultationId||"").trim(),reason=String(req.body?.reason||"").trim();if(!id||!reason)return res.status(400).json({error:"Consultation ID and reason are required."});
  const ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});
  const c=s.data()||{};if(!String(c.answer||"").trim())return res.status(409).json({error:"No answer is waiting."});
  await ref.update({status:"revision_required",answerStatus:"rejected",answerRejectionReason:reason,answerRejectedAt:FieldValue.serverTimestamp(),answerRejectedBy:user.uid,commissionStatus:"answer_rejected_no_credit",commissionCreditedAt:FieldValue.delete(),adminCommissionCreditedAt:FieldValue.delete(),updatedAt:FieldValue.serverTimestamp()});
  await db.collection("smv_notifications").add({userId:c.astrologerId,type:"private_answer_rejected",title:"Private consultation answer revision required",message:"Admin rejected your answer. No earning has been credited. Reason: "+reason,consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await db.collection("smv_notifications").add({userId:c.customerId,type:"private_answer_revision",title:"Private answer revision in progress",message:`Admin requested a revision from ${c.astrologerName||"your selected astrologer"}. The revised answer will be shown after approval.`,consultationId:id,createdAt:FieldValue.serverTimestamp(),read:false});
  await addAdminPrivateNotification("private_answer_rejected","Private Answer Rejected — Revision Required",`Answer from ${c.astrologerName||"Selected astrologer"} was rejected for revision. Reason: ${reason}`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
  return res.json({success:true,consultationId:id,status:"revision_required"});
});


// SMV ASTRO OFFER & PROMOTION ENGINE
// Server is authoritative for eligibility and final payable amount. The browser may
// request a quote, but Razorpay orders are always created from this server-side result.
const OFFER_COLLECTION = "smv_offers";
const OFFER_AUDIT_COLLECTION = "smv_offer_audit";
const BUILTIN_WELCOME_ID = "builtin_welcome_first_question"; // legacy ID retained for existing Firestore data

function offerText(v, max=160){ return String(v == null ? "" : v).trim().slice(0,max); }
function offerMoney(v){ const n=Number(v); return Number.isFinite(n) ? Math.round(n*100)/100 : null; }
function offerDateMs(v){
  if(!v) return null;
  if(typeof v.toMillis === "function") return v.toMillis();
  const raw=String(v).trim();
  if(!raw) return null;
  // Admin uses <input type="datetime-local">, so saved values have no timezone.
  // SMV ASTRO offer schedules are India-local times. Parse the same way as the
  // public offer-banner endpoint so banner eligibility and payment eligibility
  // become active at the exact same instant.
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)){
    const n=Date.parse(raw+"+05:30");
    return Number.isFinite(n)?n:null;
  }
  const n=Date.parse(raw);
  return Number.isFinite(n)?n:null;
}
let builtinWelcomeReady=null;
function ensureBuiltinWelcomeOffer(){
 if(!builtinWelcomeReady)builtinWelcomeReady=migrateBuiltinWelcomeOffer().catch(e=>{builtinWelcomeReady=null;throw e;});
 return builtinWelcomeReady;
}
async function migrateBuiltinWelcomeOffer(){
  const ref=db.collection(OFFER_COLLECTION).doc(BUILTIN_WELCOME_ID), snap=await ref.get();
  if(!snap.exists){
    await ref.set({
      id:BUILTIN_WELCOME_ID,name:"₹1 New Customer Welcome Offer",kind:"welcome",enabled:false,
      automatic:true,promoCode:"",discountType:"fixed_price",offerPrice:1,eligibility:"new_customer",
      appliesTo:["public_question","private_consultation"],usageRule:"first_paid_service",perCustomerLimit:1,totalUsageLimit:0,
      minimumAmount:1,displayMode:"payment_only",bannerText:"Welcome Offer Applied — First Paid Service ₹1",
      builtIn:true,priority:100,usedCount:0,successfulPayments:0,totalDiscountGiven:0,
      createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
    });
  }else{
    // Keep Admin ON/OFF state and statistics, but migrate the built-in offer to
    // first-paid-service semantics across Ask Question OR Private Consultation.
    await ref.set({
      name:"₹1 New Customer Welcome Offer",kind:"welcome",automatic:true,promoCode:"",
      discountType:"fixed_price",offerPrice:1,eligibility:"new_customer",
      appliesTo:["public_question","private_consultation"],usageRule:"first_paid_service",
      perCustomerLimit:1,totalUsageLimit:0,minimumAmount:1,builtIn:true,priority:100,
      bannerText:"Welcome Offer Applied — First Paid Service ₹1",updatedAt:FieldValue.serverTimestamp()
    },{merge:true});
  }
}
async function customerPaidCount(uid, service){
  if(service==="private_consultation"){
    const s=await db.collection("smv_private_consultations").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get();
    return s.empty?0:1;
  }
  const s=await db.collection("smv_questions").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get();
  return s.empty?0:1;
}
async function customerHasAnyPaidService(uid){
  const [questions,privateConsultations]=await Promise.all([
    db.collection("smv_questions").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get(),
    db.collection("smv_private_consultations").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get()
  ]);
  return !questions.empty || !privateConsultations.empty;
}
async function offerUsageCount(uid, offerId, maximum=1){
  const s=await db.collection(OFFER_AUDIT_COLLECTION).where("customerId","==",uid).where("offerId","==",offerId).where("status","==","used").limit(Math.max(1,Math.floor(maximum))).get();
  return s.size;
}
function computeOfferPrice(original, offer){
  let final=original;
  const type=String(offer.discountType||"fixed_price");
  if(type==="fixed_price") final=Number(offer.offerPrice);
  else if(type==="percentage") final=original-(original*Math.max(0,Math.min(100,Number(offer.discountValue||0)))/100);
  else if(type==="flat") final=original-Math.max(0,Number(offer.discountValue||0));
  if(!Number.isFinite(final)) return null;
  return Math.max(1,Math.round(final*100)/100);
}
async function resolveOfferForCustomer({uid,service,originalAmount,promoCode}){
  const original=offerMoney(originalAmount), code=offerText(promoCode,40).toUpperCase();
  if(original==null||original<1) throw new Error("Invalid original price.");
  const now=Date.now();
  const [snap,questionPaid,privatePaid]=await Promise.all([
    db.collection(OFFER_COLLECTION).where("enabled","==",true).get(),
    db.collection("smv_questions").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get(),
    db.collection("smv_private_consultations").where("customerId","==",uid).where("paymentStatus","==","paid").limit(1).get()
  ]);
  const paidBefore=service==="private_consultation"?(privatePaid.empty?0:1):(questionPaid.empty?0:1);
  const hasAnyPaidService=!questionPaid.empty||!privatePaid.empty;
  const candidates=[];
  for(const d of snap.docs){
    const o={id:d.id,...d.data()};
    const services=Array.isArray(o.appliesTo)?o.appliesTo:[String(o.appliesTo||"public_question")];
    if(!services.includes(service)&&!services.includes("all")) continue;
    const start=offerDateMs(o.startAt), end=offerDateMs(o.endAt);
    if(start&&now<start)continue;if(end&&now>end)continue;
    if(Number(o.minimumAmount||0)>original)continue;
    if(Number(o.totalUsageLimit||0)>0&&Number(o.usedCount||0)>=Number(o.totalUsageLimit))continue;
    const eligibility=String(o.eligibility||"all");
    // Built-in ₹1 Welcome is available only before the customer's first successful
    // paid service of either type. Other offers retain service-specific eligibility.
    if(o.id===BUILTIN_WELCOME_ID){if(hasAnyPaidService)continue;}
    else{
      if(eligibility==="new_customer"&&paidBefore>0)continue;
      if(eligibility==="existing_customer"&&paidBefore===0)continue;
    }
    const oCode=offerText(o.promoCode,40).toUpperCase();
    // Automatic offers never require a promo code. A stale code saved on an
    // older automatic offer is ignored. Manual offers always require an exact code.
    if(o.automatic===true){ /* eligible automatically */ }
    else { if(!oCode || !code || code!==oCode) continue; }
    const final=computeOfferPrice(original,o);if(final==null||final>=original)continue;
    candidates.push({...o,finalAmount:final,discountAmount:Math.round((original-final)*100)/100});
  }
  // Strict priority: built-in ₹1 welcome -> explicit promo -> automatic seasonal -> normal price.
  candidates.sort((a,b)=>{
    const rank=o=>o.id===BUILTIN_WELCOME_ID?300:(offerText(o.promoCode,40)?200:100)+Number(o.priority||0);
    return rank(b)-rank(a) || a.finalAmount-b.finalAmount;
  });
  let best=null;
  for(const candidate of candidates){
    const limit=Number(candidate.perCustomerLimit||0);
    if(limit>0 && await offerUsageCount(uid,candidate.id,limit)>=limit)continue;
    best=candidate;break;
  }
  return best?{originalAmount:original,finalAmount:best.finalAmount,discountAmount:best.discountAmount,offerId:best.id,offerName:best.name||"Offer",automatic:best.automatic===true,promoCode:best.automatic===true?"":offerText(best.promoCode,40).toUpperCase(),displayMode:best.displayMode||"payment_only",bannerText:best.bannerText||"Offer applied",kind:best.kind||"promotion"}:{originalAmount:original,finalAmount:original,discountAmount:0,offerId:null,offerName:null,automatic:false,promoCode:code||"",displayMode:"hidden",bannerText:"",kind:null};
}
async function consumeOfferAfterPayment({uid,service,referenceId,paymentId,quote}){
  if(!quote?.offerId)return;
  const auditRef=db.collection(OFFER_AUDIT_COLLECTION).doc(`${service}_${referenceId}`);
  await db.runTransaction(async tx=>{
    const audit=await tx.get(auditRef);if(audit.exists&&audit.data()?.status==="used")return;
    const offerRef=db.collection(OFFER_COLLECTION).doc(quote.offerId), offerSnap=await tx.get(offerRef);
    tx.set(auditRef,{customerId:uid,service,referenceId,paymentId:paymentId||null,offerId:quote.offerId,offerName:quote.offerName||null,promoCode:quote.promoCode||"",originalAmount:Number(quote.originalAmount||0),finalAmount:Number(quote.finalAmount||0),discountAmount:Number(quote.discountAmount||0),status:"used",usedAt:FieldValue.serverTimestamp(),createdAt:FieldValue.serverTimestamp()},{merge:true});
    if(offerSnap.exists)tx.set(offerRef,{usedCount:FieldValue.increment(1),successfulPayments:FieldValue.increment(1),totalDiscountGiven:FieldValue.increment(Number(quote.discountAmount||0)),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
}
app.post("/offers/quote",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  try{
    const service=String(req.body?.service||"public_question");
    let original=Number(req.body?.originalAmount||0);
    if(service==="public_question"){const q=await db.collection("smv_settings").doc("question").get();original=Number(q.data()?.price||0);}
    const quote=await resolveOfferForCustomer({uid:user.uid,service,originalAmount:original,promoCode:req.body?.promoCode});
    return res.json({success:true,...quote});
  }catch(e){return res.status(400).json({error:e?.message||"Unable to calculate offer."});}
});

// Public homepage offer banners.
// Payment eligibility/final amount remain server-verified separately.
let publicOfferBannerCache={expiresAt:0,offers:null};
app.get("/offers/public-banners", async (req, res) => {
  try {
    const now = Date.now();
    if(Array.isArray(publicOfferBannerCache.offers)&&publicOfferBannerCache.expiresAt>now){res.set("Cache-Control","no-store, no-cache, must-revalidate");return res.json({success:true,offers:publicOfferBannerCache.offers,cached:true});}
    const bannerDateMs = (v) => {
      if (!v) return null;
      if (typeof v.toMillis === "function") return v.toMillis();
      const raw = String(v).trim();
      if (!raw) return null;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)) {
        const n = Date.parse(raw + "+05:30");
        return Number.isFinite(n) ? n : null;
      }
      const n = Date.parse(raw);
      return Number.isFinite(n) ? n : null;
    };
    const bannerDateIso = (v) => {
      const ms = bannerDateMs(v);
      return ms === null ? null : new Date(ms).toISOString();
    };
    const snap = await sharedPublicRead("banners",()=>db.collection(OFFER_COLLECTION).where("enabled","==",true).limit(50).get());
    const offers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => {
        const enabled = o.enabled === true || String(o.enabled).toLowerCase() === "true";
        if (!enabled) return false;
        // Homepage banner follows the Admin enabled state + active date window.
        // displayMode is payment/UI metadata and must not silently suppress an enabled banner.
        const start = bannerDateMs(o.startAt), end = bannerDateMs(o.endAt);
        if (start !== null && now < start) return false;
        if (end !== null && now > end) return false;
        return !!offerText(o.bannerText || o.name, 240);
      })
      .sort((a,b) => Number(b.priority || 0) - Number(a.priority || 0))
      .map(o => ({
        id:o.id,name:offerText(o.name,120),
        bannerText:offerText(o.bannerText||o.name,240),
        promoCode:o.automatic===true?"":offerText(o.promoCode,40),
        bannerTheme:offerText(o.bannerTheme||"auto",30),
        discountType:offerText(o.discountType,24),
        offerPrice:Number(o.offerPrice||0),
        discountValue:Number(o.discountValue||0),
        automatic:o.automatic===true,displayMode:offerText(o.displayMode||"payment_only",30),startAt:bannerDateIso(o.startAt),endAt:bannerDateIso(o.endAt)
      }));
    publicOfferBannerCache={expiresAt:now+60000,offers};
    res.set("Cache-Control","no-store, no-cache, must-revalidate");
    return res.json({success:true,offers,activeOfferCount:offers.length});
  } catch(e) {
    console.error("Public offer banner load failed:",e);
    return res.status(500).json({success:false,offers:[],error:"Unable to load offers."});
  }
});

app.get("/admin/offers",async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  await ensureBuiltinWelcomeOffer();const s=await db.collection(OFFER_COLLECTION).get();
  return res.json({success:true,offers:s.docs.map(d=>({id:d.id,...d.data()}))});
});
app.post("/admin/offers/save",express.json({limit:"30kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  try{
    const b=req.body||{}, requested=offerText(b.id,80), id=requested||db.collection(OFFER_COLLECTION).doc().id, builtIn=id===BUILTIN_WELCOME_ID;
    const promo=offerText(b.promoCode,40).toUpperCase().replace(/[^A-Z0-9_-]/g,"");
    const discountType=["fixed_price","percentage","flat"].includes(String(b.discountType))?String(b.discountType):"fixed_price";
    const applies=Array.isArray(b.appliesTo)?b.appliesTo.filter(x=>["public_question","private_consultation","all"].includes(String(x))):["public_question"];
    const automatic=builtIn?true:b.automatic===true;
    if(!builtIn && !automatic && !promo)return res.status(400).json({error:"Promo Code is required when Automatic Offer is NO."});
    const allowedThemes=["welcome","vinayagar_chaturthi","karthigai_deepam","thaipusam","new_year","onam","christmas","eid","auto","generic","pongal","diwali","navaratri","dasara","ayudha_pooja","shivaratri","tamil_new_year"];
    const bannerTheme=allowedThemes.includes(String(b.bannerTheme||"auto"))?String(b.bannerTheme||"auto"):"auto";
    const data={name:offerText(b.name,120)||"Promotion",kind:builtIn?"welcome":offerText(b.kind,30)||"promotion",enabled:b.enabled===true,automatic,promoCode:(builtIn||automatic)?"":promo,bannerTheme,discountType,offerPrice:offerMoney(b.offerPrice),discountValue:offerMoney(b.discountValue)||0,eligibility:["new_customer","existing_customer","all"].includes(String(b.eligibility))?String(b.eligibility):"all",appliesTo:applies.length?applies:["public_question"],usageRule:offerText(b.usageRule,30)||"one_per_customer",perCustomerLimit:Math.max(0,Math.floor(Number(b.perCustomerLimit||0))),totalUsageLimit:Math.max(0,Math.floor(Number(b.totalUsageLimit||0))),minimumAmount:Math.max(0,Number(b.minimumAmount||0)),displayMode:["hidden","home_banner","customer_dashboard","payment_only","home_dashboard"].includes(String(b.displayMode))?String(b.displayMode):"payment_only",bannerText:offerText(b.bannerText,240),startAt:b.startAt?String(b.startAt):null,endAt:b.endAt?String(b.endAt):null,priority:Number(b.priority||0),builtIn,updatedAt:FieldValue.serverTimestamp(),updatedBy:user.uid};
    if(discountType==="fixed_price"&&(!Number.isFinite(data.offerPrice)||data.offerPrice<1))return res.status(400).json({error:"Fixed offer price must be at least ₹1."});
    const ref=db.collection(OFFER_COLLECTION).doc(id);
    const before=await ref.get();
    const writeData={...data};
    if(!before.exists)writeData.createdAt=FieldValue.serverTimestamp();
    await ref.set(writeData,{merge:true});
    // Read back the exact persisted document. This prevents the Admin UI from
    // reporting success when the values were not actually stored.
    const savedSnap=await ref.get();
    if(!savedSnap.exists)return res.status(500).json({error:"Offer save verification failed."});
    const saved={id:savedSnap.id,...savedSnap.data()};
    publicOfferBannerCache={expiresAt:0,offers:null};
    return res.json({success:true,id,saved});
  }catch(e){return res.status(400).json({error:e?.message||"Unable to save offer."});}
});
app.post("/admin/offers/delete",express.json({limit:"10kb"}),async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;if(!(await isAdminUser(user)))return res.status(403).json({error:"Admin access denied."});
  const id=offerText(req.body?.id,80);if(!id)return res.status(400).json({error:"Offer ID required."});
  if(id===BUILTIN_WELCOME_ID)return res.status(409).json({error:"Built-in ₹1 Welcome Offer cannot be deleted. Disable it instead."});
  await db.collection(OFFER_COLLECTION).doc(id).delete();
  publicOfferBannerCache={expiresAt:0,offers:null};
  return res.json({success:true});
});

app.post("/private-consultation/create-order", express.json({limit:"30kb"}), async (req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  try{
    const customerProfileSnap=await db.collection("smv_users").doc(user.uid).get();
    const customerRole=String(customerProfileSnap.exists?(customerProfileSnap.data()?.role||"customer"):"customer").toLowerCase();
    if(customerRole!=="customer")return res.status(403).json({error:"Customer Login Required — Please login with a Customer account to start a private consultation."});
    const astrologerId=String(req.body?.astrologerId||"").trim();
    const customerName=String(req.body?.customerName||req.body?.birthDetails?.name||"").trim();
    const question=String(req.body?.question||"").trim();
    const birth=req.body?.birthDetails||{};
    if(!astrologerId||!customerName||!question||!birth.birthDate||!birth.birthTime||!String(birth.birthPlace||"").trim())
      return res.status(400).json({error:"Complete astrologer, birth details and question are required."});
    const aSnap=await db.collection("smv_astrologers").doc(astrologerId).get();
    if(!aSnap.exists)return res.status(404).json({error:"Selected astrologer was not found."});
    const a=aSnap.data()||{};
    if(!["approved","active"].includes(String(a.status||"").toLowerCase()))
      return res.status(409).json({error:"Selected astrologer is not currently approved."});
    const originalChatPrice=Number(a.pricePerQuestion||0);
    if(!Number.isFinite(originalChatPrice)||originalChatPrice<1)return res.status(409).json({error:"This astrologer's Chat Price is not available."});
    const [offerQuote,privateCommission]=await Promise.all([resolveOfferForCustomer({uid:user.uid,service:"private_consultation",originalAmount:originalChatPrice,promoCode:req.body?.promoCode}),getPrivateCommissionSettings()]);
    const chatPrice=offerQuote.finalAmount;
    const commissionSnapshot=privateCommissionSnapshot(chatPrice,privateCommission);
    const {privateAstrologerCommissionRate,privateAdminCommissionRate,astrologerAmount,adminAmount}=commissionSnapshot;
    const ref=db.collection("smv_private_consultations").doc();
    const consultationId=ref.id;
    const order=await razorpay.orders.create({
      amount:Math.round(chatPrice*100),currency:"INR",
      receipt:`SMV_PC_${consultationId.slice(0,20)}_${Date.now()}`,
      notes:{consultationId,customerId:user.uid,astrologerId}
    });
    await ref.set({
      consultationId,customerId:user.uid,customerEmail:user.email||null,customerName,question,
      astrologerId,astrologerName:String(a.name||"Astrologer"),
      chatPrice,originalChatPrice,offerId:offerQuote.offerId||null,offerName:offerQuote.offerName||null,offerPromoCode:offerQuote.promoCode||"",offerDiscountAmount:offerQuote.discountAmount||0,offerBannerText:offerQuote.bannerText||"",offerDisplayMode:offerQuote.displayMode||"hidden",privateAstrologerCommissionRate,privateAdminCommissionRate,adminAmount,astrologerAmount,
      amount:chatPrice,status:"awaiting_payment",paymentStatus:"order_created",allocationStatus:"selected_astrologer",
      birthDetails:{name:customerName,birthDate:String(birth.birthDate),birthTime:String(birth.birthTime),birthPlace:String(birth.birthPlace).trim(),birthGender:String(birth.birthGender||""),timezone:"Asia/Kolkata",utcOffsetMinutes:330},
      razorpayOrderId:order.id,paymentCurrency:"INR",createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
    });
    res.json({success:true,consultationId,orderId:order.id,keyId:RAZORPAY_KEY_ID,amount:order.amount,currency:order.currency,originalAmount:offerQuote.originalAmount,offerId:offerQuote.offerId||null,offerName:offerQuote.offerName||null,promoCode:offerQuote.promoCode||"",discountAmount:offerQuote.discountAmount||0,offerBannerText:offerQuote.bannerText||""});
    setImmediate(async()=>{
      const customerEmail=String(user.email||await getUserEmail(user.uid)||"").trim();
      await Promise.allSettled([
        sendEventEmailOnce({eventKey:`private:${consultationId}:question_submitted`,to:[customerEmail],subject:"SMV ASTRO — Private Consultation Request Received",text:`We received your private consultation request for ${a.name||"your selected astrologer"}.\n\nConsultation ID: ${consultationId}\nComplete payment to submit it for processing.`,context:{consultationId,event:"question_submitted"}}),
        sendEventEmailOnce({eventKey:`private:${consultationId}:question_submitted_admin`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — New Private Consultation Created",text:`A customer created a private consultation.\n\nConsultation ID: ${consultationId}\nCustomer: ${customerName}\nAstrologer: ${a.name||"Astrologer"}\nPayment status: awaiting payment`,context:{consultationId,event:"question_submitted_admin"}}),
        addAdminEventNotification("private_question_created","New Private Consultation Created",`${customerName} created private consultation ${consultationId}; payment is awaiting.`,{consultationId,astrologerId})
      ]);
    });
    setImmediate(()=>db.collection("razorpay_orders").doc(order.id).set({
      razorpayOrderId:order.id,consultationId,amount:order.amount,currency:order.currency,
      firebaseUid:user.uid,customerEmail:user.email||null,astrologerId,serviceName:"Private Astrology Consultation",
      status:"created",createdAt:FieldValue.serverTimestamp()
    }).catch(e=>console.error("Private Razorpay order audit failed:",e)));
    return;
  }catch(e){console.error("Private consultation create-order error:",e);return res.status(500).json({error:e?.error?.description||e?.message||"Unable to create private consultation payment."});}
});

app.post("/private-consultation/retry-payment",express.json({limit:"10kb"}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;
 try{const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});const c=s.data()||{};
 if(c.customerId!==user.uid)return res.status(403).json({error:"You do not own this private consultation."});if(c.paymentStatus==="paid")return res.status(409).json({error:"This consultation is already paid."});if(c.refundId||c.status==="question_rejected")return res.status(409).json({error:"Rejected/refunded consultations cannot be repaid."});
 const price=Number(c.chatPrice||c.amount||0);if(!Number.isFinite(price)||price<1)return res.status(409).json({error:"Saved Chat Price is invalid."});
 const order=await razorpay.orders.create({amount:Math.round(price*100),currency:c.paymentCurrency||"INR",receipt:`SMV_PC_R_${id.slice(0,18)}_${Date.now()}`,notes:{consultationId:id,customerId:user.uid,astrologerId:c.astrologerId,retry:"true"}});
 await ref.set({razorpayOrderId:order.id,paymentStatus:"order_created",status:"awaiting_payment",paymentRetryCount:FieldValue.increment(1),lastPaymentAttemptAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
 return res.json({success:true,consultationId:id,orderId:order.id,keyId:RAZORPAY_KEY_ID,amount:order.amount,currency:order.currency,chatPrice:price});
 }catch(e){return res.status(500).json({error:e?.error?.description||e?.message||"Unable to retry payment."});}
});
app.post("/private-consultation/cancel-payment",express.json({limit:"10kb"}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});const c=s.data()||{};
 if(c.customerId!==user.uid)return res.status(403).json({error:"You do not own this private consultation."});if(c.paymentStatus==="paid")return res.status(409).json({error:"Payment is already completed."});
 await ref.set({paymentStatus:"cancelled",status:"awaiting_payment",paymentCancelledAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});return res.json({success:true});
});
app.post("/private-consultation/recover-payment",express.json({limit:"10kb"}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;
 try{const id=String(req.body?.consultationId||"").trim(),ref=db.collection("smv_private_consultations").doc(id),s=await ref.get();if(!s.exists)return res.status(404).json({error:"Private consultation not found."});const c=s.data()||{};
 if(c.customerId!==user.uid)return res.status(403).json({error:"You do not own this private consultation."});if(c.paymentStatus==="paid")return res.json({success:true,recovered:true,alreadyPaid:true});
 if(!c.razorpayOrderId)return res.status(409).json({error:"No Razorpay order is available to recover."});
 const list=await razorpay.orders.fetchPayments(c.razorpayOrderId),expected=Math.round(Number(c.chatPrice||c.amount||0)*100),captured=(list?.items||[]).find(p=>p.status==="captured"&&Number(p.amount)===expected);
 if(!captured)return res.json({success:true,recovered:false});
 const wf=await getPrivateConsultWorkflow(),auto=wf.allowWithoutAdminApproval===true;
 await ref.set({paymentStatus:"paid",status:auto?"approved_for_astrologer":"pending_admin_approval",allocationStatus:"selected_astrologer",questionApprovalBypassed:auto,razorpayPaymentId:captured.id,paidAt:FieldValue.serverTimestamp(),paymentRecoveredAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
 await addAdminPrivateNotification("private_payment_recovered","Private Consultation Payment Recovered",`${c.customerName||"Customer"} payment ₹${Number(c.chatPrice||c.amount||0).toFixed(2)} recovered from Razorpay.`,id,{customerId:c.customerId,astrologerId:c.astrologerId});
 return res.json({success:true,recovered:true,consultationId:id,paymentId:captured.id});
 }catch(e){return res.status(500).json({error:e?.message||"Unable to recover payment."});}
});
app.post("/private-consultation/verify-payment", express.json({limit:"15kb"}), async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  try{
    const consultationId=String(req.body?.consultationId||"").trim();
    const orderId=String(req.body?.razorpay_order_id||"").trim();
    const paymentId=String(req.body?.razorpay_payment_id||"").trim();
    const signature=String(req.body?.razorpay_signature||"").trim();
    if(!consultationId||!orderId||!paymentId||!signature)return res.status(400).json({error:"Payment verification data is incomplete."});
    const ref=db.collection("smv_private_consultations").doc(consultationId);
    const snap=await ref.get();if(!snap.exists)return res.status(404).json({error:"Private consultation not found."});
    const c=snap.data()||{};
    if(c.customerId!==user.uid)return res.status(403).json({error:"You do not own this private consultation."});
    if(c.razorpayOrderId!==orderId)return res.status(409).json({error:"Payment order mismatch."});
    const expected=crypto.createHmac("sha256",RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    if(!signatureEqual(expected,signature))return res.status(400).json({error:"Payment signature verification failed."});
    let verifiedPayment=await razorpay.payments.fetch(paymentId);
    const expectedAmount=Math.round(Number(c.chatPrice||c.amount||0)*100);
    if(String(verifiedPayment.order_id||"")!==orderId)return res.status(409).json({error:"Razorpay payment/order mismatch."});
    if(Number(verifiedPayment.amount)!==expectedAmount)return res.status(409).json({error:"Razorpay payment amount mismatch."});
    if(String(verifiedPayment.currency||'')!=='INR')return res.status(409).json({error:'Payment currency mismatch.'});
    if(verifiedPayment.status==='authorized'){
      try{verifiedPayment=await razorpay.payments.capture(paymentId,expectedAmount,'INR');}
      catch(e){verifiedPayment=await razorpay.payments.fetch(paymentId);}
    }
    if(verifiedPayment.status!=='captured')return res.status(409).json({error:'Payment capture is pending. Use Recover Payment to check again.'});
    if(c.paymentStatus!=="paid"){
      const privateWorkflow=await getPrivateConsultWorkflow();
      const autoAllow=privateWorkflow.allowWithoutAdminApproval===true;
      await ref.update({
        paymentStatus:"paid",status:autoAllow?"approved_for_astrologer":"pending_admin_approval",allocationStatus:"selected_astrologer",
        questionApprovalBypassed:autoAllow,
        razorpayPaymentId:paymentId,razorpaySignature:signature,paidAt:FieldValue.serverTimestamp(),
        paymentRecordedAt:new Date().toISOString(),updatedAt:FieldValue.serverTimestamp()
      });
      const finalStatus=autoAllow?"approved_for_astrologer":"pending_admin_approval";
      res.json({success:true,verified:true,consultationId,paymentId,paymentRecordedAt:new Date().toISOString(),status:finalStatus,paymentStatus:"paid"});
      setImmediate(async()=>{
        try{
          await Promise.allSettled([
            consumeOfferAfterPayment({uid:user.uid,service:"private_consultation",referenceId:consultationId,paymentId,quote:{offerId:c.offerId||null,offerName:c.offerName||null,promoCode:c.offerPromoCode||"",originalAmount:Number(c.originalChatPrice||c.chatPrice||c.amount||0),finalAmount:Number(c.chatPrice||c.amount||0),discountAmount:Number(c.offerDiscountAmount||0)}}),
            addAdminPrivateNotification("private_payment_received","Private Consultation Payment Received",`${c.customerName||"Customer"} paid ₹${Number(c.chatPrice||c.amount||0).toFixed(2)} for ${c.astrologerName||"the selected astrologer"}.`,consultationId,{customerId:c.customerId,astrologerId:c.astrologerId}),
            db.collection("smv_notifications").add({userId:c.customerId,type:"private_consultation_payment",title:"Private consultation payment successful",message:autoAllow?`Your private consultation is now visible to ${c.astrologerName||"the selected astrologer"}.`:`Your private consultation with ${c.astrologerName||"the selected astrologer"} is waiting for Admin approval.`,consultationId,createdAt:FieldValue.serverTimestamp(),read:false})
          ]);
          const customerEmail=await resolveCustomerEmail(c), astrologerEmail=await resolveAstrologerEmail(c);
          const amount=Number(c.chatPrice||c.amount||0);
          await Promise.allSettled([
            sendEventEmailOnce({eventKey:`private:${consultationId}:payment_success:${paymentId}`,to:[customerEmail],subject:"SMV ASTRO — Private Consultation Payment Successful",replyTo:ADMIN_EMAIL,text:`Your private consultation payment was successful.\n\nConsultation ID: ${consultationId}\nAmount: ₹${amount.toFixed(2)}\nPayment ID: ${paymentId}\n\n${autoAllow?"Your consultation is now available to your selected astrologer.":"Your consultation is waiting for Admin approval."}`,context:{consultationId,paymentId,event:"payment_success"}}),
            sendEventEmailOnce({eventKey:`private:${consultationId}:payment_admin:${paymentId}`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — Private Consultation Payment Received",text:`Private consultation payment received.\n\nConsultation ID: ${consultationId}\nCustomer: ${c.customerName||"Customer"}\nAstrologer: ${c.astrologerName||"Astrologer"}\nAmount: ₹${amount.toFixed(2)}\nPayment ID: ${paymentId}`,context:{consultationId,paymentId,event:"payment_admin"}}),
            autoAllow?sendEventEmailOnce({eventKey:`private:${consultationId}:astrologer_new_paid:${paymentId}`,to:[astrologerEmail],subject:"SMV ASTRO — New Paid Private Consultation",text:`A paid private consultation is now available to you.\n\nConsultation ID: ${consultationId}\nCustomer: ${c.customerName||"Customer"}`,context:{consultationId,paymentId,event:"astrologer_new_paid"}}):Promise.resolve(),
            addAdminEventNotification("private_payment_received","Private Consultation Payment Received",`${c.customerName||"Customer"} paid ₹${amount.toFixed(2)} for ${c.astrologerName||"the selected astrologer"}.`,{consultationId,paymentId})
          ]);
        }catch(e){console.error("Post-verification private bookkeeping failed:",e);}
      });
      return;
    }
    return res.json({success:true,verified:true,consultationId,paymentId,paymentRecordedAt:c.paymentRecordedAt||null,status:String(c.status||"pending_admin_approval"),paymentStatus:"paid"});
  }catch(e){console.error("Private consultation verify-payment error:",e);return res.status(500).json({error:e?.message||"Unable to verify private consultation payment."});}
});


// V61 — Admin-controlled paid Horoscope features. Price is always read server-side.
const HOROSCOPE_FEATURE_DOC='horoscope_features';
async function getHoroscopeFeatureSettings(){const snap=await db.collection('smv_settings').doc(HOROSCOPE_FEATURE_DOC).get(),d=snap.exists?(snap.data()||{}):{};return {advanced_analysis:{enabled:d.advancedAnalysisEnabled!==false,price:Math.max(0,Number(d.advancedAnalysisPrice||0))},marriage_matching:{enabled:d.marriageMatchingEnabled!==false,price:Math.max(0,Number(d.marriageMatchingPrice||0))}};}
function horoscopeFeatureKey(v){v=String(v||'').trim().toLowerCase();return ['advanced_analysis','marriage_matching'].includes(v)?v:'';}
const HoroscopeReportIdentity=require('./public/horoscope/report-identity.js');
function horoscopeReportContext(req,feature){
 const input=req.method==='GET'?JSON.parse(String(req.query?.birthIdentity||'null')):req.body?.birthIdentity;
 const canonical=HoroscopeReportIdentity.canonical(feature,input);
 return {birthIdentity:JSON.parse(canonical),reportKey:crypto.createHash('sha256').update(canonical).digest('hex')};
}
app.get('/horoscope-feature/config',async(req,res)=>{try{return res.json({success:true,features:await getHoroscopeFeatureSettings()});}catch(e){return res.status(500).json({error:'Unable to load horoscope feature settings.'});}});
// V65 — Horoscope-local auth check. One profile read only when the user explicitly logs in.
app.get('/horoscope-auth/session',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{if(!user.email_verified)return res.status(403).json({error:'Verify your email before using paid horoscope services.'});const snap=await db.collection('smv_users').doc(user.uid).get();const d=snap.exists?(snap.data()||{}):{},role=String(d.role||'').toLowerCase();if(role!=='customer')return res.status(403).json({error:'A Customer account is required for Horoscope payment.'});return res.json({success:true,uid:user.uid,email:user.email||'',role:'customer'});}catch(e){return res.status(500).json({error:'Unable to verify Customer account.'});}});
function horoscopePaymentMode(){return RAZORPAY_KEY_ID.startsWith('rzp_live_')?'live':RAZORPAY_KEY_ID.startsWith('rzp_test_')?'test':'invalid';}
function horoscopeModeMatches(d){return !d.razorpayMode||d.razorpayMode===horoscopePaymentMode();}
async function recoverHoroscopePurchase(ref,d){
 if(!horoscopeModeMatches(d))return false;
 if(d.paymentStatus==='paid'&&d.razorpayMode===horoscopePaymentMode())return true;
 const ids=[...new Set([d.razorpayOrderId,d.previousRazorpayOrderId,...Object.keys(d.orderAttempts||{})].filter(Boolean))];
 for(const id of ids){
  const quote=d.orderAttempts?.[id];if(quote?.mode&&quote.mode!==horoscopePaymentMode())continue;
  const order=await razorpay.orders.fetch(id);
  const expected=quote?Number(quote.amountPaise):id===d.razorpayOrderId?Number(d.amountPaise):Number(order.amount);
  if(order.status!=='paid'||Number(order.amount_paid)!==expected||String(order.currency)!=='INR')continue;
  await ref.set({paymentStatus:'paid',razorpayOrderId:id,amountPaise:expected,recoveredFromPaidOrder:true,razorpayMode:horoscopePaymentMode(),paidAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});return true;
 }
 return false;
}
function smvIdentityScalar(obj,names){
 const wanted=new Set(names.map(x=>String(x).toLowerCase()));let found;
 (function walk(v){if(found!==undefined||v==null)return;if(Array.isArray(v)){for(const x of v)walk(x);return;}if(typeof v!=='object')return;for(const [k,x] of Object.entries(v)){if(wanted.has(String(k).toLowerCase())&&x!==''&&x!=null){found=x;return;}}for(const x of Object.values(v))walk(x);})(obj);
 return found;
}
function smvBirthCore(identity){
 const date=String(smvIdentityScalar(identity,['date','dob','birthdate','birth_date'])||'').trim();
 const time=String(smvIdentityScalar(identity,['time','tob','birthtime','birth_time'])||'').trim().replace(/:\d{2}(?:\.\d+)?$/,'');
 const lat=Number(smvIdentityScalar(identity,['lat','latitude'])),lon=Number(smvIdentityScalar(identity,['lon','lng','longitude']));
 if(!date||!time||!Number.isFinite(lat)||!Number.isFinite(lon))return '';
 return `${date}|${time}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
}
function smvSamePaidBirth(feature,a,b){
 if(feature==='marriage_matching')return false; // marriage has two people; exact canonical identity remains mandatory.
 const x=smvBirthCore(a),y=smvBirthCore(b);return !!x&&x===y;
}
async function resolveHoroscopePaidPurchase(uid,feature,reportKey,birthIdentity){
 const target=db.collection('smv_horoscope_purchases').doc(`${uid}_${feature}_${reportKey}`),exact=await target.get();
 if(exact.exists){
  const exactData=exact.data()||{};
  if(await recoverHoroscopePurchase(target,exactData)){const fresh=(await target.get()).data()||exactData;return {ref:target,data:fresh,relinked:false};}
  // V106 quota guard: if this exact report already has a pending/failed purchase document,
  // do not scan up to 50 other purchases. The current identity is authoritative.
  return null;
 }
 // V104 recovery is retained only when the exact report document does not exist. This keeps
 // legacy differently-shaped paid identities recoverable without multiplying reads on every unpaid access check.
 // Only relink a verified payment when immutable birth date/time/coordinates are the same.
 const candidates=await db.collection('smv_horoscope_purchases').where('userId','==',uid).limit(50).get();
 for(const doc of candidates.docs){const d=doc.data()||{};if(d.feature!==feature||!smvSamePaidBirth(feature,d.birthIdentity,birthIdentity))continue;if(!await recoverHoroscopePurchase(doc.ref,d))continue;
  const fresh=(await doc.ref.get()).data()||d;
  await target.set({...fresh,userId:uid,feature,reportKey,birthIdentity,paymentStatus:'paid',relinkedFromReportKey:String(fresh.reportKey||doc.id),relinkedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  console.log('[HOROSCOPE-PAYMENT] relinked verified paid birth identity',{feature,reportKey,from:String(fresh.reportKey||doc.id)});
  return {ref:target,data:fresh,relinked:true};
 }
 return null;
}
async function unresolvedLegacyHoroscope(uid,feature){const ref=db.collection('smv_horoscope_purchases').doc(`${uid}_${feature}`),snap=await ref.get();if(!snap.exists)return false;const d=snap.data();return !d.migratedReportKey&&(d.paymentStatus==='paid'||await recoverHoroscopePurchase(ref,d));}
app.post('/admin/horoscope-feature/link-legacy',express.json({limit:'20kb'}),async(req,res)=>{const adminUser=await requireUser(req,res);if(!adminUser)return;if(!(await isAdminUser(adminUser)))return res.status(403).json({error:'Admin access required.'});try{const uid=String(req.body?.customerUid||''),feature=horoscopeFeatureKey(req.body?.feature);if(!uid||uid.includes('/')||!feature)return res.status(400).json({error:'Customer and feature are required.'});const {reportKey,birthIdentity}=horoscopeReportContext(req,feature),oldRef=db.collection('smv_horoscope_purchases').doc(`${uid}_${feature}`),target=db.collection('smv_horoscope_purchases').doc(`${uid}_${feature}_${reportKey}`),old=await oldRef.get();if(!old.exists||!await recoverHoroscopePurchase(oldRef,old.data()))return res.status(409).json({error:'No verified legacy payment.'});await db.runTransaction(async tx=>{const snap=await tx.get(oldRef),d=snap.data();if(d.migratedReportKey&&d.migratedReportKey!==reportKey)throw Error('Legacy payment already linked.');tx.set(target,{...d,userId:uid,feature,reportKey,birthIdentity,paymentStatus:'paid',legacyLinkedBy:adminUser.uid,legacyLinkedAt:FieldValue.serverTimestamp()},{merge:true});tx.set(oldRef,{migratedReportKey:reportKey},{merge:true});});return res.json({success:true,reportKey});}catch(e){return res.status(409).json({error:e.message||'Legacy payment could not be linked.'});}});
app.get('/horoscope-feature/access',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{
 const f=horoscopeFeatureKey(req.query?.feature);if(!f)return res.status(400).json({error:'Invalid horoscope feature.'});
 if(f==='marriage_matching'&&String(req.query?.preinput||'')==='1'){const cfg=(await getHoroscopeFeatureSettings())[f];if(!cfg.enabled)return res.json({success:true,feature:f,enabled:false,unlocked:true,free:true,price:cfg.price});if(cfg.price<=0)return res.json({success:true,feature:f,enabled:true,unlocked:true,free:true,price:0});const pre=await db.collection('smv_horoscope_purchases').doc(`${user.uid}_${f}_preinput`).get(),d=pre.exists?(pre.data()||{}):{};return res.json({success:true,feature:f,enabled:true,unlocked:pre.exists&&d.paymentStatus==='paid'&&horoscopeModeMatches(d)&&!d.claimedReportKey,price:cfg.price,paymentId:d.razorpayPaymentId||''});}
 const {reportKey,birthIdentity}=horoscopeReportContext(req,f);
 const cfg=(await getHoroscopeFeatureSettings())[f];if(!cfg.enabled)return res.json({success:true,feature:f,enabled:false,unlocked:false,price:cfg.price});
 if(cfg.price<=0)return res.json({success:true,feature:f,enabled:true,unlocked:true,free:true,price:0});
 const resolved=await resolveHoroscopePaidPurchase(user.uid,f,reportKey,birthIdentity);
 const d=resolved?.data||{},unlocked=!!resolved;
 // A legacy feature-level purchase has no trustworthy birth identity. It must never
 // unlock or block a different birth chart. Admin can link that old purchase to its
 // original birth details separately; every new report identity remains independently payable.
 return res.json({success:true,feature:f,enabled:true,unlocked,price:cfg.price,paymentId:d.razorpayPaymentId||''});
 }catch(e){console.error('Horoscope access',e);return res.status(503).json({error:'Unable to restore paid access. Please retry; do not pay again.'});}});
app.post('/horoscope-feature/create-order',express.json({limit:'20kb'}),async(req,res)=>{
 const user=await requireUser(req,res);if(!user)return;
 try{
  const f=horoscopeFeatureKey(req.body?.feature);if(!f)return res.status(400).json({error:'Invalid horoscope feature.'});
  const mode=horoscopePaymentMode();if(mode==='invalid')return res.status(503).json({error:'Razorpay is not configured.'});
  const preinput=f==='marriage_matching'&&req.body?.preinput===true;
  const {reportKey,birthIdentity}=preinput?{reportKey:'preinput',birthIdentity:{preinput:true}}:horoscopeReportContext(req,f);
 const cfg=(await getHoroscopeFeatureSettings())[f];if(!cfg.enabled)return res.status(403).json({error:'This horoscope feature is unavailable.'});
  if(cfg.price<=0)return res.json({success:true,feature:f,free:true,unlocked:true,amount:0});
  const amount=Math.round(cfg.price*100),id=`${user.uid}_${f}_${reportKey}`,ref=db.collection('smv_horoscope_purchases').doc(id),snap=await ref.get(),old=snap.exists?(snap.data()||{}):{};
  if(await recoverHoroscopePurchase(ref,old))return res.json({success:true,feature:f,alreadyPaid:true,unlocked:true,amount});
  // Unresolved legacy payments are not matched to this report identity; do not block a new chart.
  const attempt=Math.max(0,Number(old.paymentAttempt||0))+1,nonce=`${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
  const receipt=`SMVH-${crypto.createHash('sha1').update(`${id}|${nonce}`).digest('hex').slice(0,28)}`;
  const order=await razorpay.orders.create({amount,currency:'INR',receipt,notes:{uid:user.uid,feature:f,reportKey,attempt:String(attempt)}});
  // Keep each attempt's ownership and quoted amount immutable. A late success must remain verifiable.
  await db.collection('smv_horoscope_orders').doc(order.id).set({userId:user.uid,feature:f,reportKey,birthIdentity,amountPaise:amount,currency:'INR',razorpayMode:mode,createdAt:FieldValue.serverTimestamp()});
  const alreadyPaid=await db.runTransaction(async tx=>{const latest=await tx.get(ref),d=latest.exists?latest.data():{};if(d.paymentStatus==='paid'&&horoscopeModeMatches(d))return true;
   tx.set(ref,{userId:user.uid,feature:f,reportKey,birthIdentity,amount:cfg.price,amountPaise:amount,currency:'INR',razorpayOrderId:order.id,orderAttempts:{...(d.orderAttempts||{}),[order.id]:{amountPaise:amount,mode}},previousRazorpayOrderId:old.razorpayOrderId||'',paymentAttempt:attempt,paymentStatus:'pending',razorpayMode:mode,updatedAt:FieldValue.serverTimestamp(),createdAt:old.createdAt||FieldValue.serverTimestamp()},{merge:true});return false;});
  if(alreadyPaid)return res.json({success:true,feature:f,alreadyPaid:true,unlocked:true,amount});
  return res.json({success:true,feature:f,orderId:order.id,keyId:RAZORPAY_KEY_ID,amount:order.amount,currency:order.currency,mode,attempt});
 }catch(e){console.error('Horoscope order',e);return res.status(503).json({error:'Unable to prepare payment safely. Retry after access is restored.'});}
});
app.post('/horoscope-feature/verify-payment',express.json({limit:'20kb'}),async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{
 const f=horoscopeFeatureKey(req.body?.feature),orderId=String(req.body?.razorpay_order_id||''),paymentId=String(req.body?.razorpay_payment_id||''),signature=String(req.body?.razorpay_signature||'');
 if(!f||!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||!signature)return res.status(400).json({error:'Complete payment verification data is required.'});
 const preinput=f==='marriage_matching'&&req.body?.preinput===true;
 const {reportKey,birthIdentity}=preinput?{reportKey:'preinput',birthIdentity:{preinput:true}}:horoscopeReportContext(req,f);
 const ref=db.collection('smv_horoscope_purchases').doc(`${user.uid}_${f}_${reportKey}`),attemptRef=db.collection('smv_horoscope_orders').doc(orderId);
 const [snap,attempt]=await Promise.all([ref.get(),attemptRef.get()]);const purchase=snap.exists?snap.data():{},d=attempt.exists?attempt.data():purchase;
 if((attempt.exists&&(d.userId!==user.uid||d.feature!==f||d.reportKey!==reportKey))||(!attempt.exists&&d.razorpayOrderId!==orderId)||!horoscopeModeMatches(d))return res.status(409).json({error:'Payment order does not belong to this account, feature or payment mode.'});
 const amount=Number(d.amountPaise);if(!Number.isSafeInteger(amount)||amount<100)return res.status(409).json({error:'Invalid quoted payment amount.'});
 const expected=crypto.createHmac('sha256',RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');if(!signatureEqual(expected,signature))return res.status(400).json({error:'Payment signature verification failed.'});
 let payment=await razorpay.payments.fetch(paymentId);if(payment.order_id!==orderId||Number(payment.amount)!==amount||payment.currency!=='INR')return res.status(409).json({error:'Razorpay payment details do not match the quoted order.'});
 if(payment.status==='authorized'){try{payment=await razorpay.payments.capture(paymentId,amount,'INR');}catch(_){payment=await razorpay.payments.fetch(paymentId);}}
 if(payment.status!=='captured')return res.status(409).json({error:'Payment capture is pending. Do not pay again.'});
 await ref.set({userId:user.uid,feature:f,reportKey,birthIdentity,paymentStatus:'paid',amountPaise:amount,razorpayOrderId:orderId,razorpayPaymentId:paymentId,razorpayMode:horoscopePaymentMode(),paidAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
 return res.json({success:true,verified:true,feature:f,unlocked:true,paymentId});
 }catch(e){console.error('Horoscope verify',e);return res.status(503).json({error:'Payment verification could not finish. Restore access before attempting another payment.'});}});

// V95 — Marriage payment can be completed before exposing birth-entry fields.
// The verified pre-input payment is claimed exactly once by the first complete bride/groom identity.
app.post('/horoscope-feature/claim-marriage-payment',express.json({limit:'20kb'}),async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{
 const f='marriage_matching',{reportKey,birthIdentity}=horoscopeReportContext(req,f),preRef=db.collection('smv_horoscope_purchases').doc(`${user.uid}_${f}_preinput`),targetRef=db.collection('smv_horoscope_purchases').doc(`${user.uid}_${f}_${reportKey}`);
 await db.runTransaction(async tx=>{const [pre,target]=await Promise.all([tx.get(preRef),tx.get(targetRef)]);const p=pre.exists?(pre.data()||{}):{},t=target.exists?(target.data()||{}):{};if(t.paymentStatus==='paid'&&horoscopeModeMatches(t))return;if(!pre.exists||p.paymentStatus!=='paid'||!horoscopeModeMatches(p))throw Error('Verified marriage payment was not found.');if(p.claimedReportKey&&p.claimedReportKey!==reportKey)throw Error('This marriage payment is already linked to another pair.');tx.set(targetRef,{...p,userId:user.uid,feature:f,reportKey,birthIdentity,paymentStatus:'paid',claimedFromPreinput:true,updatedAt:FieldValue.serverTimestamp()},{merge:true});tx.set(preRef,{claimedReportKey:reportKey,claimedAt:FieldValue.serverTimestamp()},{merge:true});});
 return res.json({success:true,feature:f,unlocked:true,reportKey});
 }catch(e){return res.status(409).json({error:e.message||'Marriage payment could not be linked to these birth details.'});}});

// Versioned complete snapshots: one sync at login; opening locally makes no database reads.
const savedReportsFor=uid=>db.collection('smv_horoscope_saved').doc(uid).collection('reports');
app.get('/horoscope-reports',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{const snap=await savedReportsFor(user.uid).get();return res.json({reports:snap.docs.map(d=>({id:d.id,...d.data()}))});}catch(e){return res.status(503).json({error:'Saved reports could not sync. Your local copies remain available.'});}});
app.get('/horoscope-reports/:id',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{const id=String(req.params.id);if(!/^[a-f0-9]{64}$/.test(id))return res.status(400).json({error:'Invalid saved report.'});const ref=savedReportsFor(user.uid).doc(id),snap=await ref.get();if(!snap.exists)return res.status(404).json({error:'Saved report not found.'});const meta=snap.data(),parts=await Promise.all(Array.from({length:meta.chunks},(_,i)=>ref.collection('chunks').doc(meta.revision+'_'+i).get()));if(parts.some(p=>!p.exists))throw Error('Incomplete snapshot');return res.json({report:JSON.parse(parts.map(p=>p.data().text).join(''))});}catch(e){return res.status(503).json({error:'Saved report is incomplete. Retry synchronization.'});}});
app.post('/horoscope-reports',express.json({limit:'15mb'}),async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{
 const feature=horoscopeFeatureKey(req.body?.feature),{reportKey}=horoscopeReportContext(req,feature),report=req.body?.report;
 if(!report||report.owner!==user.uid||typeof report.html!=='string'||!['ta','en'].includes(report.language))return res.status(400).json({error:'Invalid report snapshot.'});
 const cfg=(await getHoroscopeFeatureSettings())[feature],resolvedPaid=await resolveHoroscopePaidPurchase(user.uid,feature,reportKey,JSON.parse(HoroscopeReportIdentity.canonical(feature,req.body?.birthIdentity)));
 const verified=!!resolvedPaid;
 if(cfg.enabled&&cfg.price>0&&!verified)return res.status(403).json({error:'Payment is required for these birth details.'});
 const safe={...report,id:reportKey,feature,owner:user.uid,paid:verified,birthIdentity:req.body.birthIdentity,savedAt:Date.now()},text=JSON.stringify(safe);
 if(Buffer.byteLength(text)>12000000)return res.status(413).json({error:'Report exceeds the saved report limit.'});
 const ref=savedReportsFor(user.uid).doc(reportKey),old=await ref.get(),revision=crypto.randomBytes(10).toString('hex'),chunks=[];
 // Bound UTF-8 byte size even for Tamil and supplementary characters.
 for(let i=0;i<text.length;i+=150000)chunks.push(text.slice(i,i+150000));
 const batch=db.batch();chunks.forEach((text,i)=>batch.set(ref.collection('chunks').doc(revision+'_'+i),{text}));
 batch.set(ref,{name:String(report.name||'Report').slice(0,160),feature,language:report.language,savedAt:safe.savedAt,revision,chunks:chunks.length,paid:verified});await batch.commit();
 if(old.exists){const previous=old.data();const cleanup=db.batch();for(let i=0;i<previous.chunks;i++)cleanup.delete(ref.collection('chunks').doc(previous.revision+'_'+i));await cleanup.commit();}
 return res.json({success:true,id:reportKey,savedAt:safe.savedAt,revision,paid:verified});
 }catch(e){console.error('Saved horoscope',e);return res.status(503).json({error:'Cloud save did not complete. Keep the local copy and retry sync.'});}});
app.delete('/horoscope-reports/:id',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;try{const id=String(req.params.id);if(!/^[a-f0-9]{64}$/.test(id))return res.status(400).json({error:'Invalid saved report.'});const ref=savedReportsFor(user.uid).doc(id),parts=await ref.collection('chunks').get(),batch=db.batch();parts.docs.forEach(d=>batch.delete(d.ref));batch.delete(ref);await batch.commit();await deleteSavedPdf(user.uid,id).catch(()=>{});return res.json({success:true});}catch(e){return res.status(503).json({error:'Delete did not sync. Retry when connected.'});}});

// V83 — Paid report PDFs: stream once to signed Cloudinary storage; Firestore stores metadata only.
// This deliberately removes the previous PDF Buffer.concat + base64 Firestore chunk path, which
// multiplied memory usage and was the root cause of the ~256 MB Render heap exhaustion.
function savedPdfRef(uid,id,lang='en'){return db.collection('smv_horoscope_saved_pdfs').doc(uid).collection('reports').doc(id+'_'+(lang==='ta'?'ta':'en'));}
async function readSavedPdf(uid,id,lang='en'){const snap=await savedPdfRef(uid,id,lang).get();return snap.exists?snap.data():null;}
function cloudPdfPublicId(uid,id,lang){return `smv-astro/private-reports/${crypto.createHash('sha256').update(uid).digest('hex').slice(0,20)}/${id}_${lang==='ta'?'ta':'en'}.pdf`;}
async function cloudPrivatePdfUrl(meta){
 if(!reportCloudReady())throw Error('Cloudinary report storage is not configured.');
 return cloudinary.utils.private_download_url(meta.publicId,'pdf',{resource_type:'raw',type:'private',expires_at:Math.floor(Date.now()/1000)+300});
}
async function pipeCloudPdf(meta,res,disposition='inline'){
 const url=await cloudPrivatePdfUrl(meta),upstream=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!upstream.ok||!upstream.body)throw Error(`Cloudinary PDF fetch failed (${upstream.status}).`);
 res.status(200);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`${disposition}; filename="SMV-ASTRO-Report.pdf"`);res.setHeader('Cache-Control','private, no-store');
 await new Promise((resolve,reject)=>{const src=Readable.fromWeb(upstream.body);src.once('error',reject);res.once('error',reject);res.once('finish',resolve);src.pipe(res);});
}
async function deleteSavedPdf(uid,id){
 for(const lang of ['en','ta']){const ref=savedPdfRef(uid,id,lang),snap=await ref.get();if(snap.exists){const d=snap.data();if(d.publicId&&reportCloudReady())await cloudinary.uploader.destroy(d.publicId,{resource_type:'raw',type:'private',invalidate:true}).catch(e=>console.warn('Cloudinary PDF delete:',e.message));await ref.delete();}}
}
async function requirePaidReport(req,res,f){const {reportKey,birthIdentity}=horoscopeReportContext(req,f),cfg=(await getHoroscopeFeatureSettings())[f];if(!cfg.enabled||cfg.price<=0){res.status(403).json({error:'PDF requires an enabled paid feature.'});return null;}const resolved=await resolveHoroscopePaidPurchase(req.smvUser.uid,f,reportKey,birthIdentity);if(!resolved){res.status(403).json({error:'Verified payment is required for this birth report. If payment just completed, retry once; do not pay again.'});return null;}return {reportKey,birthIdentity};}
app.get('/horoscope-reports/:id/pdf',async(req,res)=>{const user=await requireUser(req,res);if(!user)return;req.smvUser=user;try{const id=String(req.params.id||'');if(!/^[a-f0-9]{64}$/.test(id))return res.status(400).json({error:'Invalid PDF report.'});const lang=String(req.query?.lang||'en')==='ta'?'ta':'en',saved=await readSavedPdf(user.uid,id,lang);if(!saved?.publicId)return res.status(404).json({error:'PDF has not been generated yet.'});return await pipeCloudPdf(saved,res,'inline');}catch(e){console.error('Saved PDF read',e);if(!res.headersSent)return res.status(503).json({error:'Saved PDF could not be opened.'});}});
app.post('/horoscope-reports/:id/pdf',express.json({limit:'4mb'}),async(req,res)=>{const user=await requireUser(req,res);if(!user)return;req.smvUser=user;try{
 if(!reportCloudReady())return res.status(503).json({error:'PDF storage is not configured on the server.'});
 const f=horoscopeFeatureKey(req.body?.feature);if(!f)return res.status(400).json({error:'Invalid horoscope feature.'});const paid=await requirePaidReport(req,res,f);if(!paid)return;if(paid.reportKey!==String(req.params.id))return res.status(409).json({error:'Birth identity does not match the saved report.'});
 const PDF_RENDERER_VERSION='v106-html-css-bw-full-expanded-tamil-font';
 const lang=String(req.body?.language||req.query?.lang||'en').toLowerCase()==='ta'?'ta':'en',existing=await readSavedPdf(user.uid,paid.reportKey,lang);if(existing?.publicId&&existing?.rendererVersion===PDF_RENDERER_VERSION)return await pipeCloudPdf(existing,res,'inline');
 const html=String(req.body?.html||'').trim().slice(0,12000000);if(!html)return res.status(400).json({error:'Complete report HTML is empty.'});const defaultTitle=f==='marriage_matching'?(lang==='ta'?'SMV திருமண பொருத்த அறிக்கை':'SMV Marriage Matching Report'):(lang==='ta'?'SMV ஜாதக அறிக்கை':'SMV Horoscope Report'),title=String(req.body?.title||defaultTitle).trim().slice(0,120),publicId=cloudPdfPublicId(user.uid,paid.reportKey,lang);
 console.log('[PDF-CHROMIUM] start',{heapMB:Math.round(process.memoryUsage().heapUsed/1048576),rssMB:Math.round(process.memoryUsage().rss/1048576),htmlChars:html.length,feature:f,lang,renderer:PDF_RENDERER_VERSION});
 const tmpPdf=path.join('/tmp',`smv-${crypto.randomUUID()}.pdf`);
 const pdfBuffer=await renderHtmlPdf({title,language:lang,html});
 await fs.promises.writeFile(tmpPdf,pdfBuffer);
 const stat=await fs.promises.stat(tmpPdf);console.log('[PDF-CHROMIUM] rendered',{bytes:stat.size,feature:f,lang,renderer:PDF_RENDERER_VERSION});
 // V95: the user's PDF response must never wait for Cloudinary.  The completed local
 // PDF is streamed immediately; durable Cloudinary storage is a background step.  This
 // removes Cloudinary HTTP 499 from the interactive PDF-generation critical path.
 res.status(200);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','inline; filename="SMV-ASTRO-Report.pdf"');res.setHeader('Content-Length',String(stat.size));res.setHeader('Cache-Control','private, no-store');
 // V99: upload_large(localPath) returns an UploadStream, not the final upload result.
 // Resolve only from Cloudinary's completion callback so public_id/asset_id are available
 // and the temporary file stays alive until Cloudinary has finished reading it.
 const uploadLargePdf=(filePath,options)=>new Promise((resolve,reject)=>{
  let settled=false;
  const done=(err,result)=>{
   if(settled)return;
   if(err){settled=true;return reject(err);}
   // Chunked uploads can report intermediate done:false responses. Persist only the final one.
   if(result&&result.done===false)return;
   settled=true;resolve(result||{});
  };
  try{
   const stream=cloudinary.uploader.upload_large(filePath,options,done);
   if(stream&&typeof stream.once==='function')stream.once('error',err=>done(err));
  }catch(err){done(err);}
 });
 const isRetryableCloudError=(err)=>{
  const code=Number(err?.http_code||err?.statusCode||0);
  const name=String(err?.name||'').toLowerCase();
  const msg=String(err?.message||'').toLowerCase();
  return code===408||code===409||code===420||code===429||code>=500||name.includes('timeout')||msg.includes('timeout')||msg.includes('econnreset')||msg.includes('eai_again')||msg.includes('socket hang up');
 };
 const compactDefined=(obj)=>Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined));
 const persistPdf=async()=>{
  try{
   let uploaded=null;
   for(let attempt=1;attempt<=3;attempt++){
    try{
     console.log('[PDF-STORE] upload start',{attempt,bytes:stat.size,feature:f,lang,renderer:PDF_RENDERER_VERSION});
     uploaded=await uploadLargePdf(tmpPdf,{resource_type:'raw',type:'private',public_id:publicId,overwrite:true,upload_preset:CLOUDINARY_REPORT_UPLOAD_PRESET,context:`feature=${f}|language=${lang}`,chunk_size:6000000,timeout:180000});
     if(!uploaded?.public_id)throw Object.assign(new Error('Cloudinary upload completed without public_id.'),{nonRetryable:true});
     break;
    }catch(err){
     const retryable=!err?.nonRetryable&&isRetryableCloudError(err);
     console.warn('[PDF-STORE] upload failed',{attempt,retryable,message:err?.message||String(err),http_code:err?.http_code||null,name:err?.name||''});
     if(!retryable||attempt===3)throw err;
     await new Promise(r=>setTimeout(r,1500*attempt));
    }
   }
   // Firestore is deliberately outside the network retry loop. A validation error must not
   // re-upload the same PDF three times. Undefined optional values are omitted globally.
   const metadata=compactDefined({
    feature:f,language:lang,title,birthIdentity:paid.birthIdentity,
    publicId:uploaded?.public_id,assetId:uploaded?.asset_id||'',
    bytes:Number(uploaded?.bytes||stat.size),storage:'cloudinary_private_raw',
    rendererVersion:PDF_RENDERER_VERSION,updatedAt:FieldValue.serverTimestamp()
   });
   await savedPdfRef(user.uid,paid.reportKey,lang).set(metadata,{merge:true});
   console.log('[PDF-MEM] stored',{heapMB:Math.round(process.memoryUsage().heapUsed/1048576),rssMB:Math.round(process.memoryUsage().rss/1048576),bytes:metadata.bytes,feature:f,lang,renderer:PDF_RENDERER_VERSION,publicId:metadata.publicId});
  }catch(err){
   console.error('[PDF-STORE] durable save failed',{message:err?.message||String(err),http_code:err?.http_code||null,name:err?.name||''});
  }finally{
   // The response stream has already finished before persistPdf starts, and uploadLargePdf
   // does not resolve until Cloudinary is done reading. This is the only deletion point.
   await fs.promises.unlink(tmpPdf).catch(err=>{if(err?.code!=='ENOENT')console.warn('[PDF-STORE] temp cleanup failed',err?.message||String(err));});
  }
 };
 const src=fs.createReadStream(tmpPdf);
 src.once('error',err=>{console.error('[PDF-STREAM] local read failed',err);if(!res.headersSent)res.status(500).end();else res.destroy(err);});
 res.once('finish',()=>{console.log('[PDF-MEM] delivered',{bytes:stat.size,feature:f,lang,renderer:PDF_RENDERER_VERSION});void persistPdf();});
 src.pipe(res);
 return;
 }catch(e){console.error('Stored horoscope PDF error',e);if(!res.headersSent)return res.status(500).json({error:'Unable to generate and save PDF.'});}});

app.post("/create-order", express.json(), async (req, res) => {
  const razorpayMode = RAZORPAY_KEY_ID.startsWith('rzp_test_') ? 'test' : (RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'live' : 'invalid');
  if(razorpayMode === 'invalid'){
    return res.status(503).json({error:'Razorpay is not configured with a valid Test or Live key.',code:'RAZORPAY_KEY_INVALID',mode:'invalid'});
  }

  const user = await requireUser(req, res);
  if (!user) return;
  try {
    let questionId = String(req.body?.questionId || "").trim();
    let qRef;
    let q;
    let createdNow = false;
    if (!questionId) questionId = await nextQuestionId();

    // Create/read the question on the trusted server. The browser no longer calls
    // Firestore to create the question document, which eliminates the empty
    // documentPath error seen before Razorpay opened.
    if (questionId) {
      if (questionId.includes("/") || questionId === "." || questionId === "..") {
        return res.status(400).json({ error: "A valid questionId is required." });
      }
      qRef = db.collection("smv_questions").doc(questionId);
      const qSnap = await qRef.get();
      if (!qSnap.exists) {
        createdNow = true;
        const settingSnap = await db.collection("smv_settings").doc("question").get();
        const configuredPrice = Number(settingSnap.data()?.price || 5);
        const birth = req.body?.birthDetails || {};
        const customerName = String(req.body?.customerName || birth.name || "").trim();
        const questionText = String(req.body?.question || "").trim();
        if (!customerName || !questionText || !birth.birthDate || !birth.birthTime || !String(birth.birthPlace || "").trim()) {
          return res.status(400).json({ error: "Complete customer birth details and question are required." });
        }
        q = {
          customerId: user.uid, customerEmail: user.email || null, questionId, customerName, birthName: customerName, question: questionText,
          amount: configuredPrice, status: "awaiting_payment", paymentStatus: "pending",
          allocationStatus: "awaiting_admin",
          birthDetails: {
            name: customerName, birthDate: String(birth.birthDate), birthTime: String(birth.birthTime),
            birthPlace: String(birth.birthPlace).trim(), birthGender: String(birth.birthGender || ""),
            timezone: "Asia/Kolkata", utcOffsetMinutes: 330
          },
          birthDate: String(birth.birthDate), birthTime: String(birth.birthTime),
          birthPlace: String(birth.birthPlace).trim(), birthGender: String(birth.birthGender || ""),
          birthTimezone: "Asia/Kolkata", birthUtcOffsetMinutes: 330,
          createdAt: FieldValue.serverTimestamp()
        };
        await qRef.set(q);
      } else {
        q = qSnap.data();
        if (q.customerId !== user.uid) return res.status(403).json({ error: "You do not own this question." });
        if (String(q.questionId || "") !== questionId) {
          await qRef.set({ questionId }, { merge: true });
          q = { ...q, questionId };
        }
        // Preserve India wall-clock birth time. Never reinterpret a user-entered
        // HH:mm value as UTC and shift it by 5:30 hours.
        if (!q.birthTimezone || !q.birthUtcOffsetMinutes || !q.birthDetails?.timezone) {
          await qRef.set({
            birthTimezone: q.birthTimezone || "Asia/Kolkata",
            birthUtcOffsetMinutes: Number(q.birthUtcOffsetMinutes ?? 330),
            birthDetails: {
              ...(q.birthDetails || {}),
              timezone: q.birthDetails?.timezone || "Asia/Kolkata",
              utcOffsetMinutes: Number(q.birthDetails?.utcOffsetMinutes ?? 330)
            }
          }, { merge: true });
          q = {
            ...q,
            birthTimezone: q.birthTimezone || "Asia/Kolkata",
            birthUtcOffsetMinutes: Number(q.birthUtcOffsetMinutes ?? 330),
            birthDetails: {
              ...(q.birthDetails || {}),
              timezone: q.birthDetails?.timezone || "Asia/Kolkata",
              utcOffsetMinutes: Number(q.birthDetails?.utcOffsetMinutes ?? 330)
            }
          };
        }
      }
    } else {
      qRef = db.collection("smv_questions").doc();
      questionId = qRef.id;
      if (!questionId) return res.status(500).json({ error: "Unable to create a valid question ID." });

      const settingSnap = await db.collection("smv_settings").doc("question").get();
      const configuredPrice = Number(settingSnap.data()?.price || 5);
      if (!Number.isFinite(configuredPrice) || configuredPrice < 1) {
        return res.status(409).json({ error: "Question price is not configured correctly by Admin." });
      }

      const birth = req.body?.birthDetails || {};
      const customerName = String(req.body?.customerName || birth.name || "").trim();
      const questionText = String(req.body?.question || "").trim();
      if (!customerName || !questionText || !birth.birthDate || !birth.birthTime || !String(birth.birthPlace || "").trim()) {
        return res.status(400).json({ error: "Complete customer birth details and question are required." });
      }

      q = {
        customerId: user.uid,
        customerEmail: user.email || null,
        questionId,
        customerName,
        birthName: customerName,
        question: questionText,
        amount: configuredPrice,
        status: "awaiting_payment",
        paymentStatus: "pending",
        allocationStatus: "awaiting_admin",
        birthDetails: {
          name: customerName,
          birthDate: String(birth.birthDate),
          birthTime: String(birth.birthTime),
          birthPlace: String(birth.birthPlace).trim(),
          birthGender: String(birth.birthGender || "")
        },
        birthDate: String(birth.birthDate),
        birthTime: String(birth.birthTime),
        birthPlace: String(birth.birthPlace).trim(),
        birthGender: String(birth.birthGender || ""),
        birthTimezone: "Asia/Kolkata",
        birthUtcOffsetMinutes: 330,
        createdAt: FieldValue.serverTimestamp()
      };
      await qRef.set(q);
      createdNow = true;
    }

    if (!q || q.customerId !== user.uid) return res.status(403).json({ error: "You do not own this question." });
    // Apply offers only when this question is first created. Retry payments always keep
    // the amount already locked on the saved question.
    if(createdNow){
      const quote=await resolveOfferForCustomer({uid:user.uid,service:"public_question",originalAmount:Number(q.amount||0),promoCode:req.body?.promoCode});
      q={...q,amount:quote.finalAmount,originalAmount:quote.originalAmount,offerId:quote.offerId,offerName:quote.offerName,offerPromoCode:quote.promoCode||"",offerDiscountAmount:quote.discountAmount,offerBannerText:quote.bannerText||"",offerDisplayMode:quote.displayMode||"hidden"};
      await qRef.set({amount:q.amount,originalAmount:q.originalAmount,offerId:q.offerId||null,offerName:q.offerName||null,offerPromoCode:q.offerPromoCode||"",offerDiscountAmount:q.offerDiscountAmount||0,offerBannerText:q.offerBannerText||"",offerDisplayMode:q.offerDisplayMode||"hidden",offerLockedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    if(createdNow){
      setImmediate(async()=>{
        const customerEmail=String(user.email||await getUserEmail(user.uid)||"").trim();
        await Promise.allSettled([
          sendEventEmailOnce({eventKey:`public:${questionId}:question_submitted`,to:[customerEmail],subject:"SMV ASTRO — Question Received",text:`We received your astrology question.\n\nQuestion ID: ${questionId}\nQuestion: ${q.question||""}\n\nComplete payment to submit it for processing.`,context:{questionId,event:"question_submitted"}}),
          sendEventEmailOnce({eventKey:`public:${questionId}:question_submitted_admin`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — New Question Created",text:`A customer created a new astrology question.\n\nQuestion ID: ${questionId}\nCustomer: ${q.customerName||"Customer"}\nPayment status: awaiting payment`,context:{questionId,event:"question_submitted_admin"}}),
          addAdminEventNotification("question_created","New Question Created",`${q.customerName||"Customer"} created question ${questionId}; payment is awaiting.`,{questionId})
        ]);
      });
    }
    console.log("[create-order] questionId=", questionId, "customer=", user.uid);

    if (!["awaiting_payment", "payment_failed"].includes(q.status)) {
      if (q.paymentStatus === "paid" && q.razorpayOrderId) {
        return res.status(200).json({
          success: true, alreadyPaid: true, questionId,
          orderId: q.razorpayOrderId, keyId: RAZORPAY_KEY_ID,
          amount: Math.round(Number(q.amount || 0) * 100), currency: "INR"
        });
      }
      return res.status(409).json({ error: "This question is not available for payment." });
    }

    // IMPORTANT: For an existing unpaid/failed question, always retry at the
    // amount already locked on that question. Admin may have changed the
    // current public question price after this question was created; that
    // must NOT invalidate the customer's original question or force a new one.
    // For a brand-new question, its amount was already created from the
    // current Admin-configured price above.
    const amount = Number(q.amount || 0);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(409).json({ error: "The original question price is unavailable. Please contact Admin." });
    }

    if (q.razorpayOrderId && ["order_created", "verification_failed", "failed"].includes(q.paymentStatus)) {
      try {
        const existing = await razorpay.orders.fetch(q.razorpayOrderId);
        if (existing.status === "paid") return res.status(409).json({ error: "This payment has already been completed. Please refresh your dashboard." });
        if (Number(existing.amount) === Math.round(amount * 100) && existing.currency === "INR") {
          return res.json({ success: true, questionId, orderId: existing.id, keyId: RAZORPAY_KEY_ID, amount: existing.amount, currency: existing.currency, reused: true });
        }
      } catch (e) { return res.status(409).json({error:"Unable to confirm the previous payment order. Check its status and Razorpay account/mode before retrying; no new payment was created."}); }
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), currency: "INR",
      receipt: `SMV_${questionId.slice(0, 25)}_${Date.now()}`,
      notes: { questionId, customerId: user.uid, astrologerId: String(q.astrologerId || "") }
    });
    if (!order || !order.id || typeof order.id !== "string") {
      console.error("Razorpay returned an order without a valid order ID", order);
      return res.status(502).json({ error: "Razorpay order was created without a valid order ID." });
    }

    // V47 payment critical path: persist only the order state required for safe
    // verification before returning checkout details. Answer settings and the
    // Razorpay audit mirror are secondary and must not delay Razorpay.open().
    await qRef.set({ paymentMode:"live", razorpayOrderId: order.id, paymentCurrency: "INR", paymentStatus: "order_created", paymentUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const responsePayload={ success: true, questionId, orderId: order.id, keyId: RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, originalAmount:Number(q.originalAmount||q.amount||0), offerId:q.offerId||null, offerName:q.offerName||null, promoCode:q.offerPromoCode||"", discountAmount:Number(q.offerDiscountAmount||0), offerBannerText:q.offerBannerText||"" };
    res.json(responsePayload);
    setImmediate(async()=>{
      try{
        const answerSettings=await db.collection("smv_settings").doc("answer").get();
        const minimumWords=Math.max(1,Math.min(10000,Math.floor(Number(answerSettings.data()?.minimumWords||150))));
        await Promise.allSettled([
          qRef.set({answerMinWords:minimumWords},{merge:true}),
          db.collection("razorpay_orders").doc(order.id).set({
            razorpayOrderId:order.id,questionId,amount:order.amount,currency:order.currency,
            firebaseUid:user.uid,customerEmail:user.email||null,astrologerId:String(q.astrologerId||""),
            serviceName:req.body?.serviceName||"Public Astrology Question",status:"created",createdAt:FieldValue.serverTimestamp()
          })
        ]);
      }catch(e){console.error("Post-order bookkeeping failed:",e);}
    });
    return;
  } catch (e) {
    console.error("Create order error:", e);
    return res.status(500).json({ error: e?.error?.description || e?.description || e?.message || "Unable to create Razorpay order" });
  }
});

async function markQuestionPaid(questionId, orderId, paymentId, signature, source) {
  const qRef = db.collection("smv_questions").doc(questionId);
  const workflow = await getOpenWorkflowSettings();
  const result = await db.runTransaction(async tx => {
    const snap = await tx.get(qRef);
    if (!snap.exists) throw new Error("Question not found.");
    const q = snap.data();
    if (q.razorpayOrderId !== orderId) throw new Error("Order mismatch.");
    if (q.paymentStatus === "paid" && q.razorpayPaymentId === paymentId) return { already: true, customerId: q.customerId, customerPaymentId: q.customerPaymentId || null };
    const amount = Number(q.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid question amount.");
    const paymentDateKey = indiaDateKey();
    const paymentCounterRef = db.collection("smv_counters").doc(`payment_${paymentDateKey}`);
    const paymentCounterSnap = await tx.get(paymentCounterRef);
    const paymentInfo = nextPaymentIdInTransaction(paymentDateKey, paymentCounterSnap);
    tx.set(paymentCounterRef, { lastNumber: paymentInfo.next, dateKey: paymentDateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const customerPaymentId = paymentInfo.id;
    const paymentRecordedAt = new Date().toISOString();
    tx.set(db.collection("smv_payments").doc(customerPaymentId), {
      paymentId: customerPaymentId, type: "customer_payment", customerId: q.customerId, astrologerId: null, questionId, bookingId: q.bookingId || null,
      razorpayOrderId: orderId, razorpayPaymentId: paymentId, amount, status: "paid", paymentStatus: "paid", source, createdAt: FieldValue.serverTimestamp(), paymentRecordedAt, updatedAt: FieldValue.serverTimestamp()
    });
    tx.update(qRef, {
      status: workflow.allowWithoutAdminApproval ? "available_to_astrologers" : "pending_admin_approval",
      paymentStatus: "paid",
      allocationStatus: workflow.allowWithoutAdminApproval ? "available_to_astrologers" : "awaiting_admin",
      adminApprovalBypassed: workflow.allowWithoutAdminApproval,
      openedToAstrologersAt: workflow.allowWithoutAdminApproval ? FieldValue.serverTimestamp() : FieldValue.delete(),
      razorpayPaymentId: paymentId, razorpaySignature: signature,
      paidAt: q.paidAt || FieldValue.serverTimestamp(), paymentUpdatedAt: FieldValue.serverTimestamp(), paymentConfirmedBy: source, customerPaymentId, paymentRecordedAt,
      astrologerPaymentId: FieldValue.delete(), commissionStatus: workflow.allowWithoutAdminApproval ? "open_for_claim" : "awaiting_admin_allocation"
    });
    return { already: false, customerId: q.customerId, customerPaymentId, paymentRecordedAt };
  });
  return {...result,workflow,qRef};
}

function runQuestionPaymentSideEffects({result,questionId,orderId,paymentId}){
  if(!result||result.already)return;
  setImmediate(async()=>{
    try{
      const qSnap=await result.qRef.get();
      const q=qSnap.exists?(qSnap.data()||{}):{};
      await Promise.allSettled([
        db.collection("smv_notifications").add({userId:result.customerId,type:"payment",title:"Payment successful",message:result.workflow.allowWithoutAdminApproval?`Your payment was verified. Your question is now open to approved astrologers. Payment ID: ${result.customerPaymentId||"N/A"}.`:`Your payment was verified. Your question is now waiting for Admin approval. Payment ID: ${result.customerPaymentId||"N/A"}.`,paymentId:result.customerPaymentId||null,razorpayPaymentId:paymentId||null,questionId,createdAt:FieldValue.serverTimestamp(),read:false}),
        consumeOfferAfterPayment({uid:result.customerId,service:"public_question",referenceId:questionId,paymentId,quote:{offerId:q.offerId||null,offerName:q.offerName||null,promoCode:q.offerPromoCode||"",originalAmount:Number(q.originalAmount||q.amount||0),finalAmount:Number(q.amount||0),discountAmount:Number(q.offerDiscountAmount||0)}})
      ]);
      const customerEmail=String(q.customerEmail||await getUserEmail(result.customerId)||"").trim();
      const amount=Number(q.amount||0);
      await Promise.allSettled([
        sendEventEmailOnce({eventKey:`public:${questionId}:payment_success:${paymentId}`,to:[customerEmail],subject:"SMV ASTRO — Question Payment Successful",replyTo:ADMIN_EMAIL,text:`Your payment was successful.\n\nQuestion ID: ${questionId}\nCustomer Payment ID: ${result.customerPaymentId||"N/A"}\nAmount: ₹${amount.toFixed(2)}\nRazorpay Payment ID: ${paymentId}\n\n${result.workflow.allowWithoutAdminApproval?"Your question is now open to approved astrologers.":"Your question is now waiting for Admin approval."}`,context:{questionId,paymentId,event:"payment_success"}}),
        sendEventEmailOnce({eventKey:`public:${questionId}:payment_admin:${paymentId}`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — Question Payment Received",text:`Question payment received.\n\nQuestion ID: ${questionId}\nAmount: ₹${amount.toFixed(2)}\nRazorpay Payment ID: ${paymentId}\nCustomer: ${q.customerName||"Customer"}`,context:{questionId,paymentId,event:"payment_admin"}}),
        q.astrologerId?sendEventEmailOnce({eventKey:`public:${questionId}:astrologer_paid:${paymentId}`,to:[await resolveAstrologerEmail(q)],subject:"SMV ASTRO — Paid Question Assigned",text:`A paid astrology question is assigned to you.\n\nQuestion ID: ${questionId}`,context:{questionId,paymentId,event:"astrologer_paid"}}):Promise.resolve(),
        addAdminEventNotification("question_payment_received","Question Payment Received",`${q.customerName||"Customer"} paid ₹${amount.toFixed(2)} for question ${questionId}.`,{questionId,paymentId})
      ]);
    }catch(e){console.error("Post-verification question bookkeeping failed:",e);}
  });
}


app.post("/admin/credit-commission", async (req, res) => {
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access denied." });
  try {
    const questionId = String(req.body?.questionId || "").trim(); if (!questionId) return res.status(400).json({ error: "Question ID is required." });
    const qRef = db.collection("smv_questions").doc(questionId);
    const qSnap = await qRef.get(); if (!qSnap.exists) return res.status(404).json({ error: "Question not found." });
    const q = qSnap.data() || {};
    if (!q.astrologerId) return res.status(400).json({ error: "Astrologer is not assigned." });
    const amount = Number(q.astrologerCommissionAmount || q.commissionAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "Invalid astrologer commission amount." });
    if (q.astrologerPaymentId && q.commissionStatus === "credited") return res.json({ success: true, astrologerPaymentId: q.astrologerPaymentId, commissionAmount: amount, already: true });
    const paymentId = await nextPaymentId();
    const astrologerPaymentId = paymentId.replace(/^SMV-PAY-/, "SMV-PAT-");
    await db.collection("smv_payments").doc(astrologerPaymentId).set({ paymentId: astrologerPaymentId, type:"astrologer_earning", customerId:q.customerId||null, astrologerId:q.astrologerId, questionId, bookingId:q.bookingId||null, grossAmount:Number(q.amount||0), commissionPercent:Number(q.commissionPercent||q.commissionRate||0), commissionAmount:amount, earningAmount:amount, status:"credited", paymentStatus:"pending_withdrawal", source:"admin_answer_approval", createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
    await qRef.update({ astrologerPaymentId:astrologerPaymentId, commissionStatus:"credited", commissionCreditedAt:FieldValue.serverTimestamp(), commissionAmount:amount });
    return res.json({ success:true, astrologerPaymentId:astrologerPaymentId, commissionAmount:amount });
  } catch(e) { console.error("Commission credit error:",e); return res.status(500).json({ error:e?.message||"Unable to credit commission." }); }
});


app.post("/admin/reject-answer", express.json({limit:"10kb"}), async (req,res)=>{
  const user=await requireUser(req,res); if(!user)return;
  if(!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try{
    const questionId=String(req.body?.questionId||"").trim();
    const reason=String(req.body?.reason||"").trim();
    if(!questionId||!reason) return res.status(400).json({error:"Question ID and rejection reason are required."});
    const ref=db.collection("smv_questions").doc(questionId);
    const snap=await ref.get(); if(!snap.exists) return res.status(404).json({error:"Question not found."});
    const q=snap.data()||{};
    if(!q.astrologerId) return res.status(409).json({error:"Astrologer is not assigned."});
    if(["answered","question_rejected","admin_rejected"].includes(String(q.status||""))) return res.status(409).json({error:"This question is already closed."});
    if(!String(q.answer||"").trim()) return res.status(400).json({error:"No astrologer answer is available to reject."});
    await ref.update({
      status:"revision_required", allocationStatus:"claimed_by_astrologer",
      astrologerAnswerStatus:"revision_required", astrologerEditMode:true,
      adminRejectionReason:reason, adminRejectedAt:FieldValue.serverTimestamp(), adminRejectedBy:user.uid,
      commissionStatus:"allocated_pending_answer", updatedAt:FieldValue.serverTimestamp()
    });
    await db.collection("smv_notifications").add({userId:q.astrologerId,type:"answer_rejected",title:"Answer revision required",message:`Please revise and resubmit your answer. Reason: ${reason}`,questionId,createdAt:FieldValue.serverTimestamp(),read:false});
    await writeAdminAudit("ANSWER_REJECTED",questionId,user.uid,{reason,astrologerId:q.astrologerId});
    return res.json({success:true,questionId,astrologerId:q.astrologerId,status:"revision_required"});
  }catch(e){console.error("Admin reject answer error:",e);return res.status(500).json({error:e?.message||"Unable to reject answer."});}
});

app.post("/admin/approve-answer", express.json({limit:"20kb"}), async (req, res) => {
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({ error: "Admin access denied." });
  const questionId = String(req.body?.questionId || "").trim();
  try {
    if (!questionId) return res.status(400).json({ error: "Question ID is required." });
    const qRef = db.collection("smv_questions").doc(questionId);
    const snap = await qRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Question not found." });
    const q = snap.data() || {};
    if (!q.astrologerId) return res.status(400).json({ error: "Astrologer is not assigned." });
    if (["question_rejected","admin_rejected"].includes(String(q.status||""))) return res.status(409).json({ error: "This question was rejected and refunded. Its answer cannot be approved." });
    if (!String(q.answer || "").trim()) return res.status(400).json({ error: "No answer found." });
    const alreadyApproved = String(q.status || "") === "answered" && String(q.astrologerAnswerStatus || "") === "approved";
    // IMPORTANT: An answer may have been approved before email delivery was fixed.
    // Do not return early in that case. Re-run the email notification so Admin can
    // safely approve/retry and the customer still receives the message.
    const amount = Number(q.astrologerCommissionAmount || q.commissionAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "Invalid astrologer commission amount." });

    let astrologerPaymentId = q.astrologerPaymentId || "";
    if (false && !alreadyApproved && (!astrologerPaymentId || String(q.commissionStatus || "") !== "credited")) {
      const paymentId = await nextPaymentId();
      astrologerPaymentId = paymentId.replace(/^SMV-PAY-/, "SMV-PAT-");
      await db.collection("smv_payments").doc(astrologerPaymentId).set({
        paymentId: astrologerPaymentId, type:"astrologer_earning", customerId:q.customerId||null,
        astrologerId:q.astrologerId, questionId, bookingId:q.bookingId||null,
        grossAmount:Number(q.amount||0), commissionPercent:Number(q.commissionPercent||q.commissionRate||0),
        commissionAmount:amount, earningAmount:amount, status:"credited", paymentStatus:"pending_withdrawal",
        source:"admin_answer_approval", createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp()
      });
    }

    if (!alreadyApproved) {
      await qRef.update({
        status:"answered",
        astrologerAnswerStatus:"approved",
        commissionStatus:"pending_customer_view",
        answerAvailableAt:FieldValue.serverTimestamp(),
        answerApprovedAt:FieldValue.serverTimestamp(),
        adminAnswerApprovedAt:FieldValue.serverTimestamp(),
        answerApprovedBy:user.uid,
        commissionCreditedAt:FieldValue.delete(),
        commissionAmount:amount,
        astrologerCommissionAmount:amount,
        astrologerPaymentId,
        updatedAt:FieldValue.serverTimestamp(),
        answerApprovalEmailStatus:{state:"pending",updatedAt:FieldValue.serverTimestamp(),retry:true}
      });

      await db.collection("smv_notifications").add({
        userId:q.astrologerId,type:"answer_approved",title:"Answer Approved",
        message:`Your answer has been approved. Earnings will become available after the customer opens the answer.`,
        questionId,commissionAmount:amount,createdAt:FieldValue.serverTimestamp(),read:false
      });
      await writeAdminAudit("ANSWER_APPROVED", questionId, user.uid, {
        commissionAmount: amount, astrologerId: q.astrologerId, customerId: q.customerId || null
      });
    } else {
      await qRef.set({
        answerApprovalEmailStatus:{state:"pending",updatedAt:FieldValue.serverTimestamp(),retry:true},
        updatedAt:FieldValue.serverTimestamp()
      }, {merge:true});
    }

    const customerEmail = await resolveCustomerEmail(q);
    const customerName = String(q.customerName || q.birthName || "Customer");
    const astrologerName = String(q.astrologerName || "Astrologer");
    const emailContent = answerReadyEmail({customerName, astrologerName, question:q.question, questionId, answer:q.answer});
    const {subject, text, html} = emailContent;
    const results = {};
    const recipients = uniqueRecipients([customerEmail]);
    for (const recipient of recipients) {
      const key = recipient.toLowerCase();
      const result = await sendEventEmailOnce({eventKey:`public:${questionId}:answer_approved`,to:[recipient],replyTo:ADMIN_EMAIL,subject,text,html,context:{questionId,event:"answer_approved"}});
      if (result?.failed) {
        results[key] = {status:"failed",error:String(result.error || "Unknown email error")};
        console.error(`Resend delivery failed | Question ID: ${questionId} | Recipient Email: ${recipient} | Reason: ${result.error || "Unknown email error"}`);
      } else {
        results[key] = {status:"sent",messageId:result?.id || null};
        console.log(`Resend notification sent | Question ID: ${questionId} | Recipient Email: ${recipient}`);
      }
    }
    const vals = Object.values(results);
    const emailState = !vals.length ? "failed" : vals.every(x=>x.status==="sent") ? "sent" : vals.every(x=>x.status==="failed") ? "failed" : "partial";
    await qRef.set({answerApprovalEmailStatus:{state:emailState,recipients:results,updatedAt:FieldValue.serverTimestamp()}},{merge:true});
    // Never expose Resend delivery state to the Admin/Customer/Astrologer web UI.
    // The business action is successful once the answer is approved and commission is credited.
    return res.json({success:true,questionId,already:alreadyApproved,commissionAmount:amount});
  } catch (e) {
    console.error(`Admin answer approval failed | Question ID: ${questionId || "N/A"} | Reason:`, e?.message || e);
    return res.status(500).json({error:e?.message || "Unable to approve answer."});
  }
});


app.get("/astrologer/earnings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const uid = String(user.uid);
    const [paymentSnap, questionSnap, privateSnap] = await Promise.all([
      db.collection("smv_payments").where("astrologerId", "==", uid).get(),
      db.collection("smv_questions").where("astrologerId", "==", uid).get(),
      db.collection("smv_private_consultations").where("astrologerId", "==", uid).get()
    ]);
    const toIso = (v) => {
      try {
        if (!v) return null;
        if (typeof v.toDate === "function") return v.toDate().toISOString();
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "string") return v;
        return null;
      } catch (_) { return null; }
    };
    const ledger = [];
    const creditedQuestionIds = new Set();
    const creditedPrivateIds = new Set();
    paymentSnap.docs.forEach(d => {
      const p = d.data() || {};
      if (String(p.type || "") !== "astrologer_earning") return;
      if (String(p.status || "").toLowerCase() !== "credited") return;
      const amount = Number(p.earningAmount ?? p.commissionAmount ?? 0);
      if (!Number.isFinite(amount) || amount < 0) return;
      const qid = String(p.questionId || ""),pcid=String(p.consultationId||"");
      if (qid) creditedQuestionIds.add(qid);
      if (pcid) creditedPrivateIds.add(pcid);
      ledger.push({ id: pcid||qid||d.id, paymentId:d.id, consultationId:pcid||null, question:p.question||(pcid?"Private Consultation":"Consultation"), commission:amount, date:toIso(p.createdAt), source:pcid?"private_consultation":"public_question" });
    });
    // Backward compatibility for older credited questions that predate the
    // canonical astrologer_earning payment ledger.
    questionSnap.docs.forEach(d => {
      const q = d.data() || {};
      if (String(q.status || "") !== "answered" || String(q.commissionStatus || "") !== "credited") return;
      if (creditedQuestionIds.has(d.id)) return;
      const amount = Number(q.astrologerCommissionAmount ?? q.commissionAmount ?? 0);
      if (!Number.isFinite(amount) || amount < 0) return;
      ledger.push({ id:d.id, paymentId:null, question:q.question || "Consultation", commission:amount, date:toIso(q.commissionCreditedAt || q.answerApprovedAt || q.adminAnswerApprovedAt) });
    });
    // Backward compatibility: include already-credited private consultations
    // that predate the canonical private earning payment ledger.
    privateSnap.docs.forEach(d=>{
      const c=d.data()||{};
      if(String(c.commissionStatus||"")!=="credited")return;
      if(creditedPrivateIds.has(d.id))return;
      const amount=Number(c.astrologerCreditedAmount??c.astrologerAmount??0);
      if(!Number.isFinite(amount)||amount<0)return;
      ledger.push({id:d.id,paymentId:c.astrologerPaymentId||null,consultationId:d.id,question:c.question||"Private Consultation",commission:amount,date:toIso(c.commissionCreditedAt||c.customerViewedAt),source:"private_consultation"});
    });
    ledger.sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
    const totalEarnings = Math.round(ledger.reduce((sum,x)=>sum+Number(x.commission||0),0)*100)/100;
    return res.json({success:true,totalEarnings,ledger});
  } catch (e) {
    console.error("Astrologer earnings load failed:", e);
    return res.status(500).json({error:"Unable to load astrologer earnings right now."});
  }
});

app.get("/customer/private-consultations",async(req,res)=>{
  res.set("Cache-Control","private, no-store, max-age=0");
  const user=await requireUser(req,res);if(!user)return;
  try{
    const snap=await db.collection("smv_private_consultations").where("customerId","==",user.uid).get();
    const toIso=v=>{try{if(!v)return null;if(typeof v.toDate==="function")return v.toDate().toISOString();if(v instanceof Date)return v.toISOString();if(typeof v==="string")return v;return null;}catch(_e){return null;}};
    const consultations=snap.docs.map(d=>{const c=d.data()||{};return {id:d.id,...c,createdAt:toIso(c.createdAt),updatedAt:toIso(c.updatedAt),paidAt:toIso(c.paidAt),questionApprovedAt:toIso(c.questionApprovedAt),answerSubmittedAt:toIso(c.answerSubmittedAt),answerApprovedAt:toIso(c.answerApprovedAt),answerRejectedAt:toIso(c.answerRejectedAt),customerViewedAt:toIso(c.customerViewedAt),refundCreatedAt:toIso(c.refundCreatedAt),refundProcessedAt:toIso(c.refundProcessedAt)};}).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    return res.json({success:true,customerId:user.uid,consultations});
  }catch(e){console.error("Private customer consultations load failed:",e);return res.status(500).json({error:"Unable to load private consultations."});}
});
app.post('/customer/private-consultation/mark-viewed',express.json({limit:'10kb'}),markViewedRoute('private','consultationId'));

app.get("/customer/consultations", async (req, res) => {
  res.set("Cache-Control","private, no-store, max-age=0");
  res.set("Pragma","no-cache");
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    // Read through the trusted backend so Customer Dashboard is not blocked by
    // client-side Firestore rules/indexes. Always return the canonical document
    // ID as questionId, even for older questions created before this fix.
    const snap = await db.collection("smv_questions").where("customerId","==",user.uid).get();
    const toIso = (v) => {
      try {
        if (!v) return null;
        if (typeof v.toDate === "function") return v.toDate().toISOString();
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "string") return v;
        return null;
      } catch (_) { return null; }
    };
    const questions = snap.docs
      .filter(d => String(d.data()?.customerId || "") === String(user.uid))
      .map(d => {
        const q = d.data() || {};
        return {
          id: d.id,
          ...q,
          questionId: String(q.questionId || d.id),
          createdAt: toIso(q.createdAt),
          updatedAt: toIso(q.updatedAt),
          paidAt: toIso(q.paidAt),
          paymentUpdatedAt: toIso(q.paymentUpdatedAt),
          paymentRecordedAt: q.paymentRecordedAt || null,
          adminQuestionRejectedAt: toIso(q.adminQuestionRejectedAt),
          refundRequestedAt: toIso(q.refundRequestedAt),
          refundCreatedAt: toIso(q.refundCreatedAt),
          refundProcessedAt: toIso(q.refundProcessedAt),
          refundFailedAt: toIso(q.refundFailedAt),
          adminQuestionApprovedAt: toIso(q.adminQuestionApprovedAt),
          answerSubmittedAt: toIso(q.answerSubmittedAt),
          answerApprovedAt: toIso(q.answerApprovedAt),
          adminAnswerApprovedAt: toIso(q.adminAnswerApprovedAt),
          commissionCreditedAt: toIso(q.commissionCreditedAt)
        };
      })
      .sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ success: true, customerId:user.uid, fetchedAt:new Date().toISOString(), questions });
  } catch (e) {
    console.error("Customer consultations load failed:", e);
    return res.status(500).json({ error: "Unable to load your consultations right now." });
  }
});

app.post("/verify-payment", express.json(), async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const questionId = String(req.body?.questionId || "").trim();
    const orderId = String(req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.razorpay_signature || "").trim();
    if (!questionId || !orderId || !paymentId || !signature) return res.status(400).json({ error: "Payment verification data is incomplete." });
    const qSnap = await db.collection("smv_questions").doc(questionId).get();
    if (!qSnap.exists) return res.status(404).json({ error: "Question not found." });
    const q = qSnap.data();
    if (q.customerId !== user.uid) return res.status(403).json({ error: "You do not own this question." });
    if (q.razorpayOrderId !== orderId) return res.status(409).json({ error: "Payment order mismatch." });
    const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    if (!signatureEqual(expected, signature)) {
      const mode = RAZORPAY_KEY_ID.startsWith("rzp_test_") ? "test" : (RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "live" : "unknown");
      console.error("Payment verification signature mismatch", { questionId, orderId, paymentId, mode });
      return res.status(401).json({ error: "Invalid payment signature. Check that Render RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET belong to the same Razorpay mode (both Test or both Live)." });
    }
    let payment = await razorpay.payments.fetch(paymentId);
    if (payment.order_id !== orderId) return res.status(409).json({ error: "Payment order mismatch." });
    const expectedAmount = Math.round(Number(q.amount || 0) * 100);
    if (Number(payment.amount) !== expectedAmount) return res.status(409).json({ error: "Payment amount mismatch." });

    // Razorpay can return an authorised payment before automatic capture.
    // Capture it server-side, then fetch again and continue verification.
    const paymentStatus = String(payment.status || "").toLowerCase();
    if (paymentStatus === "authorized") {
      try {
        payment = await razorpay.payments.capture(paymentId, expectedAmount, String(payment.currency || "INR"));
      } catch (captureError) {
        console.error("Razorpay capture error:", captureError);
        // It may have been captured concurrently; re-fetch before failing.
      }
      if(String(payment.status).toLowerCase()!=="captured") payment = await razorpay.payments.fetch(paymentId);
    }
    if (String(payment.status).toLowerCase() !== "captured") {
      return res.status(409).json({
        error: "Payment is authorised but could not be captured yet.",
        paymentStatus: payment.status || null,
        paymentId,
        orderId
      });
    }
    const result = await markQuestionPaid(questionId, orderId, paymentId, signature, "render_checkout_verification");
    // Essential paid-state commit is complete. Respond now; notifications, offer
    // consumption, email and audit mirrors are idempotent secondary work.
    res.json({ verified: true, questionId, paymentId, alreadyProcessed: result.already, customerPaymentId: result.customerPaymentId || null, paymentRecordedAt: result.paymentRecordedAt || new Date().toISOString(), message: "Payment verified and consultation updated successfully." });
    runQuestionPaymentSideEffects({result,questionId,orderId,paymentId});
    setImmediate(()=>db.collection("razorpay_orders").doc(orderId).set({razorpayPaymentId:paymentId,status:"verified",questionId,verifiedAt:FieldValue.serverTimestamp()},{merge:true}).catch(e=>console.error("Razorpay verification audit update failed:",e)));
    return;
  } catch (e) {
    console.error("Payment verification error:", e);
    return res.status(500).json({ error: e?.error?.description || e?.description || e?.message || "Payment verification failed" });
  }
});

// V121 Astrology calculation engine: sidereal/Vedic chart using Astronomy Engine.
// The ephemeris library supplies astronomical positions; Lahiri ayanamsa and
// traditional Vedic mappings are applied here. Birth place coordinates are required
// for the ascendant because a city name alone is not enough for astronomical accuracy.
const VEDIC_RASIS = ["மேஷம்","ரிஷபம்","மிதுனம்","கடகம்","சிம்மம்","கன்னி","துலாம்","விருச்சிகம்","தனுசு","மகரம்","கும்பம்","மீனம்"];
const NAKSHATRAS = ["அஸ்வினி","பரணி","கார்த்திகை","ரோகிணி","மிருகசீரிடம்","திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்","பூரம்","உத்திரம்","ஹஸ்தம்","சித்திரை","சுவாதி","விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்","உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்","பூரட்டாதி","உத்திரட்டாதி","ரேவதி"];
const NAK_LORDS = ["கேது","சுக்கிரன்","சூரியன்","சந்திரன்","செவ்வாய்","ராகு","குரு","சனி","புதன்"];
const DASHA_YEARS = {"கேது":7,"சுக்கிரன்":20,"சூரியன்":6,"சந்திரன்":10,"செவ்வாய்":7,"ராகு":18,"குரு":16,"சனி":19,"புதன்":17};
const DASHA_ORDER = ["கேது","சுக்கிரன்","சூரியன்","சந்திரன்","செவ்வாய்","ராகு","குரு","சனி","புதன்"];
const PLANETS = [
  ["சூரியன்", "Sun"], ["சந்திரன்", "Moon"], ["செவ்வாய்", "Mars"], ["புதன்", "Mercury"],
  ["குரு", "Jupiter"], ["சுக்கிரன்", "Venus"], ["சனி", "Saturn"], ["ராகு", "NorthNode"], ["கேது", "SouthNode"]
];
const BODY_MAP = { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn" };
function norm360(x){ x%=360; return x<0?x+360:x; }
function clampNum(v,min,max){ const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max?n:null; }
function parseBirthDateTime(date,time){
  const ds=String(date||"").trim();
  const ts=String(time||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return null;
  let hh, mm;
  // Accept the native mobile <input type="time"> value (HH:mm), plus
  // human-entered 12-hour values such as "10:05 PM" / "10.05 PM".
  let m=ts.match(/^(\d{1,2})[:.](\d{2})$/);
  if(m){ hh=Number(m[1]); mm=Number(m[2]); }
  else {
    m=ts.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
    if(!m) return null;
    hh=Number(m[1]); mm=Number(m[2]);
    const ap=m[3].toUpperCase();
    if(hh<1||hh>12) return null;
    if(ap==='AM') hh=hh===12?0:hh;
    else hh=hh===12?12:hh+12;
  }
  if(!Number.isInteger(hh)||!Number.isInteger(mm)||hh<0||hh>23||mm<0||mm>59) return null;
  const [y,mo,d]=ds.split("-").map(Number);
  const check=new Date(Date.UTC(y,mo-1,d));
  if(check.getUTCFullYear()!==y || check.getUTCMonth()!==mo-1 || check.getUTCDate()!==d) return null;
  // Project currently targets India; the frontend timezone is Asia/Kolkata.
  // Build the UTC instant explicitly. Never rely on parsing a locale/time string.
  const utcMillis = Date.UTC(y, mo - 1, d, hh, mm, 0, 0) - (330 * 60 * 1000);
  const dt = new Date(utcMillis);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}
function lahiriAyanamsa(date){
  const y=date.getUTCFullYear()+((date.getUTCMonth()+0.5)/12);
  const years=y-2000;
  return 23.85675 + years*(50.290966/3600); // Lahiri-style linearized value near modern dates.
}
function siderealLon(tropical,date){ return norm360(tropical-lahiriAyanamsa(date)); }
function zodiac(longitude){ const lon=norm360(longitude), idx=Math.floor(lon/30), deg=lon-idx*30; return {index:idx, sign:VEDIC_RASIS[idx], degree:deg}; }
function degText(d) {
  const x = norm360(Number(d));
  const withinSign = x % 30;

  let deg = Math.floor(withinSign);

  const minuteFloat = (withinSign - deg) * 60;
  let min = Math.floor(minuteFloat);

  let sec = Math.round((minuteFloat - min) * 60);

  // 59'60" வந்தால் அடுத்த minute-க்கு மாற்றவும்
  if (sec >= 60) {
    sec = 0;
    min += 1;
  }

  // 29°60' வந்தால் அடுத்த degree-க்கு மாற்றவும்
  if (min >= 60) {
    min = 0;
    deg += 1;
  }

  return `${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'${String(sec).padStart(2, "0")}"`;
}
function julianDay(date){ return date.getTime()/86400000 + 2440587.5; }
function meanSiderealTime(date,lon){
  // Use Astronomy Engine's sidereal-time implementation (GAST) and add
  // geographic longitude. This avoids mixing a hand-rolled GMST formula
  // with an apparent/sidereal ascendant calculation.
  const gstHours = (typeof Astronomy.SiderealTime === "function")
    ? Astronomy.SiderealTime(date)
    : null;
  if (Number.isFinite(gstHours)) return norm360(gstHours * 15 + lon);
  const jd=julianDay(date), T=(jd-2451545.0)/36525;
  const gmst=280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - T*T*T/38710000;
  return norm360(gmst+lon);
}
function ascendantLongitude(date,lat,lon){
  // Eastern horizon intersection using the standard atan2 form.
  // Local sidereal time depends on UTC date/time AND geographic longitude;
  // latitude enters the horizon/ecliptic intersection.
  const T=(julianDay(date)-2451545.0)/36525;
  const eps=(23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T);
  const theta=meanSiderealTime(date,lon)*Math.PI/180;
  const phi=lat*Math.PI/180, e=eps*Math.PI/180;
  const tropical=norm360(Math.atan2(Math.cos(theta), -(Math.sin(theta)*Math.cos(e)+Math.tan(phi)*Math.sin(e)))*180/Math.PI);
  return tropical;
}
function navamsaSignIndex(siderealLon){
  const lon=norm360(siderealLon);
  const rasi=Math.floor(lon/30), part=Math.floor((lon%30)/(30/9));
  // Navamsa starts: movable=1st sign, fixed=9th, dual=5th; then proceeds sequentially.
  const mode=rasi%3;
  const start=mode===0 ? rasi : mode===1 ? (rasi+8)%12 : (rasi+4)%12;
  return (start+part)%12;
}
function navamsaData(lon){
  const idx=navamsaSignIndex(lon);
  const part=Math.floor((norm360(lon)%30)/(30/9))+1;
  return {rasi:VEDIC_RASIS[idx],pada:part};
}
function bhavaCuspsEqual(ascLon){
  // Equal-house bhava sphuta: each cusp is exactly 30° from the Ascendant.
  return Array.from({length:12},(_,i)=>norm360(ascLon+i*30));
}
function houseFromCusp(lon,ascLon){
  return Math.floor(norm360(lon-ascLon)/30)+1;
}
function nodeLongitudes(date){
  const T=(julianDay(date)-2451545.0)/36525;
  const omega=125.04452 - 1934.136261*T + 0.0020708*T*T + (T*T*T)/450000 - (T*T*T*T)/56250;
  const rahu=siderealLon(omega,date); return {rahu,ketu:norm360(rahu+180)};
}
function bodyTropicalLongitude(body,date,observer){
  if(body==="Sun") return Astronomy.SunPosition(date).elon;
  if(body==="Moon") return Astronomy.EclipticGeoMoon(date).lon;
  const vec=Astronomy.GeoVector(Astronomy.Body[body],date,true);
  return Astronomy.Ecliptic(vec).elon;
}
function nakshatraInfo(lon){
  const span=360/27, padaSpan=span/4, idx=Math.floor(norm360(lon)/span), within=norm360(lon)-idx*span;
  return {index:idx,name:NAKSHATRAS[idx],pada:Math.floor(within/padaSpan)+1,lord:NAK_LORDS[idx%9]};
}
function addDays(date, days){ return new Date(date.getTime()+days*365.2425*86400000); }
function isoDate(date){ return date.toISOString().slice(0,10); }
function sequenceFromLord(lord){
  const i=DASHA_ORDER.indexOf(lord);
  if(i<0) throw new Error(`Unknown Vimshottari lord: ${lord}`);
  return DASHA_ORDER.slice(i).concat(DASHA_ORDER.slice(0,i));
}
function buildSubPeriods(parentLord, parentStart, parentEnd, level){
  const seq=sequenceFromLord(parentLord), parentDays=(parentEnd.getTime()-parentStart.getTime())/86400000;
  return seq.map(lord=>{
    const years=DASHA_YEARS[lord];
    // Proportional rule: sub-period = full parent duration * lord years / 120.
    const durationDays=parentDays*(years/120);
    return {lord, years:Number((durationDays/365.2425).toFixed(4)), startDate:null, endDate:null, durationDays};
  }).reduce((acc,x)=>{
    const prev=acc.length?acc[acc.length-1].endDate:parentStart;
    const start=prev, end=new Date(start.getTime()+x.durationDays*86400000);
    acc.push({...x,startDate:start,endDate:end}); return acc;
  },[]).map(x=>({...x,start:isoDate(x.startDate),end:isoDate(x.endDate)}));
}
function buildPratyantar(antarLord, startDate, endDate){
  return buildSubPeriods(antarLord,startDate,endDate,3).map(x=>({lord:x.lord,years:x.years,start:x.start,end:x.end}));
}
function buildAntardasha(mdLord, fullStart, fullEnd, birthDate){
  return buildSubPeriods(mdLord,fullStart,fullEnd,2).map(x=>{
    const visibleStart=x.startDate<birthDate?birthDate:x.startDate;
    const visibleEnd=x.endDate;
    return {
      lord:x.lord,
      years:x.years,
      start:isoDate(visibleStart),
      end:isoDate(visibleEnd),
      hiddenBeforeBirth:x.endDate<=birthDate,
      pratyantars: buildPratyantar(x.lord,x.startDate,x.endDate)
        .filter(p=>new Date(p.end+'T23:59:59')>=birthDate)
        .map(p=>({...p,start:p.start<isoDate(birthDate)?isoDate(birthDate):p.start}))
    };
  }).filter(x=>!x.hiddenBeforeBirth);
}
function dashaAtBirth(moonSiderealLon,date){
  const n=nakshatraInfo(moonSiderealLon), span=360/27, progressed=(norm360(moonSiderealLon)%span)/span;
  const lord=n.lord, total=DASHA_YEARS[lord], balance=total*(1-progressed);
  if (!lord || !Number.isFinite(total) || !Number.isFinite(balance)) throw new Error("Unable to calculate Vimshottari Dasha from Moon longitude.");
  const idx=DASHA_ORDER.indexOf(lord), elapsed=total-balance;
  let fullStart=addDays(date,-elapsed), start=fullStart;
  const periods=[];
  for(let i=0;i<9;i++){
    const name=DASHA_ORDER[(idx+i)%9], years=DASHA_YEARS[name];
    const end=addDays(start,years);
    if(end>date){
      const visibleStart=start<date?date:start;
      periods.push({lord:name,years:Number(years.toFixed(2)),start:isoDate(visibleStart),end:isoDate(end),antardashas:buildAntardasha(name,start,end,date)});
    }
    start=end;
  }
  return {
    balanceYears:Number(balance.toFixed(2)),
    order:DASHA_ORDER,
    periods,
    current:{mahadasha:null,antardasha:null,pratyantardasha:null}
  };
}

function circularLonDiff(a,b){ return ((Number(a)-Number(b)+540)%360)-180; }
function localDateFromJd(jdUt, offsetMinutes){
  const ms=(Number(jdUt)-2440587.5)*86400000 + Number(offsetMinutes||330)*60000;
  const d=new Date(ms); return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,19).slice(0,5)};
}
function findTajakaAnnualChart(input,targetYear){
  const birthDate=String(input?.date||'');
  const bm=birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!bm)return null;
  const y=Number(targetYear); const month=Number(bm[2]), day=Number(bm[3]);
  const natal=SwissVedic.calculateSwiss(input); const natalSun=natal.planets.find(p=>p.name==='சூரியன்')?.longitude; if(!Number.isFinite(natalSun))return null;
  const offset=Number(input?.utcOffsetMinutes??330), base=new Date(Date.UTC(y,month-1,day,12,0,0));
  const sample=[]; for(let h=-120;h<=120;h+=3){const d=new Date(base.getTime()+h*3600000);const local=new Date(d.getTime()+offset*60000);const ds=local.toISOString().slice(0,10),ts=local.toISOString().slice(11,16);try{const c=SwissVedic.calculateSwiss({...input,date:ds,time:ts});const sl=c.planets.find(p=>p.name==='சூரியன்')?.longitude;sample.push({t:d.getTime(),diff:circularLonDiff(sl,natalSun)});}catch{}}
  let lo=null,hi=null; for(let i=1;i<sample.length;i++){if(sample[i-1].diff<=0&&sample[i].diff>=0){lo=sample[i-1].t;hi=sample[i].t;break;} if(sample[i-1].diff>=0&&sample[i].diff<=0){lo=sample[i].t;hi=sample[i-1].t;break;}}
  if(lo==null){sample.sort((a,b)=>Math.abs(a.diff)-Math.abs(b.diff));const best=sample[0];lo=best.t-6*3600000;hi=best.t+6*3600000;}
  for(let i=0;i<42;i++){const mid=(lo+hi)/2;const d=new Date(mid),local=new Date(d.getTime()+offset*60000),ds=local.toISOString().slice(0,10),ts=local.toISOString().slice(11,16);const c=SwissVedic.calculateSwiss({...input,date:ds,time:ts});const sl=c.planets.find(p=>p.name==='சூரியன்')?.longitude;const diff=circularLonDiff(sl,natalSun);const dl=new Date(lo),ll=new Date(dl.getTime()+offset*60000),lds=ll.toISOString().slice(0,10),lts=ll.toISOString().slice(11,16);const cl=SwissVedic.calculateSwiss({...input,date:lds,time:lts});const ld=circularLonDiff(cl.planets.find(p=>p.name==='சூரியன்')?.longitude,natalSun);if((ld<=0&&diff>=0)||(ld>=0&&diff<=0))hi=mid;else lo=mid;}
  const ret=new Date((lo+hi)/2), local=new Date(ret.getTime()+offset*60000), ds=local.toISOString().slice(0,10), ts=local.toISOString().slice(11,16);
  const annual=SwissVedic.calculateSwiss({...input,date:ds,time:ts});
  annual.tajakaReturn={targetYear:y,returnDate:ds,returnTime:ts,natalSunLongitude:natalSun};
  return annual;
}

function calculateVedicChart(input) {
  if (!SwissVedic) {
    throw new Error(
      "Swiss Ephemeris module is unavailable. Run npm install and verify the sweph dependency."
    );
  }

  const chart = SwissVedic.calculateSwiss(input);
  chart.birthName = String(input?.name || '').trim();
  chart.birthDate = String(input?.date || '').trim();
  chart.birthTime = String(input?.time || '').trim();
  chart.birthLat = Number(input?.lat || 0);
  chart.birthLon = Number(input?.lon || 0);

  // ============================================
  // FULL DMS DEGREE FOR PLANETS
  // Example: 09°17'45"
  // ============================================
  if (Array.isArray(chart.planets)) {
    chart.planets = chart.planets.map(p => {
      const copy = { ...p };

      if (Number.isFinite(Number(copy.longitude))) {
        copy.degree = degText(Number(copy.longitude));
      }

      return copy;
    });
  }

  // ============================================
  // FULL DMS DEGREE FOR ASCENDANT
  // Example: 14°12'17"
  // ============================================
  if (
    chart.lagna &&
    Number.isFinite(Number(chart.lagna.longitude))
  ) {
    chart.lagna = {
      ...chart.lagna,
      degree: degText(Number(chart.lagna.longitude))
    };
  }

  // Vimshottari remains driven by Moon longitude
  const moon = chart.planets.find(
    p => p.name === "சந்திரன்"
  );

  chart.dashas = dashaAtBirth(
    moon.longitude,
    new Date(
      chart.birth.utc_jd
        ? (chart.birth.utc_jd - 2440587.5) * 86400000
        : Date.parse(
            chart.birth.date +
            "T" +
            chart.birth.time +
            ":00+05:30"
          )
    )
  );

  return chart;
}

app.post('/api/horoscope/transit', async (req,res)=>{
  try {
    if(!TransitPanchang) throw new Error('Transit/Panchang module is unavailable on the backend.');
    return res.json(TransitPanchang.transit(req.body||{}));
  } catch(e) { console.error('Transit calculation error:', e?.stack||e); return res.status(400).json({error:e?.message||'Transit calculation failed.'}); }
});

app.post('/api/horoscope/panchang', async (req,res)=>{
  try {
    if(!TransitPanchang) throw new Error('Transit/Panchang module is unavailable on the backend.');
    return res.json(TransitPanchang.panchang(req.body||{}));
  } catch(e) { console.error('Panchang calculation error:', e?.stack||e); return res.status(400).json({error:e?.message||'Panchang calculation failed.'}); }
});

app.post('/api/horoscope/dasa', async (req,res)=>{
  try {
    if (typeof phase4Dasa !== 'function') throw new Error('Phase 4 Dasa engine is unavailable on the backend.');
    const chart=req.body?.chart;
    if (!chart || typeof chart !== 'object') throw new Error('Verified horoscope chart data is required.');
    const result=phase4Dasa(chart);
    return res.json({ok:true,phase4:result});
  } catch(e) {
    console.error('[Dasa] calculation error:', e?.stack||e);
    return res.status(400).json({error:e?.message||'Dasa calculation failed.'});
  }
});

app.post('/api/horoscope/full', async (req,res)=>{
  try {
    const body=req.body||{};
    const chart=calculateVedicChart(body);
    chart.nativeName=String(body.name||body.nativeName||'');
    chart.nameInitial=String(body.nameInitial||body.nativeNameInitial||'');
    if(!chart.nameInitial && chart.nativeName){ try { const seg=new Intl.Segmenter(undefined,{granularity:'grapheme'}); chart.nameInitial=seg.segment(chart.nativeName)[Symbol.iterator]().next().value?.segment||Array.from(chart.nativeName)[0]||''; } catch(e) { chart.nameInitial=Array.from(chart.nativeName)[0]||''; } }
    try { const targetYear=Number(body?.tajakaYear)||new Date().getFullYear(); chart.tajakaAnnual=findTajakaAnnualChart(body,targetYear); } catch(e){ chart.tajakaAnnualError=String(e?.message||e); }
    if(typeof advancedAstrology!=='function') throw new Error('Advanced astrology module is unavailable on the backend.');
    if(!TransitPanchang) throw new Error('Transit/Panchang module is unavailable on the backend.');
    const lang=body.language==='en'?'en':'ta';
    const advanced=advancedAstrology(chart,lang);
    const birthPanchang=TransitPanchang.panchang({...body,date:body.date,time:body.time});
    const dailyDate=String(body.dailyDate||body.date||'');
    const dailyTime=String(body.dailyTime||body.time||'');
    const dailyPanchang=TransitPanchang.panchang({...body,date:dailyDate,time:dailyTime});
    const transit=TransitPanchang.transit({...body,date:dailyDate,time:dailyTime});
    let phase4=null;
    if(typeof phase4Dasa==='function') phase4=phase4Dasa(chart);
    return res.json({ok:true,meta:{complete:true,version:'SMV-full-1'},chart,advanced,birthPanchang,dailyPanchang,transit,phase4});
  } catch(e){
    console.error('[Full] horoscope calculation error:',e?.stack||e);
    return res.status(400).json({ok:false,error:e?.message||'Full horoscope calculation failed.'});
  }
});

app.post('/api/horoscope/advanced', async (req,res)=>{
  try {
    const body=req.body||{};
    console.log('[Advanced] request', {date:body.date,time:body.time,lat:body.lat,lon:body.lon,language:body.language});
    const chart=calculateVedicChart(body);
    chart.nativeName=String(body.name||body.nativeName||'');
    chart.nameInitial=String(body.nameInitial||body.nativeNameInitial||'');
    if(!chart.nameInitial && chart.nativeName){ try { const seg=new Intl.Segmenter(undefined,{granularity:'grapheme'}); chart.nameInitial=seg.segment(chart.nativeName)[Symbol.iterator]().next().value?.segment||Array.from(chart.nativeName)[0]||''; } catch(e) { chart.nameInitial=Array.from(chart.nativeName)[0]||''; } }
    try { const targetYear=Number(body?.tajakaYear)||new Date().getFullYear(); chart.tajakaAnnual=findTajakaAnnualChart(body,targetYear); } catch(e){ chart.tajakaAnnualError=String(e?.message||e); }
    if (typeof advancedAstrology !== 'function') throw new Error('Advanced astrology module is unavailable on the backend.');
    const result=advancedAstrology(chart, body.language==='en'?'en':'ta');
    if (!result || typeof result !== 'object') throw new Error('Advanced astrology engine returned an invalid result.');
    if (!result.ashtakavarga || !Array.isArray(result.ashtakavarga.bhinna)) throw new Error('Ashtakavarga engine returned invalid BAV data.');
    console.log('[Advanced] success', {bavRows:result.ashtakavarga.bhinna.length,savTotal:result.ashtakavarga.sarvaTotal});
    return res.json({ok:true,...result});
  } catch(e){
    console.error('[Advanced] calculation error:',e?.stack||e);
    return res.status(400).json({error:e?.message||'Advanced astrology calculation failed.'});
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

    const questionSnap = await db.collection("smv_questions")
      .where("astrologerId", "==", user.uid).get();
    let totalEarnings = 0;
    questionSnap.docs.forEach(d => {
      const q = d.data() || {};
      if (q.status === "answered" && q.commissionStatus === "credited") {
        totalEarnings += Number(q.astrologerCommissionAmount || q.commissionAmount || 0);
      }
    });

    const privateCreditSnap=await db.collection("smv_private_consultations").where("astrologerId","==",user.uid).get();
    privateCreditSnap.docs.forEach(d=>{const c=d.data()||{};if(c.commissionStatus==='credited')totalEarnings+=Number(c.astrologerCreditedAmount??c.astrologerAmount??0);});

    const withdrawalSnap = await db.collection("smv_withdrawals")
      .where("astrologerId", "==", user.uid).get();
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

    const dateKey = indiaDateKey();
    const counterRef = db.collection("smv_counters").doc(`withdrawal_request_${dateKey}`);
    const withdrawalId = await db.runTransaction(async tx => {
      const snap = await tx.get(counterRef);
      const next = (snap.exists ? Number(snap.data()?.lastNumber || 0) : 0) + 1;
      tx.set(counterRef, { lastNumber: next, dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return `SMV-WDT-${dateKey}-${String(next).padStart(2, "0")}`;
    });

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

    const withdrawalRef = db.collection("smv_withdrawals").doc();
    await withdrawalRef.set({
      astrologerId: user.uid,
      astrologerName: profile.name || user.name || user.displayName || "Astrologer",
      amount,
      withdrawalId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      requestedAt: FieldValue.serverTimestamp()
    });

    // Private admin-only snapshot. Never place bank details in smv_withdrawals,
    // because the astrologer is allowed to read their own withdrawal document.
    await db.collection("smv_withdrawal_payouts").doc(withdrawalRef.id).set({
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
      createdAt: FieldValue.serverTimestamp()
    });

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

// V169: Admin marks an astrologer withdrawal as paid.
// Idempotent: creates SMV-PMT exactly once, including repairing an older
// paid withdrawal that was saved without an Admin Payment ID.
app.post("/admin/withdrawal-mark-paid", express.json({limit:"5kb"}), async (req, res) => {
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdminUser(user))) return res.status(403).json({error:"Admin access denied."});
  try {
    const withdrawalDocId = String(req.body?.withdrawalDocId || "").trim();
    if (!withdrawalDocId) return res.status(400).json({error:"Withdrawal document ID is required."});
    const withdrawalRef = db.collection("smv_withdrawals").doc(withdrawalDocId);
    const dateKey = indiaDateKey();
    const counterRef = db.collection("smv_counters").doc(`admin_payment_${dateKey}`);

    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(withdrawalRef);
      if (!snap.exists) throw new Error("Withdrawal request not found.");
      const w = snap.data() || {};
      const status = String(w.status || "").toLowerCase();

      // Already paid with a proper PMT: safe retry, return the same ID.
      const existingAdminPaymentId = String(w.adminPaymentId || "").trim();
      if (status === "paid" && /^SMV-PMT-/.test(existingAdminPaymentId)) {
        return {paymentId: existingAdminPaymentId, withdrawalId:String(w.withdrawalId || ""), amount:Number(w.amount || 0), repaired:false};
      }

      // A previous version may have marked the withdrawal paid but failed to
      // attach SMV-PMT. Repair it here without changing the SMV-WDT.
      if (status !== "processing" && status !== "paid") {
        throw new Error("Only a processing withdrawal can be marked as paid.");
      }

      const c = await tx.get(counterRef);
      const next = (c.exists ? Number(c.data()?.lastNumber || 0) : 0) + 1;
      const id = `SMV-PMT-${dateKey}-${String(next).padStart(2,"0")}`;
      tx.set(counterRef, {lastNumber:next, dateKey, updatedAt:FieldValue.serverTimestamp()}, {merge:true});
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

    const withdrawalSnap = await db.collection("smv_withdrawals").doc(withdrawalDocId).get();
    if (!withdrawalSnap.exists) return res.status(404).json({ error: "Withdrawal request not found." });
    const withdrawal = withdrawalSnap.data() || {};

    const snapshotRef = db.collection("smv_withdrawal_payouts").doc(withdrawalDocId);
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

// V142 location autocomplete: server-side geocoding keeps provider details out of the browser.
const geocodeRateBuckets = new Map();
app.get("/api/geocode", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().replace(/\s+/g, " ");
    if (q.length < 3) return res.json({ ok:true, results:[] });

    const ip = String(
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown"
    ).split(",")[0].trim();

    const now = Date.now();
    const last = geocodeRateBuckets.get(ip) || 0;

    if (now - last < 1100) {
      return res.status(429).json({
        error:"Please wait a moment before searching another place."
      });
    }

    geocodeRateBuckets.set(ip, now);

    const u = new URL("https://photon.komoot.io/api/");
    u.searchParams.set("q", q);
    u.searchParams.set("limit", "50");
    u.searchParams.set("lang", "en");

    // India bounding box:
    // west,south,east,north
    u.searchParams.set("bbox", "68,6,98,37");

    const r = await fetch(u, {
      headers: {
        "Accept":"application/json",
        "User-Agent":"SMV-ASTRO/142 birth-place-autocomplete"
      },
      signal:AbortSignal.timeout(10000)
    });

    if (!r.ok) {
      return res.status(502).json({
        error:"Location service is temporarily unavailable."
      });
    }

    const data=await r.json();
    const features=Array.isArray(data.features) ? data.features : [];
    const seen=new Set();

    const results=features.map(f=>{
      const p=f.properties || {};
      const c=f.geometry?.coordinates || [];
      const lon=Number(c[0]);
      const lat=Number(c[1]);

      const name=p.name || "";
      const city=p.city || p.town || p.village || p.municipality || p.county || "";
      const state=p.state || "";
      const country=p.country || "India";
      const postcode=p.postcode || "";

      const parts=[name,city,state,postcode,country]
        .filter(Boolean)
        .filter((v,i,a)=>a.indexOf(v)===i);

      return {
        place:parts.join(", "),
        latitude:Number(lat.toFixed(6)),
        longitude:Number(lon.toFixed(6)),
        city,
        state,
        country
      };
    }).filter(x=>{
      if(!Number.isFinite(x.latitude)||!Number.isFinite(x.longitude)||!x.place) return false;
      if(x.country && x.country.toLowerCase()!=="india") return false;

      const key=x.latitude.toFixed(6)+","+x.longitude.toFixed(6);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,50);

    return res.json({ok:true,results});

  } catch(e) {
    console.error("Geocode error:",e?.message||e);
    return res.status(502).json({
      error:"Unable to search this place right now. Please try again."
    });
  }
});;;;;

app.post("/api/horoscope/calculate", async (req,res)=>{
  try {
    const body=req.body||{};
    console.log("Horoscope request:", {date: body.date, time: body.time, lat: body.lat, lon: body.lon});
    const chart = calculateVedicChart(body);
    // Core horoscope endpoint intentionally returns ONLY the core verified chart.
    // Advanced astrology is loaded separately by the browser so heavy tables and
    // Phase 4 Dasa calculations cannot block the Generate Horoscope UI.
    return res.json(chart);
  } catch(e){
    console.error("Horoscope calculation error:", e?.stack || e);
    return res.status(400).json({
      error: e?.message || "ஜாதக கணக்கீடு தோல்வியடைந்தது.",
      engineAvailable:!!Astronomy,
      received:{date:req.body?.date||null,time:req.body?.time||null,lat:req.body?.lat??null,lon:req.body?.lon??null}
    });
  }
});

app.post("/api/horoscope/ai-future", express.json({ limit: "60kb" }), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI future generation is not configured. Add GEMINI_API_KEY in Render Environment Variables." });
    }
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const bucket = aiRateBuckets.get(ip) || { start: now, count: 0 };
    if (now - bucket.start >= AI_RATE_LIMIT_WINDOW_MS) { bucket.start = now; bucket.count = 0; }
    bucket.count += 1;
    aiRateBuckets.set(ip, bucket);
    if (bucket.count > AI_RATE_LIMIT_MAX) {
      return res.status(429).json({ error: "AI பலன் உருவாக்கும் வரம்பு தற்காலிகமாக நிறைவடைந்துள்ளது. சில நிமிடங்கள் கழித்து மீண்டும் முயற்சிக்கவும்." });
    }

    const chart = req.body?.chart;
    const language = String(req.body?.language || "en").toLowerCase() === "ta" ? "ta" : "en";
    if (!chart || typeof chart !== "object") return res.status(400).json({ error: "Chart data is required." });

    // IMPORTANT: Gemini is an interpretation layer only. It must not recalculate
    // astronomy or replace Swiss Ephemeris / Bhava Sphuta values.
    const prompt = `
You are the ${language === "ta" ? "Tamil" : "English"}-language interpretation assistant for SMV ASTRO.
Generate a traditional Vedic astrology interpretation using ONLY the verified chart data supplied below.
Do NOT recalculate planetary positions, ascendant, houses, bhava sphuta, or dasha dates. Do not invent missing data.
Clearly distinguish traditional astrological interpretation from factual certainty. Never promise or guarantee future events.
Write in clear, respectful ${language === "ta" ? "Tamil" : "English"} only. Do not mix languages.
Avoid medical, legal, financial or other high-stakes instructions; where such topics arise, advise the user to consult a qualified professional.

Return these sections with concise headings:
${language === "ta" ? `1. பொதுவான வாழ்க்கை நோக்கு
2. தொழில் / கல்வி
3. பணநிலை
4. திருமணம் / உறவுகள்
5. குடும்பம்
6. முக்கிய வாய்ப்புகள்
7. கவனிக்க வேண்டிய காலங்கள்
8. பாரம்பரிய பரிகார வழிகாட்டல் (optional, non-coercive)
9. முக்கிய குறிப்பு — இது பாரம்பரிய ஜோதிட விளக்கம்; உறுதியான எதிர்கால உத்தரவாதம் அல்ல.` : `1. General Life Outlook
2. Career / Education
3. Finance
4. Marriage / Relationships
5. Family
6. Important Opportunities
7. Important Periods
8. Traditional Guidance (optional, non-coercive)
9. Important Note — this is a traditional astrology interpretation and not a guarantee of future events.`}

Verified chart data:
${JSON.stringify(chart, null, 2)}
`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      let body = {}, r = null, lastDetail = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: `You are a careful ${language === "ta" ? "Tamil" : "English"} Vedic astrology interpretation assistant. Use only supplied verified chart data, respond only in ${language === "ta" ? "Tamil" : "English"}, and never claim certainty.` }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2800, thinkingConfig: { thinkingLevel: "low" } }
          }),
          signal: controller.signal
        });
        body = await r.json().catch(() => ({}));
        if (r.ok) break;
        lastDetail = body?.error?.message || `Gemini API HTTP ${r.status}`;
        if (![429,500,502,503,504].includes(r.status) || attempt === 2) break;
        await new Promise(resolve => setTimeout(resolve, 1200 * (2 ** attempt)));
      }
      if (!r?.ok) {
        if (r?.status === 503) lastDetail = "Gemini is temporarily busy. The app retried automatically; please try again in a few seconds.";
        return res.status(502).json({ error: `AI service error: ${lastDetail}` });
      }
      const text = body?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\\n").trim();
      if (!text) return res.status(502).json({ error: "AI service returned an empty interpretation. Please try again." });
      return res.json({ ok: true, model: GEMINI_MODEL, text });
    } finally { clearTimeout(timer); }
  } catch (e) {
    console.error("AI future generation error:", e);
    return res.status(500).json({ error: e?.name === "AbortError" ? "AI service timed out. Please try again." : (e?.message || "AI generation failed.") });
  }
});

app.post("/api/horoscope/calculate-legacy", async (req,res)=>{
  try { return res.json(calculateVedicChart(req.body||{})); }
  catch(e){ return res.status(400).json({error:e?.message||"ஜாதக கணக்கீடு தோல்வியடைந்தது."}); }
});

app.post("/api/horoscope/validate", async (req,res)=>{
  try {
    const chart=calculateVedicChart(req.body||{});
    return res.json({ok:true,chart,validation:{referenceEngine:"Swiss Ephemeris",license:"See Swiss Ephemeris / sweph licensing terms",note:"Validation endpoint uses Swiss Ephemeris sidereal positions and house cusps. Ensure your ephemeris data and licensing are configured for your deployment."}});
  } catch(e){ return res.status(400).json({error:e?.message||"Validation failed.",engineAvailable:!!Astronomy}); }
});

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
    const eventRef = db.collection("razorpay_webhook_events").doc(eventKey);
    if ((await eventRef.get()).exists) return res.status(200).send("OK");
    await eventRef.set({ event: eventType, razorpayPaymentId: paymentId, razorpayOrderId: orderId, receivedAt: FieldValue.serverTimestamp(), processed: false });
    if (orderId) {
      const orderRef = db.collection("razorpay_orders").doc(orderId);
      const orderSnap = await orderRef.get();
      const stored = orderSnap.exists ? orderSnap.data() : {};
      const newStatus = ["payment.captured", "order.paid"].includes(eventType) ? "paid" : eventType === "payment.failed" ? "failed" : null;
      if (newStatus) await orderRef.set({ status: newStatus, razorpayPaymentId: paymentId, lastWebhookEvent: eventType, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (newStatus === "paid" && stored.questionId && paymentId) {
        try {
          const qSnap = await db.collection("smv_questions").doc(stored.questionId).get();
          if (qSnap.exists && qSnap.data().paymentStatus !== "paid") await markQuestionPaid(stored.questionId, orderId, paymentId, "", "razorpay_webhook");
        } catch (e) { console.error("Webhook question update failed:", e); }
      }
      if (newStatus === "failed" && stored.consultationId) {
        const cref=db.collection("smv_private_consultations").doc(stored.consultationId);
        await cref.set({status:"payment_failed",paymentStatus:"failed",paymentUpdatedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
        const cs=await cref.get(), c=cs.exists?(cs.data()||{}):{};
        const customerEmail=String(await resolveCustomerEmail({...c,customerEmail:c.customerEmail||stored.customerEmail,firebaseUid:c.customerId||stored.firebaseUid})||"").trim();
        const amount=paymentEntity?.amount!=null?Number(paymentEntity.amount)/100:Number(c.amount||stored.amount||0)/100;
        const failedText=`A private consultation payment was not completed.\n\nConsultation ID: ${stored.consultationId}\nAmount: ₹${Number(amount||0).toFixed(2)}\nRazorpay Payment ID: ${paymentId||"N/A"}\nRazorpay Order ID: ${orderId||"N/A"}\nStatus: Failed`;
        await Promise.allSettled([
          sendEventEmailOnce({eventKey:`private:${stored.consultationId}:payment_failed:${paymentId||orderId}`,to:[customerEmail],subject:"SMV ASTRO — Private Consultation Payment Failed",replyTo:ADMIN_EMAIL,text:failedText,context:{consultationId:stored.consultationId,paymentId,event:"payment_failed"}}),
          sendEventEmailOnce({eventKey:`private:${stored.consultationId}:payment_failed_admin:${paymentId||orderId}`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — Private Consultation Payment Failed",text:failedText,context:{consultationId:stored.consultationId,paymentId,event:"payment_failed_admin"}}),
          addAdminEventNotification("private_payment_failed","Private Consultation Payment Failed",`Payment failed for private consultation ${stored.consultationId}.`,{consultationId:stored.consultationId,paymentId:paymentId||null,razorpayOrderId:orderId||null})
        ]);
      }
      if (newStatus === "failed" && stored.questionId) {
        await db.collection("smv_questions").doc(stored.questionId).set({ status: "payment_failed", paymentStatus: "failed", paymentUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
        const qSnap = await db.collection("smv_questions").doc(stored.questionId).get();
        const q = qSnap.exists ? (qSnap.data() || {}) : {};
        const customerEmail = String(q.customerEmail || stored.customerEmail || await getUserEmail(q.customerId || stored.firebaseUid) || "").trim();
        const amount = paymentEntity?.amount != null ? Number(paymentEntity.amount) / 100 : Number(q.amount || stored.amount || 0);
        const failedText=`A SMV ASTRO payment was not completed.\n\nQuestion ID: ${stored.questionId}\nAmount: ₹${Number(amount || 0).toFixed(2)}\nRazorpay Payment ID: ${paymentId || "N/A"}\nRazorpay Order ID: ${orderId || "N/A"}\nStatus: Failed`;
        await Promise.allSettled([
          sendEventEmailOnce({eventKey:`public:${stored.questionId}:payment_failed:${paymentId||orderId}`,to:[customerEmail],subject:"SMV ASTRO — Payment Failed",replyTo:ADMIN_EMAIL,text:failedText,context:{questionId:stored.questionId,paymentId,event:"payment_failed"}}),
          sendEventEmailOnce({eventKey:`public:${stored.questionId}:payment_failed_admin:${paymentId||orderId}`,to:[ADMIN_EMAIL],subject:"SMV ASTRO — Customer Payment Failed",text:failedText,context:{questionId:stored.questionId,paymentId,event:"payment_failed_admin"}}),
          addAdminEventNotification("payment_failed","Question Payment Failed",`Payment failed for question ${stored.questionId}.`,{questionId:stored.questionId,paymentId:paymentId||null,razorpayOrderId:orderId||null})
        ]);
      }
    }
    // Refund and other Razorpay transaction events are always copied to Admin.
    if (eventType.startsWith("refund.")) {
      const refundEntity = event?.payload?.refund?.entity || {};
      const refundPaymentId = String(refundEntity.payment_id || paymentId || "").trim();
      const amount = refundEntity.amount != null ? Number(refundEntity.amount) / 100 : null;

      // Reconcile the real Razorpay refund back to the customer's question.
      // Refund webhooks normally carry payment_id rather than order_id.
      if (refundPaymentId) {
        try {
          const qSnap = await db.collection("smv_questions").get();
          const match = qSnap.docs.find(d => String(d.data()?.razorpayPaymentId || "") === refundPaymentId);
          if (match) {
            const qRef = match.ref;
            const status = String(refundEntity.status || "").toLowerCase();
            const patch = {
              refundId: refundEntity.id || FieldValue.delete(),
              refundPaymentId,
              refundAmount: amount != null ? amount : Number(match.data()?.refundAmount || 0),
              ...bankReferences(refundEntity,match.data()||{}),
              refundStatus: status || (eventType === "refund.processed" ? "processed" : eventType.replace("refund.", "")),
              updatedAt: FieldValue.serverTimestamp()
            };
            if (eventType === "refund.processed" || status === "processed") patch.refundProcessedAt = match.data()?.refundProcessedAt || FieldValue.serverTimestamp();
            if (eventType === "refund.failed" || status === "failed") patch.refundFailedAt = match.data()?.refundFailedAt || FieldValue.serverTimestamp();
            await qRef.set(patch, {merge:true});
          }
        } catch (reconcileError) {
          console.error("Refund-to-question reconciliation failed:", reconcileError);
        }
      }

      await sendAdminTransactionEmail({
        eventType: eventType.toUpperCase(),
        paymentId: refundEntity.payment_id || paymentId,
        orderId,
        amount,
        currency: refundEntity.currency || "INR",
        questionId: stored?.questionId || null,
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

// Horoscope browser runtime assets are deployed under public/horoscope.
// Serve only this subtree; all existing API/Firebase/Razorpay/PDF routes remain unchanged.
const HOROSCOPE_PUBLIC_DIR = path.join(__dirname, "public", "horoscope");
app.use("/horoscope", express.static(HOROSCOPE_PUBLIC_DIR, {
  fallthrough: true,
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
    else if (filePath.endsWith(".mjs")) res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  }
}));

app.use((req, res) => {
  console.warn("Unhandled backend route:", req.method, req.originalUrl);
  if (req.path.startsWith("/api/") || req.path.includes("withdrawal")) {
    return res.status(404).json({ error: "Backend endpoint not found.", path: req.originalUrl });
  }
  return res.status(404).send("Not Found");
});

answerCredit.start();
app.listen(PORT, "0.0.0.0", () => console.log(`SMV ASTRO Razorpay backend running on port ${PORT}`));
