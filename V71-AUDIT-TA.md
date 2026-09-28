# V71 — இறுதி audit குறை திருத்தங்கள்

இது V70-க்கு பதிலாகப் பயன்படுத்த வேண்டிய combined changed-files ZIP. SMV BACKUP baseline-க்கு எதிரான 23 மாற்றப்பட்ட/new deployment files உள்ளன. V69/V70 முந்தைய மாற்றங்களும் சேர்க்கப்பட்டுள்ளன; இரண்டு கோப்புகள் மட்டும் கொண்ட incremental patch அல்ல. இதே directory paths-இல் extract/replace செய்யவும். server.js உட்பட deploy செய்ய வேண்டும். Deployment இந்தச் செயல்பாட்டில் செய்யப்படவில்லை.

## V70 மீள் audit-இல் கண்ட இரண்டு குறைகள் — திருத்தம்

1. **Imported paid report Print மீட்பு:** புதிய import-இன் revision reset செய்து verification pending என்று குறிக்கப்படுகிறது. Online sync தானாக முயற்சிக்கப்படுகிறது. ஏற்கனவே V70-இல் import செய்த same-revision/paid-false பதிவுக்கும் server metadata ஒப்பிட்டு authoritative snapshot பெறப்படுகிறது. Import கோப்பின் paid flag-ஐ நம்பி உரிமை தரப்படாது. Offline-இல் saved content திறக்கும்; payment verification pending. இணையம் வந்தபின் Sync மூலம் உறுதிப்படுத்தலாம். உறுதிப்படுத்தியபின் சாதாரண Open/Print மீண்டும் cloud read செய்யாது.

2. **Matching மொழி மாற்றத்தில் கலந்த விவரம்:** Numerology இப்போது அதே completed bride/groom charts-இல் உறைந்த பெயர்/பிறந்த தேதியைப் பயன்படுத்துகிறது. Form-இல் பின்னர் திருத்திய values பழைய result-இல் கலக்காது. Report name-மும் calculated names-இலிருந்து பெறப்படுகிறது. Selected-date transit snapshot raw saved calculation-இலும் சேர்க்கப்படுகிறது. புதிதாக calculate செய்த report அதன் புதிய விவரங்களைப் பயன்படுத்தும்; payment identity-இல் பெயர் தொடர்ந்து சேர்க்கப்படாது.

Service worker cache மற்றும் HTML asset versions V71 ஆக புதுப்பிக்கப்பட்டன. CSS, print layout அல்லது calculation formula-களுக்கு V71-இல் கூடுதல் மாற்றம் இல்லை.

## இந்தச் சுற்றில் மீண்டும் நடத்தப்பட்ட சோதனைகள்

- Actual file-input import handler: paid server snapshot மீட்பு PASS.
- V70 same-revision import regression: paid=false -> verified paid=true PASS.
- Offline import: paid flag நம்பப்படவில்லை; content திறக்கிறது; reconnect sync paid print மீட்கிறது — PASS.
- Server paid=false metadata Print-ஐ unlock செய்யவில்லை — PASS.
- Verified local reopen: கூடுதல் cloud reads 0 — PASS.
- Matching cached DOB/name: form edit result-ஐ மாற்றவில்லை — PASS.
- Full matching English -> Tamil -> English: முழு output ஒரே மாதிரி; API calls 0 — PASS.
- New calculation input பெயர் மாறினால் அதன் name numerology மாறுகிறது — PASS.
- 30 matching pairs / 729 star combinations: 2,367 assertions PASS. Audited label leakage 0; SMV brand மற்றும் user names மொழிக் கலப்பாகக் கணக்கிடப்படவில்லை.
- Payment fixture tests: 1,481 assertions PASS; இந்த எண்ணிக்கையில் star checks அடங்குகின்றன.
- Client payment cache / account isolation PASS.
- Cloud snapshots/chunks, revisions, delete retains payment PASS.
- Bilingual full horoscope form + saved snapshot + language-switch no extra calculation requests PASS.
- PWA precache paths அனைத்தும் உள்ளன — PASS.

Raw astronomical engine மாற்றப்படாததால் முந்தைய 30 horoscope × 2 languages × 2 engines = 120 runs, numeric/structured differences 0 முடிவு தொடர்ந்து பொருந்தும்; இந்தச் சுற்றில் 120 raw engine runs மீண்டும் இயக்கப்படவில்லை. V70 print QA-வில் முழு தமிழ் மாதிரி 206 pages, matching 8 pages; page overflow 0. V71-இல் Chrome print சோதனை செய்யப்படவில்லை.

## தொடர்ந்து பொருந்தும் வெளிப்புற வரம்புகள்

- Live Razorpay/UPI charge, production Firebase relogin, Android Chrome installation/native Print உறுதிப்படுத்தப்படவில்லை. இவற்றை PASS என்று கூறவில்லை.
- பழைய account-only payment-இல் பிறப்பு விவரம் இல்லாவிட்டால் admin legacy-link API மூலம் அசல் பிறப்பு விவரங்களை இணைக்க வேண்டும். அந்தப் production migration தானாகச் செய்யப்படவில்லை.
- Baseline-இல் இல்லாத offline India place-search shards இந்த ZIP-இல் இல்லை. Known coordinates மூலம் offline calculation சோதிக்கப்பட்டது; முழு offline ஊர் தேடல் உறுதியாகவில்லை.
- 15 ஆண்டு forecasts முழு bilingual integration ஒரு case-இல் சோதிக்கப்பட்டது. 30 cases அனைத்திற்கும் முழு 15 ஆண்டு PDF சோதனை செய்யப்பட்டதாகாது. Native/offline parity ஒரு independent astronomical reference audit-க்கு சமமல்ல.

கீழே முந்தைய V70 audit விவரங்கள் வரலாற்று ஆதாரமாக உள்ளன. Import sync குறித்த அதன் விவரங்களுக்கு மேலுள்ள V71 நடத்தை முன்னுரிமை பெறும்.

---

# SMV HOROSCOPE V70 — மாற்றங்கள் மற்றும் சோதனை அறிக்கை

இந்த ZIP, பயனர் உறுதிப்படுத்திய `SMV BACKUP` அடிப்படையுடன் ஒப்பிட்ட மாற்றப்பட்ட கோப்புகளை மட்டும் கொண்டது. முந்தைய V69 மாற்றங்களும் தற்போதைய V70 திருத்தங்களும் ஒன்றாக உள்ளன. முழு project அல்ல. ஏற்கனவே உள்ள project-இல் இதே பாதைகளில் கோப்புகளை மாற்ற வேண்டும். புதிய கோப்புகளையும் சேர்க்க வேண்டும். node_modules, test PDFs, பயனர் தரவு அல்லது secrets சேர்க்கப்படவில்லை. Deployment செய்யப்படவில்லை.

## செயல்படுத்தப்பட்டவை

- Payment உரிமை account முழுவதற்கும் அல்ல: feature + பிறந்த தேதி + நேரம் + normalized latitude/longitude + UTC offset அடிப்படையில். பெயரும் மொழியும் உரிமையை மாற்றாது. பொருத்தத்திற்கு பெண்/ஆண் பிறப்பு விவரங்களின் வரிசை பாதுகாக்கப்படுகிறது.
- Razorpay ஒவ்வொரு முயற்சிக்கும் புதிய order; பழைய captured payment மீட்பு; server signature, owner, feature, பிறப்பு விவரம், amount, currency, captured status, Test/Live mode சரிபார்ப்பு. Checkout நேரத்தில் பிறப்பு விவரங்கள் மாற்றப்படாது.
- அதே paid பிறப்பு விவரத்தின் saved report உள்ளூரிலிருந்து திறக்கும். வேறு பிறப்பு விவரம் paid உரிமை பெறாது. Basic கணக்குகள், Birth/Daily Panchang, Hora, Transit ஆகியவை Advanced paywall முன்னர் கிடைக்கும். Basic report-க்கு Print இல்லை.
- முழு calculation மற்றும் தமிழ்/ஆங்கில HTML snapshot auto-save. IndexedDB உள்ளூர் சேமிப்பு; account அடிப்படையிலான cloud backup; login-இல் manifest sync; saved report Open/Print-இல் Firebase read இல்லை. Delete report-ஐ நீக்கும்; payment entitlement நீங்காது.
- சிறிய Save/Open file/Sync controls மற்றும் saved row Open/Print/File/Delete. Imported file உரிமையைத் தானாக வழங்காது; server உறுதி/sync பின்னரே paid print கிடைக்கும். Saved file-ஐ account உரிமையாளர் மட்டுமே import செய்யலாம்.
- மொழி மாற்றம் முன்கணிக்கப்பட்ட தரவைப் பயன்படுத்தும்; புதிய calculation API வேண்டாம். Saved report இரு மொழிகளிலும் முன்பே சேமிக்கப்பட்ட view-ஐ திறக்கும்.
- 15 ஆண்டு தசா/புக்தி மற்றும் கோச்சார விளக்கங்கள்: காலவரம்பு clipping, நிகழ்கால reference date, start/mid/end ஆய்வு, கிரக/பாவத் தொடர்புகள், துறை சார்ந்த விளக்கங்கள். Online/offline இரண்டிலும் அதே bundled Swiss engine மூலம் forecast transit கணக்கிடப்படுகிறது. முடிந்தபின்னரும் தெரிந்த calculating செய்தி நீக்கப்பட்டது. தோல்வியடைந்த காலப்பகுதியை அமைதியாகத் தவிர்த்து முழு report என்று சேமிக்காது.
- உள்ளீடு இல்லாத வாழும் நாடு, தொழில், குடும்ப நிலையை ஊகிக்காது. பிறந்த இடம், நேரம், வயது ஆகிய கிடைக்கும் தகவல்களை மட்டும் பயன்படுத்துகிறது. ஜோதிட விளக்கங்கள் பாரம்பரிய interpretation; நிகழ்வுகளின் அறிவியல் உறுதி அல்ல.
- நட்சத்திரப் பொருத்தம், நாடி, வேதை, ஸ்திரீ தீர்க்கம், வசியம் மற்றும் தோஷக் காரண/விலக்கு விளக்கங்கள்; தமிழ் enum/யோனி பெயர் மொழிக் கலப்பு திருத்தம். பொருத்த report-இல் இருவரின் பெயர்/பிறப்பு விவரங்கள் சேர்க்கப்பட்டன. Cached transit review date மொழி மாற்றத்திலும் மாறாது.
- Print saved report வழியாக: SMV HOROSCOPE heading, existing logo, அதே Vinayagar படம், Tamil font, A4 table/grid layout, section headings, expanded report. பழைய live PDF button மாற்றப்பட்டது. Browser Print → Save as PDF பயன்படுத்தலாம். Popup permission தேவைப்பட்டால் தெளிவான செய்தி வரும்.
- Header Login/Register; header/hero Horoscope மீண்டும் அழுத்தினாலும் திறக்கும் handler; இரண்டு மறைக்கப்பட்ட table headings மீட்பு; matching single-layer styling.
- PWA cache version புதுப்பிப்பு; icon உடன் install control; 512 manifest SVG அதே approved raster-ஐ உள்ளடக்கியது. புதிய logo வடிவமைக்கப்படவில்லை. Precache பட்டியலில் உள்ள எல்லா கோப்புகளும் உள்ளன.

## சோதனை ஆதாரம்

| சோதனை | முடிவு |
|---|---|
| 30 பிறப்பு cases × தமிழ்/English × native server source/offline WASM | 120 runs; structured/numeric வேறுபாடு 0 (tolerance 1e-6) |
| 30 ஜாதகம் × 2 மொழிகள் render | 60 renders; 10 advanced sections; 4 charts ஒவ்வொன்றும் 12 cells + centre; audited untranslated labels 0 |
| 30 பொருத்த ஜோடிகள் × 2 மொழிகள் × 2 engines | 120 comparisons; parity pass |
| 27 × 27 நட்சத்திர இணைகள் + matching render | 729 star pairs; 2,367 assertions pass; audited untranslated labels 0 |
| Payment/server/source fixtures | 1,481 assertions pass (இதில் star-pair checks உள்ளன; தனித்த test count ஆக மீண்டும் கூட்ட வேண்டாம்) |
| Browser payment logic simulation | concurrent dedupe, பெயர் மாற்றம் same identity, நேரம் மாற்றம் locked, account cache isolation pass |
| Cloud report simulation | paid entitlement, Tamil chunk size, account isolation, revision cleanup, delete retains purchase pass |
| Full form integration | Basic + Advanced + complete bilingual snapshots; language switch extra calculation requests 0 |
| Saved report simulation | auto-save, bilingual open, zero cloud read on reopen, account isolation, cloud restore, delete, sanitization pass |
| Print rendering | முழு தமிழ் மாதிரி 206 pages; matching மாதிரி 8 pages; outside-page text blocks 0; heading/chart/table visual inspection pass |

நீண்ட முழு அறிக்கையில் விரிவான தசா அட்டவணைகள் மற்றும் 15 ஆண்டு விளக்கங்கள் உள்ளதால் பக்க எண்ணிக்கை அதிகமாக இருக்கலாம். உள்ளடக்கத்தை வெட்டி சுருக்கவில்லை. Print QA WeasyPrint மூலம்; Chrome print-ஐ நேரடியாகச் சோதித்ததாக இதைக் கருதக்கூடாது.

`audit/`-இல் 30 case inputs மற்றும் முடிவுகள் JSON ஆக உள்ளன. Native server source உள்ளூரில் இயக்கப்பட்டது; production online endpoint-ஐ அழைத்த சோதனை அல்ல. Numeric parity ஒரே engine-இன் இரு implementations ஒத்துள்ளதைக் காட்டும்; தனித்த authoritative ephemeris அல்லது அனைத்து பாரம்பரிய விதிகளுக்கும் வெளிப்புற சான்றாய்வு செய்ததாகாது. 15 ஆண்டு lazy forecast முழுச் சோதனை ஒரு bilingual integration case-இல் செய்யப்பட்டது; 30 cases அனைத்திற்கும் 15 ஆண்டு முழு PDF உருவாக்கப்படவில்லை.

## Deploy செய்வதற்கு முக்கிய குறிப்புகள் / இன்னும் நேரடியாக உறுதி செய்யப்படாதவை

1. Frontend கோப்புகளுடன் `server.js`-ஐயும் deploy செய்ய வேண்டும். பழைய server உடன் புதிய birth-specific frontend மட்டும் பயன்படுத்தக்கூடாது. இந்த upload Node/Express backend அடிப்படையானது; இந்த patch Cloudflare Worker migration அல்ல.
2. பழைய account-only paid பதிவுகளில் DOB/time/place இல்லை என்றால் original paid chart-ஐ code மூலம் கண்டுபிடிக்க முடியாது. அத்தகைய பதிவுகளுக்கு மீண்டும் payment கேட்பதைத் தடுத்து admin link செய்தி காட்டப்படும். Admin verified original விவரங்களுடன் `POST /admin/horoscope-feature/link-legacy` அழைக்க வேண்டும். Firebase admin bearer token தேவை. Body: `{customerUid, feature, birthIdentity}`. feature `advanced_analysis` அல்லது `marriage_matching`. ஜாதக birthIdentity: `{date:"YYYY-MM-DD",time:"HH:mm",lat,lon,utcOffsetMinutes}`; பொருத்தத்திற்கு `{bride:{...},groom:{...}}`. ஒரே பழைய payment-ஐ வேறு பிறப்பு விவரத்திற்கு மீண்டும் இணைக்க முடியாது. இது production records-இல் இன்னும் இயக்கப்படவில்லை; தனி admin UI இந்த patch-இல் சேர்க்கப்படவில்லை.
3. நேரடி Razorpay charge/UPI checkout, production Firebase relogin, Android Chrome install மற்றும் native Chrome Print ஆகியவை சோதிக்கப்படவில்லை. உள்ளூர் browser URL access `ERR_BLOCKED_BY_CLIENT` எனத் தடுக்கப்பட்டது. PWA manifest/cache code checks pass; actual install pass என்று கூறவில்லை.
4. கொடுக்கப்பட்ட baseline-இல் offline India place-search manifest உள்ளது; ஆனால் அதில் குறிப்பிடப்பட்ட பெரும் India data shards இல்லை. அவற்றை இந்த changed-files ZIP உருவாக்கவில்லை. எனவே முழு offline ஊர் தேடலை pass என்று கூற முடியாது. தெரிந்த latitude/longitude மற்றும் timezone உள்ளீடுகளால் offline calculation செயல்படும். PWA assets முதன்முறை online-இல் cache செய்யப்பட்டிருக்க வேண்டும்.
5. Source HTML snapshots client data என்பதால் imported file-இன் paid flag-ஐ நம்பி entitlement வழங்கப்படாது. Paid cloud sync பின்னரே print மீட்கப்படும். புதிய device-இல் முதலில் online login/sync தேவை; அதன் பின்னர் local reopen offline-இல் கிடைக்கும்.
6. PWA install browser/OS eligibility-ஐப் பொறுத்தது. Install button இணையத் தளத்தால் கட்டாய installation செய்ய முடியாது. Existing PNG Vinayagar-ஐ அப்படியே பயன்படுத்தியுள்ளோம்; மூலத்தில் இல்லாத புதிய SVG படம் உருவாக்கப்படவில்லை.

## Reference

- Razorpay official Standard Checkout integration: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- PWA installability: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

முடிவு: இந்த ZIP-இல் code திருத்தங்களும் குறிப்பிடப்பட்ட உள்ளூர் சோதனைகளும் நிறைவடைந்துள்ளன. மேற்கண்ட production/browser/data சார்ந்த பகுதிகள் உறுதி செய்யப்படாதவை; “அனைத்தும் live-இல் முழுமையாக pass” என்ற சான்றிதழ் அல்ல.
