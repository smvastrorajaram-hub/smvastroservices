# SMV V65 — Typography, consultation navigation, payment receipt audit

இந்தத் தொகுப்பு வழங்கப்பட்ட SMV LATEST.zip-க்கான cumulative changed-files தொகுப்பு. V64-ல் செய்யப்பட்ட read/cache, banner, mobile hero திருத்தங்களும் இதில் உள்ளன. V65-ல் typography மற்றும் payment receipt காரணங்கள் சரிசெய்யப்பட்டுள்ளன. Production-க்கு deploy செய்யப்படவில்லை.

## கண்டறிந்த காரணங்கள்

1. ஒரே stylesheet-ல் பல தலைமுறை typography விதிகள் இருந்தன. `!important`, mobile-only அளவுகள், `.card > h3` போன்ற நேரடி-child selectors காரணமாக wrapper-க்குள் உள்ள section heading மற்றும் நேரடி item heading வெவ்வேறு அளவுகளில் வந்தன. Customer section heading பழைய சிறிய அளவில் இருந்தது; payment helper-க்கு அதன் சொந்த body அளவு இல்லை.
2. Section heading, astrologer பெயர் இரண்டும் சில templates-ல் `h3` ஆக இருந்தன. Profile Management title-க்குள் உள்ள பெயர் தலைப்பைவிடப் பெரியதாகத் தோன்றியது.
3. Review stars-ன் அளவு parent-ல் மட்டும் மாற்றப்பட்டது. உண்மையில் ஒவ்வொரு `.smv-rating-star`-க்கும் தனி font-size இருந்ததால் சிறிய parent அளவு செயல்படவில்லை.
4. Ask Now success panel காட்டப்பட்ட உடனே மறைக்கப்பட்டது. பின்னர் success banner-க்காக ஒரு கூடுதல் Firestore `getDoc` செய்யப்பட்டது; அது தோல்வியடைந்தால் success தகவலும் மறைந்தது. Private payment verify முடிந்ததும் நேரடியாக dashboard திறக்கப்பட்டது.
5. Consultation navigation `.hidden` சேர்த்தாலும், header/footer-ன் குறிப்பிட்ட `display` விதிகள் அதைவிட வலிமையாக இருந்தன. சில source CSS fragments செல்லாத syntax-லும் இருந்தன; HTML-ல் முன்கூட்டிய duplicate closing tags இருந்தன.

## V65 source திருத்தங்கள்

- Existing `smvastro.css`-ல் typography ownership ஒரே semantic scale-க்கு மாற்றப்பட்டுள்ளது. கூடுதல் stylesheet அல்லது `!important` typography patch சேர்க்கப்படவில்லை. பழைய dashboard/private font declarations நீக்கப்பட்டன; shared legacy declarations புதிய text scopes-ஐ பாதிக்காதவாறு பிரிக்கப்பட்டன. Browser ஏற்றுக்கொள்ளும் valid stylesheet rules சீரமைக்கப்பட்டு CSS syntax சரிபார்க்கப்பட்டது.
- Dashboard/Admin/Consultation மற்றும் homepage text sections-க்கு `smv-type-root`. அந்த dashboard-க்குள் எதிர்காலத்தில் சரியான `h2/h3/h4/p` tags-உடன் சேர்க்கப்படும் content தானாக அதே scale பெறும். JavaScript மூலம் heading-ஐ ஊகிக்கும் observer இல்லை.
- Astrologer item பெயர்கள் `h4`; section headings `h3`. Wrapper depth-ஐப் பொறுத்து அளவு மாறாது.
- Hero, horoscope components, festival banners ஆகியவற்றின் தனிப்பட்ட presentation பாதுகாக்கப்பட்டுள்ளது. புதிதாக homepage section உருவாக்கும்போது semantic text scope பயன்படுத்த வேண்டும்; arbitrary inline font-size சேர்த்தால் inheritance தானாக அதனை ரத்து செய்யாது.
- Review customer name `strong`, bold. கீழ் review-ல் numeric `/5` இல்லை. Main average rating உள்ளது.
- Header/footer display விதிகள் hidden state-ஐ மதிக்கின்றன. Consultation → Back → Consultation என்ற மீண்டும் திறக்கும் navigation DOM/history வழியாகச் செயல்படும். Dashboard isolation-க்கும் அதே visibility lifecycle பயன்படுத்தப்படுகிறது.
- ஒரே accessible receipt dialog: Ask Now, Private Consultation, அவற்றின் Retry Payment flows அனைத்திலும் server `verified: true` response வந்த பிறகே காட்டப்படும்.
- Razorpay Payment ID, Question ID அல்லது Private Question / Consultation ID, தேதி/நேரம், இருந்தால் Customer Payment Reference காட்டப்படும். Private ID-க்கு புதிய போலியான numbering உருவாக்கப்படவில்லை; server-ல் இருக்கும் உண்மையான stable ID பயன்படுத்தப்படுகிறது.
- “VIEW MY QUESTION” அல்லது 8 வினாடிக்குப் பிறகு customer dashboard-ல் சம்பந்தப்பட்ட கேள்விக்கு scroll/focus. இது receipt வாசிக்கும் நேரம்; Razorpay processing latency அல்ல.
- ஏற்கனவே சேமிக்கப்பட்ட பழைய கேள்வியை retry செய்தால் முதல் 20 items-க்கு வெளியே இருந்தாலும், ஏற்கனவே பெறப்பட்ட dashboard dataset-லிருந்து அந்த item render செய்யப்படும்; தனி Firestore query இல்லை.
- Dashboard load தோல்வியடைந்தால் receipt தொடரும். மீண்டும் payment செய்யாமல் dashboard திறக்க retry செய்யலாம்.
- Native dialog Escape / browser Back receipt-லிருந்து அதே dashboard transition-ஐ பயன்படுத்தும். Logout-ல் receipt timer மற்றும் in-memory target அழிக்கப்படும்.
- Backend verification security/capture checks தொடர்கின்றன; verified response-ல் gateway Payment ID சேர்க்கப்பட்டது. Frontend மட்டும் update செய்வதைவிட server.js-யும் ஒன்றாக deploy செய்வது சரியானது.

## ஒரே typography அளவுகள்

| Content | CSS px | Weight |
|---|---:|---:|
| View title h2 | 24–28 responsive | 700 |
| Section h3 | 22 | 700 |
| Item h4 | 18 | 700 |
| Customer / astrologer question | 19 | 600 |
| Answer | 17 | 400 |
| Body / retry helper | 14 | 400 |
| Metadata value / small | 12 | 400 |
| Metadata label | 14 | 600 |
| Main rating stars / average | 23 / 18 | component-specific |
| Individual review stars / text | 15 / 12 | 400 |
| Review customer name | 11 | 700 |

## Firebase reads மற்றும் timing

V65-ல் புதிய `getDoc`, `getDocs`, `onSnapshot`, polling அல்லது MutationObserver சேர்க்கப்படவில்லை. Success-banner verification-க்காக இருந்த கூடுதல் `getDoc` நீக்கப்பட்டது. Server verification response-ஐ உடனடி receipt பயன்படுத்துகிறது; sessionStorage-ஐ payment proof ஆக நம்புவதில்லை. Payment dashboard transition customer role-ஐ அறிந்திருப்பதால் தேவையற்ற astrologer profile discovery read தவிர்க்கப்படுகிறது.

MutationObserver தானாக Firebase read செய்யாது; அதன் callback query/listener உருவாக்கினால் reads அதிகரிக்கும். இங்கு observer சேர்க்கப்படவில்லை. UI typography, review show/hide, Back/navigation, receipt timer அனைத்தும் DOM/CSS செயல்பாடுகள்.

V64-ல் இருந்த shared review cache/in-flight request, public offer cache, shared dashboard event subscriptions, filtered backend queries தொடர்ந்து உள்ளன. Offer countdown timer DOM text மட்டும் புதுப்பிக்கும். Dashboard refresh-ன் ஏற்கனவே உள்ள authoritative reads தொடர்கின்றன; அவற்றை பூஜ்யம் என்று கூறவில்லை. Firebase console billed reads, production query frequency, Render cold-start நேரம் ஆகியவை live access இல்லாமல் அளவிடப்படவில்லை. `payment-timing.js` instrumentation தொடர்ந்து உள்ளது.

## முந்தைய கோரிக்கைகளில் தொடர்ந்து உள்ளவை

- Homepage/customer dashboard ஒரே offer renderer, SVG assets மற்றும் banner cache.
- 16 SVG themes: generic, welcome, Pongal, Diwali, Navaratri, Dasara, Ayudha Pooja, Shivaratri, Tamil New Year, Vinayagar Chaturthi, Karthigai Deepam, Thaipusam, New Year, Onam, Christmas, Eid.
- `samples/`-ல் festival preview HTML/CSS/JS.
- Mobile hero lower-half content layout; admin மூன்று equal-width rectangular shortcuts; compact review/select controls.
- Extra Refresh button / MutationObserver removal மற்றும் V64 payment capture verification improvements.

## சோதனை முடிவுகள் / வரம்பு

- Chromium browser-ல் 360, 390, 768, 1280px widths: Admin wrapped heading, nested item, Customer heading/question/helper, review stars/text/name computed sizes சரிபார்க்கப்பட்டன.
- Consultation → Back → மீண்டும் Consultation: header/footer/home மறைவு இருமுறையும் சரி.
- Private verified receipt → button → exact question focus; Public verified receipt → 8-second auto transition; failed verification rejection; dashboard-error receipt retention ஆகியவை mocked-data browser tests-ல் pass.
- Hero heading/body மற்றும் customer banner title/badge computed typography V64-உடன் ஒப்பிடப்பட்டது; பாதுகாக்கப்பட்டுள்ளது.
- 37 JavaScript/module/inline scripts syntax checks; stylesheet parse; duplicate receipt ID இல்லை; புதிய canonical typography-ல் `!important` இல்லை.
- `samples/verification/` screenshots மற்றும் JSON browser measurements உள்ளன. Screenshots sample data; உண்மையான customer/payment screenshots அல்ல.
- Live Razorpay transaction, Firebase billing measurement, production authentication/permissions அல்லது production deployment செய்யப்படவில்லை. Full end-to-end payment timing இன்னும் live சூழலில் அளவிடப்பட வேண்டும். Original ZIP-ல் இல்லாத hero/brand photos புதிதாக உருவாக்கப்படவில்லை.

## பயன்படுத்துவது

ZIP-ஐ project root-ல் அதே relative paths-க்கு replace செய்யவும். ஏற்கனவே உள்ள பிற files/assets-ஐ delete செய்ய வேண்டாம். Frontend files, புதிய `payment-receipt.js`, `server.js` ஆகியவற்றை deploy செய்யவும். Service worker/cache version V65. Payment test செய்யும் போது verified receipt IDs மற்றும் dashboard target இரண்டும் ஒரே record-ஐக் காட்டுகிறதா staging-ல் சரிபார்க்கவும்.
