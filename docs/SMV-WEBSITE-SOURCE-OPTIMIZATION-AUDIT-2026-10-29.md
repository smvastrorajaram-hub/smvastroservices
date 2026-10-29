
# SMV ASTRO • SMV HOROSCOPE • SMV CALENDAR
## முழு Source-Level Optimization Audit

**Audit தேதி:** 29 அக்டோபர் 2026  
**ஆய்வு அடிப்படை:** smvastrorajaram-hub/smvastroservices repository-யின் தற்போதைய main source; தனி Horoscope / Calendar PWA deployment repositories மற்றும் tracked GitHub Actions workflow-களும் ஆய்வு செய்யப்பட்டன.

> **இது report-only PR.** இந்த PR source/runtime/configuration/Firestore/Render/Firebase/Razorpay, astrology calculations, user data அல்லது live deployment எதையும் மாற்றாது. கண்டறிந்தவற்றுக்கும் பரிந்துரைக்கப்பட்ட மாற்றங்களுக்கும் தனித்த implementation PR-கள் பின்னர் உருவாக்கப்பட வேண்டும்.

## 1. Executive Summary

மூன்று தளங்களிலும் ஏற்கனவே வலுவான astrology calculation regression tests, focused browser smoke tests, Firestore Rules emulator tests, PWA offline asset preservation மற்றும் server-side Wallet ledger safeguards உள்ளன. இவை பாதுகாக்கப்பட வேண்டும்.

அடுத்த optimization கட்டத்தில் முதலில் செய்ய வேண்டியவை:

1. **API request size enforcement:** server.js-இல் 15 MB global JSON parser, பின்னர் குறிப்பிடப்பட்டுள்ள 5–30 KB route-specific parsers-க்கு முன் ஓடுகிறது. இதனால் சிறிய route-specific limits உண்மையில் அமலாகிறதா என்பதைத் தெளிவான test மூலம் உறுதி செய்து, parsing-ஐ route-aware ஆக்க வேண்டும்.
2. **Astrology feature code splitting:** Horoscope-ல் பெரிய calculation / prediction / marriage-matching scripts initial HTML-இலேயே பல synchronous requests ஆக ஏற்றப்படுகின்றன. feature திறக்கும் போது தேவையான module மட்டும் ஏற்ற வேண்டும்; எந்தக் கணக்கீட்டின் output-யும் மாற்றக்கூடாது.
3. **Calendar deployment bundle:** தனி Calendar build, முழு Horoscope source folder-ஐ _site-க்கு copy செய்கிறது; Calendar page horoscope.css மற்றும் horoscope.js-ஐயும் load செய்கிறது. dependency allowlist, generated-site link checks மற்றும் browser smoke test தேவை.
4. **Storage / Service Worker safety:** main-site HTML-ல் first-load code localStorage.clear(), sessionStorage.clear() மற்றும் origin Cache API cache-களை அழிக்கிறது. இதை scoped cleanup ஆக மாற்றும் முன் installed PWA, saved preferences, offline place search மற்றும் in-progress user work ஆகியவற்றை test செய்ய வேண்டும்.
5. **Security hardening:** ALLOWED_ORIGINS parse செய்யப்படுகிறது; ஆனால் server CORS response-ல் wildcard * தான் பயன்படுத்தப்படுகிறது. மேலும் application-level rate-limiting middleware source-ல் காணப்படவில்லை. Production behavior-ஐ உடனடியாக மாற்றாமல் staging tests தேவை.

**Performance scores / live timings இந்த source inspection-ல் அளவிடப்படவில்லை.** கீழே உள்ள JS/CSS sizes repository-யில் உள்ள raw file sizes; compression செய்யப்பட்ட download size அல்லது Lighthouse score அல்ல.

## 2. Audit Scope & Evidence

ஆய்வு செய்யப்பட்டவை:

- server.js, wallet-service.js, live-session-service.js, refund-service.js, multi-project-firestore.js
- firestore.rules, Wallet / Live Session / Firestore tests மற்றும் தொடர்புடைய CI workflows
- public/index.html, public/smvastro.mjs, public/smvastro.css, public/sw.js, public/_headers
- public/horoscope/index.html, Horoscope calculation/report/matching modules, CSS மற்றும் public/horoscope/sw.js
- Calendar shell, worker, calculation/WASM/offline assets மற்றும் public/horoscope/calendar/sw.js
- smv-horoscope-pwa, smv-calendar-pwa build scripts/workflows
- tracked GitHub Actions deployment, browser smoke, source regression மற்றும் numerical QA workflows

**வரம்பு:** இது source/workflow review; production session-களில் dynamic penetration test, Lighthouse/WebPageTest run, real Android browser profiling அல்லது live Firebase/Razorpay transaction test செய்யப்படவில்லை. அதனால் dynamic exploitation அல்லது குறிப்பிட்ட percentage speed improvement எனக் கூறவில்லை.

## 3. Findings — முன்னுரிமை அடிப்படையில்

### P1 — Request body limits: global parser vs route-specific parsers
**Source:** server.js lines ~342–360 மற்றும் route declarations (உதா. /contact-query, Admin settings, pricing, review, refund endpoints).

Global middleware:
- Razorpay webhook route-ஐத் தவிர்த்து, எல்லா request-களுக்கும் express.json({ limit: "15mb" }) பயன்படுத்துகிறது.

பின்னர் சில routes தனியாக 5 KB, 10 KB, 20 KB அல்லது 30 KB parser limit-களை அறிவிக்கின்றன. Request body ஏற்கனவே global middleware மூலம் parse செய்யப்பட்டிருந்தால், பின்னர் route parser அந்த body-ஐ மீண்டும் parse செய்யாமல் skip செய்யலாம். இதனால் route-களின் குறிப்பிட்ட size limit எதிர்பார்த்தபடி செயல்படாமல் போகும் அபாயம் உள்ளது.

**பரிந்துரை:** request path/content-type அடிப்படையில் body parsing மற்றும் size policy-ஐ அமைக்கவும். 15 MB அவசியமான payload route-களைத் தனியாக allow-list செய்யவும்; மீதமுள்ள route-களுக்கு குறைந்த limit. Razorpay webhook raw-body signature verification அப்படியே பாதுகாக்கப்பட வேண்டும்.

**Acceptance test:** ஒவ்வொரு முக்கிய route-க்கும் normal valid payload success; configured limit-ஐ மீறும் payload HTTP 413; webhook HMAC valid/invalid test; photo/profile upload போன்ற அனுமதிக்கப்பட்ட பெரிய payload-கள் regression இல்லாமல் இயங்குதல். Implementation PR-க்கு முன் இதை verify செய்ய வேண்டும்.

### P1 — Horoscope initial load: பெரிய synchronous JavaScript/CSS தொகுப்பு
**Sources:** public/horoscope/index.html, public/horoscope/horoscope.css, public/horoscope/horoscope.js, horoscope-life-engine.js, horoscope-judgement-engine.js, prediction-synthesis.js, marriage-matching.js.

தற்போதைய HTML பல classic scripts-ஐ defer இன்றி initial page-லேயே load செய்கிறது; Marriage Matching மற்றும் பல advanced/report engines user அந்த feature-ஐ இன்னும் திறக்காவிட்டாலும் eager-load ஆகின்றன. Repository raw sizes-ல் உதாரணங்கள்: Horoscope CSS ~419 KB; horoscope.js ~327 KB; horoscope-life-engine.js ~452 KB; horoscope-judgement-engine.js ~505 KB; marriage-matching.js ~719 KB; prediction-synthesis.js ~338 KB. இவை source sizes மட்டுமே.

**பரிந்துரை:** feature entrypoints-ஆக பிரிக்கவும்: app shell/auth, base chart, extended reading, predictions, marriage matching, Admin prediction editor, printing/saved reports. User request அல்லது section activation நேரத்தில் மட்டும் lazy-load செய்யவும். Browser cache-க்கு immutable/hash-based asset names அல்லது consistent versioning பயன்படுத்தவும். ஒரே நேரத்தில் பல calculation engines-ஐ refactor செய்யாமல் சிறு PR-களாகச் செய்யவும்.

**பாதுகாப்பு நிபந்தனை:** numeric astrology output, Dasa, Shadbala, Ashtakavarga, Ayurdaya, marriage matching, time-zone/DST மற்றும் Tamil/English output ஆகியவை எந்த மாற்றத்திற்குப் பிறகும் ஏற்கனவே உள்ள numerical QA-வுடன் ஒப்பாக இருக்க வேண்டும். Feature code split காரணமாக calculation order/rounding/engine input மாறக்கூடாது.

### P1 — Calendar தனி bundle-ல் தேவையற்ற Horoscope source சேர்க்கப்படுகிறது
**Sources:** smv-calendar-pwa/build.sh, public/horoscope/calendar/index.html, public/horoscope/calendar/sw.js.

Calendar build முழு _source/public/horoscope folder-ஐ _site-க்கு copy செய்கிறது; Calendar app shell மற்றும் manifests-ஐ root-க்கு promote செய்கிறது; பின்னர் nested calendar folder-ஐ மட்டும் நீக்குகிறது.

இதனால் Calendar deployment artifact-ல் Calendar-க்கு தேவையில்லாத Horoscope prediction, matching, Admin workbench மற்றும் பிற files சேரும் வாய்ப்பு உள்ளது. Calendar HTML-மும் ../horoscope.css மற்றும் ../horoscope.js load செய்கிறது; shared calculation-க்காகத் தேவையானது எது, UI-க்காகத் தேவையானது எது என்று பிரித்தறிய வேண்டும்.

**பரிந்துரை:** generated dependency manifest/allowlist உருவாக்கி, Calendar shell, Calendar worker/UI, shared astronomy calculation modules, Swiss Ephemeris WASM/vendor/data மற்றும் தேவையான location search assets மட்டும் package செய்யவும். horoscope.js-ஐ நேரடியாக நீக்க வேண்டாம்; அது தற்போது பயன்படுத்தும் calculation API-ஐ முதலில் பிரித்து regression test சேர்க்கவும்.

**Acceptance test:** generated _site-ல் உள்ள அனைத்து local src/href references resolve ஆக வேண்டும்; 404 இல்லாமல் Calendar home/Admin/manifest/icon/worker இயங்க வேண்டும்; Online + offline Calendar smoke test; Panchang/Hora/transit/Moonrise outputs exact-equality tests-ல் match ஆக வேண்டும்.

### P1 — Main site first-load storage/cache reset மிகப் பரந்தது
**Source:** public/index.html initial inline scripts (V122 reset மற்றும் V201 cache guard).

தற்போதைய code first-load marker இல்லாவிட்டால்:
- localStorage.clear()
- sessionStorage.clear()
- origin-இன் Cache API cache entries அனைத்தையும் delete செய்ய முயற்சிக்கிறது.

இது Firebase தரவுத்தளத்தை அழிப்பதில்லை; ஆனால் browser-side preferences, origin-scoped offline assets மற்றும் unrelated cached resources-ஐயும் நீக்கக்கூடும். குறிப்பாக offline place-search cache மீண்டும் populate ஆகும் வரை offline பயன்பாட்டை பாதிக்கலாம்.

**பரிந்துரை:** குறிப்பிட்ட legacy key-களையும் குறிப்பிட்ட SMV cache namespace-களையும் மட்டுமே migrate/clear செய்யவும். smv-astro-offline-places மற்றும் இந்திய offline location data-வை எப்போதும் பாதுகாக்கவும். App-level storage schema migration-க்கு versioned allowlist பயன்படுத்தவும்; blanket clear பயன்படுத்த வேண்டாம்.

**Acceptance test:** first install, repeat visit, existing user session, language/theme preference, saved browser-side state, offline location search, /, /horoscope/, /horoscope/calendar/ மற்றும் independent subdomain PWA ஒவ்வொன்றிலும் test செய்யவும். Firebase data, IndexedDB/India place data மற்றும் saved reports மாறக்கூடாது.

### P1 — Service Worker activation open page-ஐ தானாக reload செய்கிறது
**Sources:** public/horoscope/sw.js மற்றும் public/sw.js.

இரு workers-லும் activation போது open window clients-ஐ கண்டறிந்து client.navigate(client.url) மூலம் reload செய்கின்றன. இது stale worker-ஐ விரைவாக மாற்ற உதவலாம்; ஆனால் அதே நேரத்தில் open form, saved report authoring, checkout/payment verification அல்லது live call/chat screen-ஐ user அறியாமல் refresh செய்யும் சாத்தியம் உள்ளது.

**பரிந்துரை:** update கிடைத்ததை controlled message/banner மூலம் அறிவித்து, user safe நிலையில் இருக்கும்போது activate/reload செய்யும் முறையைச் சோதிக்கவும். Active Live Session, payment/checkout, unsaved Admin edit போன்ற செயல்களில் forced reload தடுக்கப்பட வேண்டும். Existing cache version recovery மற்றும் location cache preservation-ஐ இழக்கக்கூடாது.

**Acceptance test:** idle page update, active form update, live call/chat update, checkout update, slow/offline network மற்றும் multiple installed PWA contexts.

### P1 — CORS wildcard; configured origin list பயன்பாட்டில் இல்லை
**Source:** server.js lines ~342–360.

ALLOWED_ORIGINS environment variable parse செய்யப்படுகிறது; source inspection-ல் அது response policy-க்கு பயன்படுத்தப்படுவது காணப்படவில்லை. CORS middleware எல்லா requests-க்கும் Access-Control-Allow-Origin: * அமைக்கிறது, மேலும் Authorization header-ஐ அனுமதிக்கிறது. Firebase bearer token flow காரணமாக wildcard intentional ஆக இருக்கலாம்; எனவே இது தனியாக vulnerability என்று முடிவு செய்யப்படவில்லை. ஆனால் origin policy மற்றும் configuration இடையே mismatch உள்ளது.

**பரிந்துரை:** உண்மையில் தேவையான web origins-ஐ inventory செய்து, allowed-origin policy-ஐ explicit ஆக enforce செய்யவும் அல்லது wildcard intentional என்பதற்கான காரணத்தை document செய்யவும். smvastroservices.in, Pages preview/production, Horoscope/Calendar custom domains மற்றும் பிற approved integration-களுக்கு preflight tests சேர்க்கவும். Origin header-ஐ authentication-க்கு மாற்றாக பயன்படுத்தக்கூடாது.

### P1/P2 — Application-level abuse/rate-limit policy தெளிவாக இல்லை
**Sources:** server.js, package.json.

Reviewed server source/package-ல் பொதுவான rate-limit middleware அல்லது express-rate-limit dependency காணப்படவில்லை. இது upstream hosting protection இல்லை என்பதை நிரூபிப்பதில்லை; application-level policy மட்டும் source-ல் தெளிவாகத் தெரியவில்லை.

**பரிந்துரை:** contact form, customer/astrologer ID lookup, GeoNames/location search, public review/list endpoints, login-adjacent APIs மற்றும் payment/recharge creation போன்ற resource/cost-sensitive routes-க்கு per-IP/per-account limits, request timeouts, payload validation மற்றும் abuse telemetry சேர்க்கவும். Wallet, payment, refund அல்லது commission endpoints-ல் retries idempotent ஆகவே இருக்க வேண்டும்; successful financial write-ஐ மற்ற Firebase project-க்கு blind retry செய்யக்கூடாது.

**Acceptance test:** normal mobile traffic false-positive block இல்லாமல் இயங்க வேண்டும்; burst traffic controlled 429 பெற வேண்டும்; legitimate retry/idempotency மற்றும் webhook replay behavior உறுதி செய்யப்பட வேண்டும்.

### P2 — Main page module மிகப் பெரியது; public content மற்றும் dashboards ஒன்றாக உள்ளன
**Sources:** public/index.html, public/smvastro.mjs.

Main HTML ~84 KB மற்றும் root app module raw source ~335 KB. ஒரே module-ல் Firebase initialization/auth, Customer/Astrologer/Admin dashboard, Wallet/Live Session-related UI, public content மற்றும் பல handlers உள்ளன. இது regressions-ஐ isolate செய்வதையும் initial parsing/evaluation-ஐ அளவிடுவதையும் கடினமாக்குகிறது.

**பரிந்துரை:** first-page shell, auth, customer dashboard, astrologer dashboard, admin workspace, wallet, live-session மற்றும் public content ஆகியவற்றை feature modules-ஆக பிரிக்கவும். Dashboard-specific module login/role உறுதி செய்யப்பட்ட பின்பே load ஆக வேண்டும். Firebase SDK instances/shared events duplicate ஆகாமல் single initialization contract வைத்திருக்க வேண்டும்.

### P2 — CSS cascade maintenance debt
**Sources:** public/smvastro.css, public/horoscope/horoscope.css.

Root stylesheet ~605 KB (raw); Horoscope stylesheet ~419 KB (raw). Source scan-ல் ஆயிரக்கணக்கான !important declarations, மீண்டும் மீண்டும் வருகிற selector-கள் மற்றும் பல overlapping rule definitions உள்ளன. இது cascade debugging மற்றும் future visual change risk-ஐ அதிகரிக்கிறது; raw size மட்டும் performance outcome-ஐ நிரூபிக்காது.

**பரிந்துரை:** புதிய override/patch CSS சேர்க்காமல், canonical design tokens/base components/feature stylesheet பகுதிகளைத் தீர்மானித்து duplicate definitions-ஐ batch-ஆக consolidate செய்யவும். ஒவ்வொரு batch-க்கும் desktop/mobile screenshots, typography/contrast checks, Dashboard, chart, print/PDF மற்றும் language regression tests அவசியம். CSS minification-ஐ measured source reorganization-க்கு மாற்றாக மட்டும் பயன்படுத்த வேண்டாம்.

### P2 — Main Pages deploy மற்றும் independent PWA deploy-களுக்கு generated-output validation தேவை
**Sources:** .github/workflows/static.yml, smv-horoscope-pwa/build.sh, smv-calendar-pwa/build.sh, அவற்றின் deploy-pages.yml.

- Main static workflow public/** மாற்றங்களுக்குப் பிறகு main branch push-ல் deploy செய்கிறது; அந்த deploy job-ல் comprehensive HTML/resource smoke gate காணப்படவில்லை.
- Horoscope/Calendar build scripts file existence checks மற்றும் பல string-replacement transformations செய்கின்றன; இவை source text மாறும்போது அமைதியாகத் தோல்வியடையலாம்.
- Independent PWA workflows main source-ஐ schedule/manual dispatch மூலம் checkout செய்கின்றன; main repo workflow secret இல்லாதபோது immediate sync skip செய்யும் வகையில் உள்ளது.

**பரிந்துரை:** deploy-க்கு முன் generated _site-இல் internal link/asset/manifest/CNAME checks, JavaScript syntax, 404 checks மற்றும் browser smoke run செய்யவும். Production deploy workflow தனியாகத் தெளிவாக green gate தேவைப்பட வேண்டும். PR-களில் lightweight smoke gate; heavy numerical astrology audits தற்போதைய dedicated workflows-ல் தொடரலாம். Source update மற்றும் three-host deploy consistency-க்கு version/source SHA marker வைக்கவும்.

### P2 — Security headers baseline tracked Pages configuration-ல் முழுமை பெறவில்லை
**Source:** public/_headers.

Tracked _headers file இப்போது சில Calendar Rasi Palan asset-களுக்கான CORS / Cross-Origin Resource Policy headers மட்டும் குறிப்பிடுகிறது. பொதுவான security headers source config-ல் இல்லை. இது external edge/server config இல்லாததை நிரூபிப்பதில்லை.

**பரிந்துரை:** தற்போதைய inline scripts, Firebase, AdSense, Cloudinary, EventSource/WebRTC மற்றும் subdomain requirements-ஐ inventory செய்து முதலில் CSP Report-Only அறிமுகப்படுத்தவும்; பின்னர் validated policies. Compatibility உறுதி செய்த பின் X-Content-Type-Options, Referrer-Policy, பொருத்தமான Permissions-Policy, frame protection மற்றும் HTTPS policy-ஐ நிறுவவும். HSTS/CSP போன்ற policies-ஐ staging verify இன்றி production-ல் force செய்ய வேண்டாம்.

### P2 — Canonical docs/version baseline புதுப்பிக்க வேண்டும்
**Source:** root README.md மற்றும் related deployment notes.

README audit baseline / audit date 5 October 2026 எனச் சொல்கிறது; current source-ல் October 28, 2026 cache/version markers மற்றும் பின்னர் வந்த changes உள்ளன. இதனால் source-of-truth version மற்றும் deployed variant குறித்த குழப்பம் ஏற்படலாம்.

**பரிந்துரை:** ஒவ்வொரு release/PR-க்கும் canonical source SHA, included PRs, excluded/unmerged PRs, deployment targets, last numerical/browser QA run மற்றும் known blockers ஆகியவை ஒரே short release record-ல் புதுப்பிக்கப்பட வேண்டும்.

## 4. SMV CALENDAR — தனிப்பட்ட கவனம்

- Calendar shell-ஐ Horoscope UI framework-இலிருந்து மெதுவாகப் பிரிக்கவும்; shared calculation layer மட்டும் பொதுவாகப் பயன்படுத்த வேண்டும்.
- Calendar worker-ன் cache keys input-இன் date, coordinates, timezone/UTC offset, calculation settings மற்றும் algorithm revision-ஐ சரியாக பிரதிபலிக்கிறதா test செய்யவும்; language change காரணமாக astronomy calculation மீண்டும் இயக்கப்படக் கூடாது.
- Calendar Service Worker-ன் required core-ல் உள்ள HTML/worker/WASM/vendor assets-க்கு install-time failure தெளிவாக அறியப்பட வேண்டும்.
- புதிய cache namespace migration செய்தாலும் பழைய cache-ல் உள்ள இந்திய offline locations ஏற்கெனவே உள்ள preserveCachedIndiaPlaces() வழிமுறையைப் போலவே பாதுகாக்கப்பட வேண்டும்.
- Panchang/Hora/transit/raasi palan exact-output regressions, timezone/DST tests, admin navigation மற்றும் browser offline test எல்லாம் merge gate ஆக இருக்க வேண்டும்.

## 5. SMV HOROSCOPE — தனிப்பட்ட கவனம்

- Chart calculation core, advanced reading, prediction assembly, marriage matching, Admin prediction authoring, saved-report/print modules ஆகியவற்றை தனித்த load boundaries ஆகப் பிரிக்கவும்.
- Eager-loaded legacy scripts-ஐ நீக்குவதற்கு முன் callsites/exports scan மற்றும் browser-level feature coverage வேண்டும்.
- Horoscope engine version/cache version update ஒரு single checklist-ல் இணைக்கப்பட வேண்டும்; old PWA clients stale JS/CSS-ஐப் பயன்படுத்தவில்லை என்பதை browser smoke validate செய்ய வேண்டும்.
- Tamil/English switching calculation-ஐ மீண்டும் செய்யாமல் content/render மட்டுமே மாற்றுகிறதா test செய்யவும்.
- Saved reports, browser print/Save as PDF, Marriage Matching மற்றும் report identity/download workflow பாதுகாக்கப்பட வேண்டும்.

## 6. SMV ASTRO — தனிப்பட்ட கவனம்

- Main home public shell-இல் customer/admin/astrologer/live-session code அனைத்தும் eager-evaluate ஆகாமல் feature modules ஆக பிரிக்கவும்.
- Dashboard fetch counts, time-to-first-content, Firebase reads, repeated requests, Admin change-signal writes மற்றும் SSE connection lifecycle ஆகியவற்றை instrument செய்து measured bottlenecks-ஐ சரிசெய்யவும்.
- Public list/content responses-க்கு safe short-lived caching இருக்கலாம்; user-specific balance, payment state, session state, Admin data ஆகியவை no-store/authenticated route policy-ஐப் பாதுகாக்க வேண்டும்.
- Server timing/logging-ல் personal data, auth token, private birth details அல்லது payment secrets பதிவு செய்யப்படக் கூடாது.

## 7. பாதுகாக்க வேண்டிய தற்போதைய நல்ல அம்சங்கள்

1. **Firestore Rules:** Wallet balances, transaction ledger மற்றும் recharge records client write-இல் இருந்து தடுக்கப்பட்டுள்ளன; user-scoped reads உள்ளன. Rules emulator tests தொடர வேண்டும்.
2. **Wallet/live-session safety:** server-side transaction, paise-based integer amounts, idempotency keys மற்றும் reservation/release concepts உள்ளன. Performance காரணமாக இவற்றை bypass செய்யக்கூடாது.
3. **Astrology QA:** B.V. Raman Shadbala, Ashtakavarga, Ayurdaya, DST, Marriage Matching மற்றும் report/browser tests-க்கு பல dedicated workflows உள்ளன. Code splitting-க்கு இவை பாதுகாப்பு வலையாக இருக்க வேண்டும்.
4. **Calendar offline assets:** Service Worker cache update-களுக்கிடையே cached India place assets-ஐ பாதுகாக்கும் logic உள்ளது. இதை நீக்கவோ offline database-ஐ குறைக்கவோ கூடாது.
5. **Separate PWA repos:** independent Horoscope மற்றும் Calendar deployment boundaries ஏற்கெனவே அமைக்கப்பட்டுள்ளன; build artifacts-ஐ இன்னும் குறைக்க இது உதவும்.

## 8. பரிந்துரைக்கப்படும் implementation வரிசை

| வரிசை | தனி implementation PR | Merge/production gate |
|---|---|---|
| 1 | Request parser/body-size limits + CORS origin policy tests | valid payloads, oversized 413, webhook raw signature, approved origins |
| 2 | First-load storage/cache cleanup narrowing + safe Service Worker updates | PWA repeat-install/update, active session/checkout protection, offline data preserved |
| 3 | Calendar dependency allowlist and generated bundle validation | no broken links, browser smoke, online/offline calculation parity |
| 4 | Horoscope lazy loading / feature code splitting, one feature family per PR | existing numerical and bilingual regressions pass |
| 5 | Main Astro module split and route-level loading | Login/Register, all dashboards, quota protection, Wallet/Live Session workflows pass |
| 6 | CSS cascade consolidation in narrow batches | desktop/mobile screenshots and print/report regressions |
| 7 | Application rate-limit/security header baseline | staging abuse/preflight/CSP-report tests; production compatibility verified |
| 8 | Unified lightweight required checks + build artifact audits + docs/version maintenance | all relevant required workflows green and deploy artifact verified |

## 9. அளவிட வேண்டிய baseline (optimization முன்/பின்)

ஒரே மாதிரியான browser/network/device profile-ல் baseline மற்றும் post-change values சேகரிக்கப்பட வேண்டும்:

- Android mid-range device மற்றும் desktop; throttled mobile network.
- SMV ASTRO: logged-out home, login, Customer, Astrologer, Admin dashboard, Wallet, live session screen.
- Horoscope: initial page, basic chart, advanced reading, predictions, marriage matching, Tamil/English switch, saved report, print.
- Calendar: home, day/month/year views, Rasi Palan, timezone/DST boundaries, offline reload.
- Metrics: LCP, INP, CLS, FCP, JS/CSS transferred bytes, JS parse/evaluation, long tasks, API p50/p95 latency, Firebase read/write counts, worker startup/cache-hit rates.
- Calculation-sensitive paths-க்கு results JSON/numeric fingerprints, 150-chart/150-matching test suite, DST and report/print tests.

**Success criteria:** measured initial load / unnecessary payload / repeated work குறைய வேண்டும்; அதே நேரத்தில் calculation output, user data, Wallet accounting, permissions, saved reports, install/PWA behavior மற்றும் offline location search-ல் regression இருக்கக்கூடாது. குறைவு எத்தனை சதவீதம் என்று baseline இல்லாமல் முன்கூட்டியே உறுதி செய்யக்கூடாது.

## 10. GitHub PR / verification note

- இந்த PR audit report மட்டுமே; production code மாற்றம் அல்லது deployment இல்லை.
- Current main source தான் audit baseline. Open/Draft PR-களில் உள்ள மாற்றங்கள் (உதா. Horoscope layout அல்லது Calendar calculation optimization) main-ல் merge ஆகும் வரை இங்கு audit செய்யப்பட்ட source-ல் அடங்கியதாக கருதப்படவில்லை.
- Implementation தொடங்கும்போது ஒவ்வொரு finding-க்கும் தனி scoped PR உருவாக்கி, source diff, test outputs மற்றும் before/after measurements உடன் review செய்ய வேண்டும்.
- Live performance benchmark / dynamic security test இன்னும் செய்யப்படவில்லை; அவற்றின் முடிவை PASS எனக் கூறவில்லை.
