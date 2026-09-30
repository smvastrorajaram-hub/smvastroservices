# SMV ASTRO — V84 PDFKit Stack Root Fix

## Source
Built directly from the latest designated V83 source:
`SMV-HOROSCOPE-V83-CLOUDINARY-CLOUD-NAME-NC1ZLBKG-CHANGED-FILES-ONLY.zip`

Only the root/main `server.js` is changed. The old Horoscope-folder `server.js` is not used.

## Confirmed Render failure
`RangeError: Maximum call stack size exceeded`

The Render trace repeatedly enters PDFKit page finalization / `addPage()`.

## Root cause
V83 rendered footer text at y=785 while A4 used a 58pt bottom margin. That position is outside
PDFKit's normal writable text area. PDFKit can auto-add a page while rendering that footer.
The `pageAdded` handler calls `header()`, and `header()` calls `footer()`, creating:

`pageAdded -> header -> footer -> automatic addPage -> pageAdded -> ...`

This explains the observed PDFKit stack overflow.

## Fix
The footer is still drawn at the physical bottom of the page, but the active page's bottom margin is
temporarily relaxed only while the absolute footer is rendered. The original bottom margin is restored
immediately in `finally`.

Normal report content continues to use the original 58pt bottom margin.

## Preserved
- PDFKit -> Cloudinary direct streaming
- private/signed Cloudinary PDF storage
- metadata-only Firestore PDF record
- Cloudinary environment configuration
- English/Tamil report selection
- paid birth-report identity validation
- View PDF / Download PDF / Print / Delete backend routes
- Horoscope calculation code outside this PDF fix

## Audit
Static source audit: PASS.
The root recursive footer path is removed without changing unrelated Horoscope logic.

## Deploy/test
Replace the root/main `server.js` and redeploy Render.

For one fresh paid Horoscope PDF generation, Render should progress:
1. `[PDF-MEM] start`
2. no `Maximum call stack size exceeded`
3. `[PDF-MEM] stored`

Then test View PDF, Download PDF, Print and Delete using that newly stored PDF.

Live Render/Cloudinary execution is the remaining runtime verification after deployment.
