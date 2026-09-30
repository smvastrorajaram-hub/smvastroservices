# SMV HOROSCOPE V85 — Runtime → PDF Chain Root Fix

Working Horoscope sections are untouched.

Repaired chain:
Swiss module load → WASM initialization → Dasha 15Y → Transit 15Y → complete report →
V84 PDFKit → Cloudinary → Firestore metadata → Saved Horoscope Reports.

## Root cause
Production currently fails before PDF generation while dynamically importing
`smv-swisseph-local.mjs?v=82`. V84 was backend-only, so it could not repair this browser runtime path.

## Changes
- Stable same-origin `smv-swisseph-local.mjs` import; removed `?v=82`.
- Complete local runtime included, including `swisseph.mjs`, `.js`, `.wasm`, and `.data`.
- Service-worker cache generation bumped to V85 to retire stale V82 module responses.
- V84 root `server.js` retained, including PDFKit recursion fix and Cloudinary streaming.

## Deploy
- `server.js` → Render.
- `public/horoscope/...` → website/Pages.
Both sides must be deployed.

## PASS criteria
No dynamic-module fetch error; Dasha and Transit 15Y complete; new PDF request reaches Render;
no NEW stack-overflow entry at that request timestamp; Cloudinary stores PDF; Firestore stores metadata;
Saved Horoscope Reports displays it; View/Download/Print/Delete work.

Static source audit: PASS.
