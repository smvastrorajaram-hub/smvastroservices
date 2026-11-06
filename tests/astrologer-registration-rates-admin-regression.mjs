import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const html = read("public/index.html");
const frontend = read("public/smvastro.mjs");
const backend = read("server.js");
const security = read("api-security.js");
const publicContent = read("public/public-content.mjs");

function between(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, "Missing section start: " + start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, "Missing section end: " + end);
  return source.slice(from, to);
}

test("Astrologer registration requires Live Chat and Live Call rates capped at ₹30", () => {
  assert.match(html, /id="arChatRate"[^>]*type="number"[^>]*min="1"[^>]*max="30"[^>]*step="0\.01"[^>]*required/);
  assert.match(html, /id="arCallRate"[^>]*type="number"[^>]*min="1"[^>]*max="30"[^>]*step="0\.01"[^>]*required/);
  assert.match(html, /arLanguages[\s\S]{0,900}arChatRate[\s\S]{0,450}arCallRate/);
  assert.match(html, /Admin can later change or reduce these rates/);
  assert.match(html, /நிர்வாகி இந்தக் கட்டணங்களை மாற்றவோ குறைக்கவோ முடியும்/);
});

test("Registration frontend sends validated Language and both per-minute rates", () => {
  assert.match(frontend, /languages=String\(\$\("arLanguages"\)/);
  assert.match(frontend, /chatPricePerMinute=Number\(\$\("arChatRate"\)/);
  assert.match(frontend, /callPricePerMinute=Number\(\$\("arCallRate"\)/);
  assert.match(frontend, /chatPricePerMinute<1\|\|chatPricePerMinute>30/);
  assert.match(frontend, /callPricePerMinute<1\|\|callPricePerMinute>30/);
  assert.match(frontend, /JSON\.stringify\(\{name,mobile,specialization,experience,languages,callPricePerMinute,chatPricePerMinute,/);
});

test("Render registration validates and stores rates and Languages on both profile records", () => {
  const registration = between(
    backend,
    'app.post("/register-astrologer-profile"',
    'app.post("/admin/astrologer-professional-details"'
  );
  assert.match(registration, /validRegistrationRate=rate=>Number\.isFinite\(rate\)&&rate>=1&&rate<=30/);
  assert.match(registration, /callPricePerMinute,chatPricePerMinute/);
  assert.match(registration, /languages,spokenLanguages:languages/);
  assert.match(registration, /tx\.set\(userRef,[\s\S]{0,900}languages,spokenLanguages:languages,callPricePerMinute,chatPricePerMinute/);
  assert.match(registration, /tx\.set\(astroRef,[\s\S]{0,500}languages,spokenLanguages:languages,callPricePerMinute,chatPricePerMinute/);
  assert.match(registration, /userRef\.set\(\{name,fullName:name,displayName:name,languages,spokenLanguages:languages,callPricePerMinute,chatPricePerMinute/);
  assert.match(registration, /astroRef\.set\(repair,\{merge:true\}\)/);
});

test("Manual Admin approval preserves registration profile fields through merge writes", () => {
  const approval = between(
    backend,
    'app.post("/admin/approve-astrologer"',
    'app.post("/admin/reject-astrologer"'
  );
  assert.match(approval, /batch\.set\(astroRef,[\s\S]{0,240}\{merge:true\}\)/);
  assert.match(approval, /batch\.set\(userRef,userPatch,\{merge:true\}\)/);
});

test("Qualification Auto Approval preserves registration profile fields through merge writes", () => {
  const automatic = between(
    backend,
    'app.post("/webhooks/google-form/astrologer-qualification"',
    'app.get("/admin/settings-data"'
  );
  assert.match(automatic, /tx\.set\(astroRef,quizPatch,\{merge:true\}\)/);
  assert.match(automatic, /tx\.set\(db\.collection\("smv_users"\)\.doc\(uid\),\{status:"active",updatedAt:FieldValue\.serverTimestamp\(\)\},\{merge:true\}\)/);
});

test("Astrologer Dashboard displays stored Languages and the exact saved Live rates", () => {
  assert.match(frontend, /const rawLanguages=ad\.languages\?\?ad\.spokenLanguages\?\?ad\.language\?\?data\.languages/);
  assert.match(frontend, /<b>Languages:<\/b>[\s\S]{0,180}astrologerLanguages\.join/);
  assert.match(frontend, /<b>Live Chat Rate:<\/b>[\s\S]{0,220}ad\.chatPricePerMinute\?\?data\.chatPricePerMinute/);
  assert.match(frontend, /<b>Live Call Rate:<\/b>[\s\S]{0,220}ad\.callPricePerMinute\?\?data\.callPricePerMinute/);
});

test("Public Astrologer list response and cards use stored Languages and per-minute rates", () => {
  assert.match(backend, /languages,availabilityStatus,manualAvailabilityStatus,activeSessionCount,liveCallEnabled,liveChatEnabled,callPricePerMinute:configuredCallRate\?\?null,chatPricePerMinute:configuredChatRate\?\?null/);
  assert.match(publicContent, /<b>Languages:<\/b>[\s\S]{0,180}languages\.join\(', '\)/);
  assert.match(publicContent, /<b>Call -<\/b>[\s\S]{0,180}callPrice\.toFixed\(2\)/);
  assert.match(publicContent, /<b>Chat -<\/b>[\s\S]{0,180}chatPricePerMinute\.toFixed\(2\)/);
});

test("New Admin professional-details endpoint retains the central 10 KB request-body limit", () => {
  assert.match(security, /'\/admin\/astrologer-professional-details': '10kb'/);
});

test("Admin retains the existing ₹10,000 Live Call and Live Chat edit limit", () => {
  assert.match(frontend, /id="adminCallPrice_\$\{d\.id\}" type="number" min="0" max="10000"/);
  assert.match(frontend, /id="adminLiveChatPrice_\$\{d\.id\}" type="number" min="0" max="10000"/);
  const pricing = between(
    backend,
    'app.post("/admin/astrologer-pricing"',
    'app.get("/admin/astrologers-data"'
  );
  assert.match(pricing, /callPrice>10000/);
  assert.match(pricing, /liveChatPrice>10000/);
});

test("Admin can edit only Experience and Expertise in the separate professional-details route", () => {
  const route = between(
    backend,
    'app.post("/admin/astrologer-professional-details"',
    'app.post("/admin/astrologer-pricing"'
  );
  assert.match(route, /requireUser\(req,res\)/);
  assert.match(route, /isAdminUser\(actor\)/);
  assert.match(route, /specialization:expertise,expertise,experience,experienceYears:experience/);
  assert.doesNotMatch(route, /profileDescription|profileEditAllowed|callPricePerMinute|chatPricePerMinute|languages|spokenLanguages/);
  assert.match(frontend, /SAVE EXPERIENCE &amp; EXPERTISE/);
  assert.match(frontend, /renderApi\('\/admin\/astrologer-professional-details'/);
});

test("Existing Admin Language editing and Profile Edit / Description controls remain available", () => {
  assert.match(frontend, /renderApi\('\/admin\/astrologer-languages'/);
  assert.match(frontend, /renderApi\('\/admin\/astrologer-pricing'/);
  assert.match(frontend, /data-profile-permission/);
  assert.match(frontend, /data-profile-save/);
  assert.match(frontend, /data-profile-approve/);
  assert.match(frontend, /data-profile-reject/);
  assert.match(backend, /app\.post\("\/admin\/astrologer-profile-permission"/);
  assert.match(backend, /app\.post\("\/admin\/astrologer-profile-description"/);
});
