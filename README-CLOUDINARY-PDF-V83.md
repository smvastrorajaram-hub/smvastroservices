# SMV ASTRO V83 — Cloudinary PDF / Render OOM root fix

## Audit result
Render log showed Node heap exhaustion around 256 MB while horoscope calculation itself completed. The latest V81 `server.js` PDF path used all of these at once:

1. PDFKit `bufferPages: true` (keeps PDF pages buffered).
2. Every PDF output chunk was retained in `chunks[]`.
3. `Buffer.concat(chunks)` created another full PDF allocation.
4. PDF was split again into buffers.
5. Every chunk was converted to Base64 (about 33% larger) and written to Firestore.
6. Reading a saved PDF reversed the same process with Base64 decode + `Buffer.concat`.

This explains why calculation can finish but PDF save/download can crash the Render instance.

## V83 change
- Login/dashboard flow: untouched.
- Horoscope calculation/WASM flow: untouched.
- Razorpay payment verification: untouched.
- PDFKit now streams directly to Cloudinary; no full PDF Buffer is built in Node heap.
- `bufferPages` disabled.
- Firestore stores only PDF metadata/public ID, not Base64 PDF chunks.
- Saved PDF GET streams from private Cloudinary storage to the customer.
- Delete removes both Cloudinary PDF and Firestore metadata.
- English and Tamil remain separate saved PDFs for the same paid birth identity.
- Added `[PDF-MEM] start` and `[PDF-MEM] stored` logs for Render memory verification.

## Cloudinary configuration
Create a NEW upload preset in the Cloudinary product environment whose cloud name is `nc1zlbkg`:

- Preset name: `smvastro_reports_signed`
- Signing mode: **Signed**
- Keep it separate from existing `smvastro-tamil`.

Add these Render Environment variables (do not put secrets in frontend code):

- `CLOUDINARY_REPORT_CLOUD_NAME=nc1zlbkg`
- `CLOUDINARY_REPORT_API_KEY=<Cloudinary API key>`
- `CLOUDINARY_REPORT_API_SECRET=<Cloudinary API secret>`
- `CLOUDINARY_REPORT_UPLOAD_PRESET=smvastro_reports_signed`

The backend uploads report PDFs as `raw` + `private` assets under `smv-astro/private-reports/...`.

## Changed files
- `server.js`
- `package.json`

After deploying these files to the Render backend, Render deployment IS required because `server.js`, environment variables and a new npm dependency changed. Pages/static-only deployment is not enough for this fix.

## Verification
After deployment, generate one paid English and one paid Tamil horoscope and check Render logs. Expected:

- `[PDF-MEM] start ...`
- `[PDF-MEM] stored ...`
- No `Reached heap limit` / `JavaScript heap out of memory`.
- Saved Horoscope Reports → View PDF / Download PDF / Print reuse the stored Cloudinary PDF rather than regenerating it.
