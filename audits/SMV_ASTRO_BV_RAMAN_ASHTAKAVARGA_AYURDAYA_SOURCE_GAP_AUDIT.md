# B. V. Raman Ashtakavarga Ayurdaya — source gap and numerical audit

**நிலை:** ஆய்வு-மட்டம் மட்டும்; இறுதி கணக்கீடு சான்றளிக்கப்படவில்லை.  
**பணி கிளை:** `research/bv-raman-ashtakavarga-ayurdaya`  
**புதிய கணக்கீட்டு கோப்பு:** `public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs`

## முடிவு

B. V. Raman-ன் *Ashtakavarga System of Prediction* நூலுக்கான அசல் அத்தியாயப் பக்கங்கள் தற்போது அணுகக்கூடிய Library-யில் இல்லை. கிடைத்துள்ள துணை விளக்கங்களிலிருந்து முறைகளின் வடிவத்தைத் தனி ஆராய்ச்சி இயந்திரமாக அமைக்கலாம்; ஆனால் அவற்றை முதன்மை நூல்-சான்றாகவோ முழுமையாகச் சரிபார்க்கப்பட்ட கணக்கீடாகவோ அறிவிக்க முடியாது.

இந்தக் குறை மறைக்கப்படவில்லை. புதிய இயந்திரம்:
- ஏழு கிரகங்களின் Bhinnashtakavarga வரிசைகளைச் சரிபார்க்கிறது.
- Trikona Shodhana மற்றும் Ekadhipatya Shodhana-வைத் தனித்தனி trace உடன் கணக்கிடுகிறது.
- Method A-வில் Rasi Pinda, Graha Pinda, Sodya Pinda மற்றும் மொத்தக் கணித இடைநிலைகளைத் தருகிறது; ஆனால் ஹரணத்திற்குப் பிந்தைய மொத்தத்தையும் இறுதி ஆயுர்த்தாயத்தையும் `null` ஆகவே வைக்கிறது.
- Method B-யில் 100-ஆண்டு கழித்தல் விதியைப் பயன்படுத்தும்/பயன்படுத்தாத இரு கணித விளைவுகளையும் ஒப்பீட்டுக்காகத் தருகிறது; எதையும் இறுதி முடிவாகத் தேர்ந்தெடுக்காது.
- `strength6`, C.G. ராஜன் Pinda/Amsa/Naisargika, BPHS Ayurdaya, Horoscope UI, Marriage Matching UI ஆகியவற்றிலிருந்து தனியாக உள்ளது.

## கிடைத்த நூல் சான்றுகளின் வரம்பு

### A. B. V. Raman, *Hindu Predictive Astrology*, 20th ed. (1992), Chapter XXVI, pp. 199–203
இந்த நூலின் அத்தியாய உரை தேடக்கூடிய scan/OCR transcription வழியாகக் கிடைத்தது; சம்பந்தப்பட்ட பக்கங்களின் காட்சி சரிபார்ப்பு இன்னும் நிலுவையில் உள்ளது. ஆகவே regression-இல் இது **author-text transcription oracle** என்று அடையாளப்படுத்தப்பட்டுள்ளது; page-image-verified என்று அல்ல. இது *Ashtakavarga System of Prediction* என்ற தனி நூலின் Method A/B எடுத்துக்காட்டுடன் ஒரே chart எனக் கருதப்படவில்லை.

Sun எடுத்துக்காட்டில்:
- குறைக்கப்பட்ட SoAV வரிசை: `[2,3,0,3,0,0,0,0,0,2,2,2]`
- Rasi Gunakara: `[7,10,8,4,10,5,7,8,9,5,11,12]`
- ஒவ்வொரு ராசிப் பெருக்கலும்: `2×7=14; 3×10=30; 0×8=0; 3×4=12; 0×10=0; 0×5=0; 0×7=0; 0×8=0; 0×9=0; 2×5=10; 2×11=22; 2×12=24`
- கூட்டுத்தொகை: `14+30+0+12+0+0+0+0+0+10+22+24 = 112` — Rasi Pinda **112**.
- Graha Gunakara: Sun 5, Moon 5, Mars 8, Mercury 5, Jupiter 10, Venus 7, Saturn 5. அந்த எடுத்துக்காட்டில் Sun row-ஐ வைத்து: Sun `3×5=15`, Moon `3×5=15`, Mars `0×8=0`, Mercury `0×5=0`, Jupiter `0×10=0`, Venus `0×7=0`, Saturn `3×5=15`. மொத்தம் `15+15+0+0+0+0+15=45` — Graha Pinda **45**.
- Sodhya Pinda: `112+45=157`.
- Gross years: `157×7÷27 = 40.703703…`; 27-ஐ ஒருமுறை கழித்தால் `13.703703…`, அச்சிடப்பட்ட `13.70` உடன் பொருந்துகிறது (printed rounding/truncation வரம்பில்).

அதே chart-க்கான நூல் transcription-ல் ஏழு கிரகங்களின் (Rasi Pinda, Graha Pinda) ஜோடிகள்:
`Sun (112,45); Moon (104,60); Mars (8,10); Mercury (132,80); Jupiter (85,50); Venus (81,15); Saturn (118,50)`.
ஒவ்வொன்றுக்கும் `(Rasi Pinda + Graha Pinda) × 7 ÷ 27`, பின்னர் 27-ன் முழுப் பெருக்கல்களை நீக்குவது, வெளியிடப்பட்ட gross-year மதிப்புகளுடன் சுமார் 0.02 ஆண்டுக்குள் ஒத்துவருகிறதா என்பதை regression தனியாகச் சரிபார்க்கிறது.

**தீர்க்கப்படாத source arithmetic discrepancy:** அச்சு transcription காட்டும் Net Lunar Years `48.98`, Solar conversion `334/365`, இறுதி `44.87`. ஆனால் `48.98×334÷365 = 44.822…` (சுமார் **44.82**), **44.87 அல்ல**. Regression இந்த வேறுபாட்டை pin செய்கிறது; 44.87-ஐ அமைதியாக மாற்றவோ, 44.82-ஐ நூல் சொன்ன இறுதிப் பலன் என்று அறிவிக்கவோ மாட்டாது. பக்கப் படத்தைச் சரிபார்த்து அச்சு/OCR வேறுபாடு உள்ளதா என்று உறுதிசெய்ய வேண்டும்.

### B. தனி *Ashtakavarga System of Prediction* Method A/B-க்கான secondary transcription
தனி நூலின் அசல் அத்தியாயப் பக்கங்கள் Library-யில் இல்லை. இதனால் கீழேயுள்ள எடுத்துக்காட்டுகள் **secondary transcription only**; அவற்றை Raman-ன் அசல் primary-page oracle என்று எண்ணக்கூடாது.

| கிரகம் | Rasi Pinda | Graha Pinda | Sodhya Pinda | கணித Gross Years (×7÷27, 27-ன் பெருக்கல்களை நீக்கி) | Secondary transcription-ல் கூறப்பட்டது | நிலை |
|---|---:|---:|---:|---:|---:|---|
| Sun | 96 | 86 | 182 | 20.1852 | 20.20 | அருகிலான ஒத்திசைவு |
| Moon | 80 | 20 | 100 | 25.9259 | 26.00 | அருகிலான ஒத்திசைவு |
| Mars | 126 | 71 | 197 | 24.0741 | 24.00 | வேறுபாடு 0.0741 (0.1 tolerance-க்குள்) |
| Mercury | 97 | 61 | 158 | 13.9630 | 14.00 | அருகிலான ஒத்திசைவு |
| Jupiter | 79 | 45 | 124 | 5.1481 | 5.00 | **வேறுபாடு 0.1481** |
| Venus | 66 | 0 | 66 | 17.1111 | 15.80 | **வேறுபாடு 1.3111** |
| Saturn | 170 | 42 | 212 | 0.9630 | 12.00 | **வேறுபாடு 11.0370** |

Jupiter, Venus, Saturn ஆகிய மூன்று மதிப்புகள் 0.1 ஆண்டை விட அதிகமாக வேறுபடுகின்றன; Mars மதிப்பின் வேறுபாடு 0.0741 என்பதால் கீழே உள்ள regression tolerance-க்குள் வருகிறது. இந்த வேறுபாடுகளுக்கான அனுமான விளக்கம் உருவாக்கப்படவில்லை. Method A-வின் அசல் அச்சுப் பக்கங்களையும் முழு worked chart-ஐயும் பெற்று கணக்கு/அச்சு/OCR ஆகியவற்றில் எது தவறு என்பதை ஒப்பிட வேண்டும்.

Method B secondary worked example-ல் `Rasi Pinda=217; Graha Pinda=195; Sodhya Pinda=412`; இதனால் `412×7÷27=106.8148…` கிடைக்கிறது. Secondary transcription-ல் 100-ஆண்டு கழித்தல் விதி மற்றும் சுமார் `94.8` சூரிய ஆண்டுகள் இரண்டும் கூறப்பட்டாலும், கழித்தல் சந்திர ஆண்டை சூரிய ஆண்டாக மாற்றுவதற்கு முன்பா பின்பா என்பது தெளிவில்லை. எனவே இரண்டு கணக்குப் பாதைகளும் தனித்தனியாக regression-இல் வைக்கப்பட்டுள்ளன; அசல் Chapter XIV பக்கத்தைச் சரிபார்க்கும் வரை எதுவும் இறுதி விதியாகத் தேர்வு செய்யப்படாது.

## ஏன் இப்போது இறுதி முடிவு காட்ட முடியாது?

### 1. Method A — Bhinnashtakavarga

துணை விளக்கத்தில் காணப்படும் Rasi Gunakara வரிசை:

`[7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]`

இந்த வரிசை, BPHS Shodhya-Pinda ஆய்வுக் கோப்பில் பயன்படுத்தப்படும் multipliers-க்கு முழுமையாக ஒரே மாதிரியாக இல்லை. குறிப்பாக Virgo/கன்னி multiplier வேறுபடுகிறது; எனவே ஒரு முறையின் helper-ஐ மற்ற முறைக்கு நேரடியாகப் பயன்படுத்தக் கூடாது.

துணை விளக்கத்தில் உள்ள worked-example எண்களே கணித ரீதியில் ஒத்துவராத இடங்கள் உள்ளன:
- Sodya Pinda 66 என்றால் (66 	imes 7 / 27 approx 17.11); அதனை 15.80 என்று தரும் அட்டவணை இந்த சூத்திரத்துடன் பொருந்தவில்லை.
- Sodya Pinda 212 என்றால் (212 	imes 7 / 27 approx 54.96); அதை 27-இல் modulo செய்தாலும் 12.00 கிடையாது.
- ஹரண விதி அட்டவணையில் குறிப்பிடும் house-fraction-களுக்கும் அதே விளக்கத்தில் வழங்கிய சில worked reductions-க்கும் முரண்பாடு உள்ளது.

இதற்கான சரியான விளக்கம் அசல் அச்சுப் பக்கங்களுடன் ஒப்பிடாமல் ஊகிக்கப்படாது. எனவே Method A இறுதி ஹரணங்கள், net lunar years, solar years மற்றும் இறுதி மொத்தம் உருவாக்கப்படவில்லை.

### 2. Method B — Sarvashtakavarga / Nakshatrayu

துணை விளக்கத்தில் உள்ள எடுத்துக்காட்டில்:
- Rasi Pinda = 217
- Graha Pinda = 195
- Sodya Pinda = 412
- (412 	imes 7 / 27 approx 106.81) lunar-year units

அதே விளக்கம் 100-ஐ மீறும் மதிப்பில் 100 ஆண்டைக் கழிக்க வேண்டும் என்றும், பின்னர் சுமார் 94.8 solar years கிடைத்ததாகவும் காட்டுகிறது. ஆனால் 106.81-இலிருந்து 100-ஐ முதலில் கழித்தால் அதே 94.8 கிடையாது. அதாவது விதி மற்றும் எடுத்துக்காட்டின் இறுதி கணக்கு ஒரே நடைமுறையைப் பின்பற்றவில்லை.

புதிய இயந்திரம் இரு வழிகளின் இடைநிலைகளையும் தருகிறது; இறுதி மதிப்பைத் தேர்ந்தெடுக்கவில்லை.

### 3. Shodhana

Trikona/Ekadhipatya வரிசை, occupancy விதிவிலக்குகள் மற்றும் reduced Sarvashtakavarga கட்டமைப்பு research-only ஆகச் சேர்க்கப்பட்டுள்ளன. இது BPHS Shodhana helper-ஐ மறுபெயரிட்டு பயன்படுத்துவது அல்ல. ஆனால் முதன்மை Raman அச்சுப் பக்கங்களும், முழுக் கணக்கைக் கொண்ட அசல் chart example-உம் சேர்க்கப்படும் வரை `certified:false` எனவே இருக்கும்.

## ஏழு கிரகங்களுக்கான Standard Horoscope reduction regression

இப்போது B. V. Raman, *Ashtakavarga System of Prediction*, Chapter II, Table I-இன் before/after-reduction தரவுகளின் ஒரு secondary transcription தனி oracle ஆகச் சேர்க்கப்பட்டுள்ளது. அந்த transcription-இல் ஜூலை 2026 திருத்தக் குறிப்பு உள்ளது: Standard Horoscope-இல் சந்திரன் கும்பம், புதன் துலாம். இது அசல் அச்சுப் பக்கத்தை நேரடியாகக் கண்ணால் சரிபார்த்ததற்கு மாற்றாகாது; இருந்தாலும், ஏழு கிரகங்களின் 84 reduced bindu cells, 12 reduced-SAV totals ஆகியவற்றை regression-ல் ஒப்பிட முடிகிறது.

| கிரகம் | BAV மொத்தம் (முன்) | Trikona + Ekadhipatya பின் மொத்தம் | Rasi Pinda | Graha Pinda | Sodhya Pinda |
|---|---:|---:|---:|---:|---:|
| சூரியன் | 48 | 12 | 96 | 86 | 182 |
| சந்திரன் | 49 | 11 | 80 | 20 | 100 |
| செவ்வாய் | 39 | 13 | 126 | 71 | 197 |
| புதன் | 54 | 12 | 97 | 61 | 158 |
| குரு | 56 | 11 | 79 | 45 | 124 |
| சுக்கிரன் | 52 | 8 | 61 | 5 | 66 |
| சனி | 39 | 15 | 108 | 62 | 170 |
| **மொத்தம்** | **337** | **82** |  |  |  |

இந்த Rasi Pinda-கள் அனைத்திலும் 12 ராசிகளுக்கான ஒவ்வொரு `after-reduction bindu × Rasi Gunakara` பெருக்கலும், Graha Pinda-வில் ஏழு கிரகங்களின் `bindu at that planet's sign × Graha Gunakara` பெருக்கல்களும் test-ல் தனித்தனியாக ஒப்பிடப்படுகின்றன. பின்னர் Rasi + Graha = Sodhya என்பதும் ஒவ்வொரு கிரகத்திற்கும் உறுதிசெய்யப்படுகிறது.

**குறிப்பு:** மேலுள்ள Standard Horoscope Pinda அட்டவணை என்பது Table I reduced rows-இலிருந்து மறுகணக்கிட்ட மதிப்புகள். இதை ASOP Method-A secondary guide-ல் வேறு இடத்தில் கூறப்பட்ட `Venus 66+0`, `Saturn 170+42` போன்ற split-களுடன் ஒன்றாகக் கருதக்கூடாது. அந்த guide-ல் உள்ள Planet totals/gross-year எடுத்துக்காட்டுகள் அப்படியே தனி discrepancy test ஆக வைத்திருக்கப்படுகின்றன; ஒன்றை மற்றொன்றுக்கு ஏற்றவாறு மாற்றவில்லை.

## கட்டாயமாக நிறைவேற்ற வேண்டிய சான்றுகள்

1. *Ashtakavarga System of Prediction* நூலின் பதிப்பு விவரம், Ayurdaya அத்தியாயம் மற்றும் சம்பந்தப்பட்ட அச்சுப் பக்கங்களை scan-இல் காட்சி வடிவில் சரிபார்த்தல்.
2. Method A மற்றும் Method B இரண்டிற்குமான அசல் worked chart — கிரக நீளங்கள்/ராசிகள், BAV/SAV வரிசைகள், Trikona/Ekadhipatya reductions, Pinda கணக்குகள், ஹரணங்கள், சந்திர/சூரிய ஆண்டு மாற்றம், இறுதித் தொகை.
3. ஒவ்வொரு இடைநிலைக்கும் தனித்தனி regression oracle; அட்டவணையில் உள்ள மொத்தத்தைப் பொருத்துவதற்காக சூத்திரத்தை மாற்றக் கூடாது.
4. Horoscope மற்றும் Marriage Matching-இல் உற்பத்திப் பயன்பாடு வேண்டுமெனில் தனியான ஒப்புதல், parity மற்றும் UI audit. இந்த கிளையில் அத்தகைய இணைப்பு செய்யப்படவில்லை.

## பாதுகாப்பான வெளியீட்டு விதி

இது பாரம்பரிய நூல் முறையின் கணிதப் பிரதியெடுப்பு ஆராய்ச்சி மட்டுமே. மருத்துவ ஆயுள் கணிப்பு அல்லது மரண வயது/தேதி கணிப்பு அல்ல. முதன்மை நூல்-எண்கள் முழுமையாகப் பொருந்தி, சோதனைகள் சான்றளிக்கும் வரை பயனர் அறிக்கைகளில் இறுதி ஆயுர்த்தாய மதிப்பு காட்டப்படக்கூடாது.


## 2026-10-19 — Chapter XIV + Chapter XXVI integration prototype

A new research-only module has been added:
- public/horoscope/offline/bv-raman-hpa-ayurdaya-combined.browser.mjs
- Regression: tests/bv-raman-hpa-ayurdaya-combined-regression.mjs

The new module explicitly targets the two chapters of the same book, *Hindu Predictive Astrology*:
- **Chapter XIV, Ayurdaya or Longevity**: selected qualitative combinations for Balarishta, Alpayu, Madhyayu and Purnayu, plus selected antidotes. It emits matched, not-matched and unknown rule traces. This is a partial list, not the full chapter's combinations.
- **Chapter XXVI, The Ashtakavarga System**: reduced BAV rows -> Rasi Pinda + Graha Pinda -> Sodhya Pinda -> gross lunar-year term -> separate per-graha Harana -> 334/365 solar-year candidate.

### How the two tracks are combined

They are joined by a cross-check, **not by averaging**:
1. Chapter XIV makes one or more rule-category candidates from placements and independently supplied source-sensitive facts.
2. Chapter XXVI calculates its own numerical candidate from the reduced BAV and Pinda arithmetic.
3. A candidate overlap or disagreement is recorded for review. Neither track overrides the other and no final category is selected automatically.
4. No death age/date field is produced, no final lifespan is released, and customer Horoscope/Marriage Matching output is not changed.

### Harana rule added from Chapter XXVI

The implementation records all seven factors separately: conjunction in the same sign, debilitation, combustion, temporary-enemy sign, above-horizon placement, defeat in planetary war, and eclipse for Sun/Moon. Where multiple factors apply, it selects only the **largest single deduction** (one-half takes precedence over one-third); it does not multiply/stack all reductions. Every source-sensitive Harana boolean must be explicit; missing facts block the adjusted term.

### Newly pinned arithmetic discrepancy

Using the reported Pinda pairs for the Chapter XXVI example and re-calculating gross lunar years directly from (Rasi Pinda + Graha Pinda) × 7 / 27, then taking the modulo-27 remainder and truncating each post-Harana graha term to two decimals, the prototype gets:
- Recomputed net lunar-year sum: **48.97**, not the printed **48.98**.
- Conversion of the printed 48.98 by 334/365: 44.820054…, or **44.82**, not printed **44.87**.
- Conversion of the independently recomputed 48.97 by 334/365: 44.810904…, or **44.81**.

These differences are deliberately preserved as discrepancies. The formulas are not altered to force the book's printed total. This does **not** prove the original book is wrong: page-image examination is needed to distinguish print, transcription, intermediate rounding, or implementation-method differences.

### Remaining certification blockers

- The original PDF's specific Chapter XIV and XXVI page images have not yet passed page-by-page visual verification. The text transcription is not marked as page-image-certified.
- The complete Chapter XIV category/rule set and all cancellations are not implemented; unimplemented conditions remain outside this prototype, not interpreted as absent.
- Strength, Drekkana, aspects and special full-Moon conditions need independently validated inputs. Provisional Shadbala strength6 is not silently elevated to certified evidence.
- The complete source worked chart must be reconstructed with every input, all BAV cells, both Shodhana reductions, all 12 Rasi products, all 7 Graha products, each Harana factor, each rounding step and the final conversion.
- Method A/B transcriptions from the separate book *Ashtakavarga System of Prediction* remain a separate research track. They are not silently substituted for *Hindu Predictive Astrology*, Chapter XXVI.
- The workflow must run green before considering the branch ready for review. Nothing is merged to main as part of this change.

## 2026-10-19 — Chapter XIV rule-boundary and Harana input audit

A further code-level review made two fail-closed corrections in the combined prototype:

1. The searchable secondary transcription of *Hindu Predictive Astrology*, Chapter XIV, describes the Moon-in-Kendra rule as the Moon being **with malefics**. The matcher now treats same-sign conjunction evidence as distinct from a malefic aspect. For both Chapter XIV Balarishta combinations 2 and 3, the absence of benefic aspect is explicitly required; combination 2 therefore fails when a benefic aspect protects the Moon. Regression tests cover (a) conjunction + no benefic aspect, (b) conjunction + benefic aspect, and (c) malefic aspect without conjunction.
2. Chapter XXVI's eclipse factor explicitly concerns the Sun or Moon. The Harana function now requires the affected classical planet to be named and rejects `eclipsed: true` for Mars, Mercury, Jupiter, Venus or Saturn. A regression test pins this invalid-input case.

These are source-scope and input-validation fixes, not proof of complete classical correctness. The reference accessed during this audit is a searchable OCR/transcription, not the original repo PDF inspected as page images. Accordingly, the evidence grade remains `TEXT_TRANSCRIPTION_PAGE_IMAGE_PENDING`, no final lifespan is produced, and production Horoscope/Marriage Matching outputs remain unchanged.

## 2026-10-19 — External searchable-text cross-check (not page-image certification)

An independently accessible searchable transcription of *Hindu Predictive Astrology* was checked against the implementation's Chapter XIV/XXVI scope:

- Chapter XIV is indexed as “Ayurdaya or Longevity”; the searchable chapter text describes the four categories as Balarishta, Alpayu, Madhyayu and Purnayu, and discusses combinations and antidotes. This supports keeping the rule track separate from the numeric Ashtakavarga track, but does not validate the prototype's partial rule list.
- Chapter XXVI searchable text explicitly lists the selected reductions: multiple planets in a sign (one-half), debilitation (one-half), combustion (one-half), temporary enemy sign (one-third), above-horizon planets (one-half), defeat in planetary war (one-third), and unusual/eclipsed Sun or Moon (one-third). It also says that where a single planet has several reductions, only the highest reduction is applied. This agrees with the current prototype's factor list and non-stacking rule.
- The same searchable transcription lists net lunar terms as Sun 13.70, Moon 7.76, Mars 2.33, Mercury 0.48, Jupiter 4.00, Venus 12.44, Saturn 8.27, total 48.98; then prints the 334/365 conversion and 44.87 solar years. Direct arithmetic gives 48.98 × 334 ÷ 365 = 44.82005479…, i.e. 44.82 to two decimals. The source-text conflict therefore remains real in the accessible transcription and is not corrected by changing code to force 44.87.
- The accessible source is a web OCR/searchable-text transcription, not a verified scan of the exact edition/page images in this repository. It cannot close the primary-page evidence gate. The online transcription also notes that the Ashtakavarga longevity system has not been found satisfactory in actual practice; this reinforces withholding a definitive longevity output rather than presenting a spurious precision.

References checked on 2026-10-19:
- Chapter XIV searchable transcription: https://www.scribd.com/document/808320122/Hindu-Predictive-Astrology-BV-Raman
- Chapter XXVI searchable transcription around printed pages 202–203: https://www.scribd.com/document/808320122/Hindu-Predictive-Astrology-BV-Raman
- Alternate searchable scan/OCR listing Chapter XIV: https://pdfcoffee.com/b-v-raman-hindu-predictive-astrology-1996pdf-pdf-free.html

Evidence grade remains `TEXT_TRANSCRIPTION_PAGE_IMAGE_PENDING`. Do not promote the research prototype to production or mark classical certification complete based on this check.


## 2026-10-19 — Primary scan review and formula-first arithmetic correction

The original repository PDF `certificates/hindu-predictive-astrology-bv-raman-1.pdf` was rendered into scan images by the B.V. Raman QA workflow and visually reviewed. Relevant page mapping:
- PDF image pages 70–79 correspond to printed *Hindu Predictive Astrology* pp. 63–72 (Chapter XIV, Ayurdaya).
- PDF image pages 206–210 correspond to printed pp. 199–203 (Chapter XXVI, Ashtakavarga).
- The images came from the repository's source PDF; this check was not limited to OCR/searchable transcription.

### Chapter XIV rule-source correction

Printed p. 64 lists these as distinct conditions:
1. “The Moon in a kendra (quadrant) with malefics.”
2. “The Moon in the 7th, the 8th and the 12th houses from the ascendant with malefics and without being aspected by benefics.”

Accordingly, `XIV-BAL-02` no longer imposes a no-benefic-aspect condition that the first printed rule does not state; `XIV-BAL-03` retains it. “With malefics” is checked as co-occupancy of the same house, separately from aspect evidence. The source also lists the first Madhyayu combinations independently on printed p. 70. They are now tracked as separate rules, not incorrectly joined by AND. Additional source combinations remain explicit-input/unknown or outside this partial rule engine.

### Chapter XXVI formula-first oracle

The scan shows the Pinda totals and conversion steps:
- Printed p. 199: Rasi Gunakara list and the Sun after-reduction row.
- Printed p. 200: Sun Rasi Pinda 112; Graha Gunakara values; Sun Graha Pinda 45.
- Printed p. 201: formula `(Rasi Pinda + Graha Pinda) × 7 ÷ 27`, reducing by 27 or multiples of 27 as needed; Sun `112 + 45 = 157`, hence `157 × 7 ÷ 27 − 27 = 13.703703…` years.
- Printed p. 202: other planets' Pinda pairs and the half/one-third Harana rules; it notes the displayed fractions are omitted for convenience and only the highest deduction applies when several apply.
- Printed p. 203: the remaining-term table and `334/365` conversion. The scanned page itself prints net total `48.98` and solar result `44.87`.

The implementation now prioritizes formula arithmetic, keeping full precision through each graha term, Harana and sum, and rounding only the final display:
- Recompute each gross term from the integer Pinda pair, rather than treating the rounded/truncated gross-year display as the numerical input.
- The scan says every graha term except the Sun is halved in the worked horoscope. Applying that effective remaining fraction to the full-precision terms yields **49.00 lunar years**.
- `49 × 334 ÷ 365 = 44.8383561643…`, which is **44.84 solar years** at two decimals.
- Converting the printed `48.98` total alone gives `44.82005479…`, or **44.82**, not the printed `44.87`.
- The seven displayed net terms add to `48.98`, but the displayed gross/net terms do not consistently preserve the full-precision formula; the engine must not sum truncated display values as if they were exact arithmetic values.

Implementation changes:
- The Harana result separates `unroundedNetLunarYears` from `roundedNetLunarYears`.
- The Chapter XXVI engine sums unrounded terms and applies `334/365` before rounding.
- `reportedRemainingFraction` stores only the effective half/no-half rule established by the scan; the code no longer falsely labels each half reduction as specifically caused by same-sign conjunction.
- The scanned `48.98` and `44.87` remain available as source-printed values/discrepancies, not as formula-derived outputs.

### Updated status

- **PASS — Primary scan pages visually inspected:** Chapter XIV pp. 63–72; Chapter XXVI pp. 199–203.
- **PASS — Formula arithmetic:** the source Pinda pairs and effective Harana rule produce 49.00 lunar years and 44.84 solar years at two decimals.
- **PASS — Source discrepancies retained:** the printed 48.98 / 44.87 are logged but not forced into computed results.
- **PASS — Chapter XIV rule boundary:** rule 2 vs rule 3 and the separate Madhyayu combinations now follow the scanned wording.
- **PENDING — Broader certification:** complete per-sign reduced-BAV rows for all seven grahas, source attribution for every half-deduction factor, exhaustive Chapter XIV rule/cancellation coverage, and independent live-chart golden oracles.
- **SAFETY GATE:** research-only; no customer-facing longevity or death-age/date output; `certified:false`; no production `main` change.

## 2026-10-19 — HPA printed p. 190 Ashtakavarga table pinned as a separate primary oracle

The repository's primary scan was inspected at PDF image page 197, printed p. 190, headed **“Ashtakavarga Tables Before and After Reduction.”** A separate source fixture, `BV_RAMAN_HPA_STANDARD_HOROSCOPE_ASHTAKAVARGA_ORACLE`, and regression pins have been added.

- All 84 before-reduction BAV cells are transcribed by graha and sign, Aries through Pisces.
- All 84 after-reduction A.R. cells are transcribed separately; no calculated values were substituted for printed cells.
- Printed row totals before reduction: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39; overall total **337**.
- Printed row totals after reduction: Sun 14, Moon 12, Mars 1, Mercury 15, Jupiter 10, Venus 11, Saturn 18; overall total **81**.
- Printed per-sign totals before reduction: `29, 33, 33, 28, 23, 27, 28, 24, 30, 25, 26, 31`.
- Printed per-sign totals after reduction: `6, 13, 6, 12, 2, 7, 3, 8, 8, 4, 4, 8`.

This is **not** the same fixture as `BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE`, which remains explicitly attributed to a secondary transcription of *Ashtakavarga System of Prediction*, Chapter II, with its stated 2026 position correction. The old HPA printed table is retained as a cross-reference only; its cells must not silently overwrite the separately versioned ASOP table.

### Gate status after this step

- **PASS — HPA p. 190 transcription regression:** 168 cells (84 B.R. + 84 A.R.), 14 graha-row totals, 24 per-sign totals and the 337/81 aggregate checks are pinned by tests.
- **PASS — HPA p. 188 → p. 190 reduction parity:** the page 188 occupancy explanation identifies Taurus and Scorpio as occupied among the dual-lord signs (the text explicitly sets Rahu/Ketu aside). Applying the encoded Trikona then Ekadhipatya stages to the seven printed B.R. rows reproduces all 84 printed A.R. cells and the per-sign A.R. totals, ending at 81 for this HPA example/edition. This certifies regression parity for this specific table, not the complete Ayurdaya method.
- **PENDING — ASOP primary Table I:** the original page image for *Ashtakavarga System of Prediction*, Chapter II, Table I has not been found in the repository or the inspected uploaded-PDF library. The 2026 correction note is secondary evidence, not a replacement for the original page.
- **Safety gate unchanged:** research-only; `certified:false`; no customer-facing lifespan/death age/date; no production merge.

## 2026-10-19 — Chapter XXVI printed p. 202 Harana rule IDs and per-rule regressions

The original scan image for printed p. 202 (repository PDF image page 209) was visually checked. The seven source deductions are now represented by a single exported rule catalogue, `BV_RAMAN_HPA_CHAPTER_XXVI_HARANA_RULES`, with the source printed page and rule number attached:

| Printed rule | Factor | Deduction |
|---:|---|---:|
| 52 | More than one planet in a sign | 1/2 |
| 53 | Debilitated planet | 1/2 |
| 54 | Combust planet | 1/2 |
| 55 | Temporary-enemy sign | 1/3 |
| 56 | Planet above horizon (houses 7–12) | 1/2 |
| 57 | Defeat in planetary war | 1/3 |
| 58 | Unusual/eclipsed Sun or Moon | 1/3 |

Regression now pins all seven rule-to-source mappings and independently runs each factor through the Harana function to test its fraction and net-term arithmetic. The existing cases still require all factor flags to be explicit, reject eclipse Harana for non-luminaries, and apply only the largest deduction rather than stacking reductions.

Printed p. 203 (PDF image page 210) explicitly says that, in this worked example, every planet's term except the Sun is halved because the Sun is below the horizon. It does **not** identify which individual factor from rules 52–58 causes each of the other six halvings. The implementation therefore retains the scanned effective remaining fraction for the numerical formula oracle but does not invent a per-planet cause.

### Gate status

- **PASS — Primary image reviewed:** printed pp. 186–190 for Trikona/Ekadhipatya/table values and pp. 201–203 for formula, Harana definitions and displayed conversion.
- **PASS — p. 202 factor provenance:** rules 52–58 are explicit in source metadata and each is exercised independently by regression.
- **PASS — p. 190 reduction oracle:** all 84 B.R. cells, 84 A.R. cells, row totals, sign-column totals, and overall 337/81 aggregates match the scanned table; using the p. 188 worked occupancy (Taurus and Scorpio occupied) the reduction implementation reproduces the printed A.R. table.
- **PENDING — worked-chart factor cause:** the printed worked example does not attribute each of six half-reductions to a specific one of rules 52–58. Do not synthesize those causes from insufficient scan evidence.
- **PENDING — separate ASOP primary table:** the original *Ashtakavarga System of Prediction* Table I scan still needs independent access/verification; the secondary transcription remains separate.
- **Safety gate unchanged:** research-only, `certified:false`, no customer-facing lifespan/death age/date, no merge to `main`.

## 2026-10-19 — Chapter XIV complete source-rule inventory and source-number correction

The scan images for printed pp. 63–72 (repository PDF image pages 70–79) were reviewed as a sequence. The runtime now exposes a 76-entry `BV_RAMAN_HPA_CHAPTER_XIV_SOURCE_RULE_INVENTORY` spanning all source-numbered combinations and antidotes. A source rule that has no evaluator is returned as `UNKNOWN` with `implemented: false`; it is no longer absent from the rule trace and cannot be mistaken for a tested non-match.

| Printed category | Source rules | Evaluators currently present | Gap |
|---|---:|---:|---:|
| Balarishta | 30 | 9 | 21 |
| Antidotes | 10 | 9 | 1 |
| Alpayu | 15 | 10 | 5 |
| Madhyayu | 15 | 5 | 10 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **39** | **37** |

The page-by-page image review found two rule-ID attribution errors in the prior partial evaluator:
- The “Lagna and Moon both in common signs” condition is printed Alpayu rule 15, not rule 4. It is now `XIV-ALP-15`.
- “Weak Lagna lord with the 8th lord in a Kendra” is printed Alpayu rule 12, not rule 5. It is now `XIV-ALP-12`.
- The actual printed Alpayu rules 4–8 are now represented as their own evaluated conditions (8th lord in Lagna with Ketu; malefics in Lagna with Moon-malefic conjunction; 8th lord in Lagna with powerless Lagna lord; Scorpio Lagna/Sun/Jupiter/8th-lord Kendra combination; Rahu 7th/Moon 8th/Jupiter Lagna).
- “Benefics in Kendras/Trikonas with powerful Saturn” is printed Madhyayu rule 15, not rule 5. It is now `XIV-MAD-15`; printed Madhyayu rules 5–14 remain individually indexed as unimplemented/unknown.

The selected-rule evaluator still never chooses a final longevity category or emits lifespan/death-age/death-date output. All strength, Drekkana, Dasa and special-condition inputs remain source-sensitive; missing inputs stay unknown.

### Regression evidence after this change

- **PASS:** syntax checks.
- **PASS:** B.V. Raman Ayurdaya regression (137 assertions).
- **PASS:** integrated Chapter XIV + XXVI regression (101 assertions).
- **PASS:** BPHS Shodhana textbook regression (171 assertions).
- **PASS:** P.V.R. Narasimha Rao Shodhana textbook regression (1,253 assertions).
- **PASS:** the HPA p. 190 B.R./A.R. oracle still reproduces all table cells and totals.
- **PENDING:** 37 Chapter XIV rules still have no evaluator; their presence in the inventory is a coverage safeguard, not completion.
- **Safety gate unchanged:** research-only; `certified:false`; no customer-facing lifespan or death prediction; no merge to `main`.

## 2026-10-19 — Additional Chapter XIV evaluators from the page-image review

The source evaluator has now been extended for directly checkable conditions, keeping conditions that depend on missing Dasa, Shadvarga, sunrise/sunset, Drekkana, aspect or strength evidence explicit rather than guessed.

New source-numbered evaluators added from the scan:
- **Balarishta 7–8:** exact Moon/Mars/Sun/Saturn house pattern (rule 7); weak Moon in Ascendant plus an explicit sourced-input flag for malefic aspects to houses 5, 8 and 12 (rule 8).
- **Balarishta 13–14:** Ketu in house 4 with/aspected by malefics; Rahu in 7th aspected by Sun and Moon.
- **Balarishta 18:** Moon in 8th, Mars in 7th and Saturn in Ascendant.
- **Balarishta 21–24:** Moon in Ascendant with malefics/no benefic aspect; Moon Ascendant with Rahu/Mars in 8th; Sun/Saturn Ascendant with Rahu/Mars in 8th; malefics 5/8/9 plus Sun or Moon in Ascendant without benefic conjunction/aspect.
- **Balarishta 29–30:** Moon in 6th/8th with both malefic and benefic aspects versus benefic aspect alone.
- **Antidote 8:** Moon in 6th/8th with explicit `bornOnNightOfFullMoon` input. Missing evidence does not count as a match.

The latest code-level coverage is now:

| Printed category | Source rules | Evaluators present | Not implemented |
|---|---:|---:|---:|
| Balarishta | 30 | 20 | 10 |
| Antidotes | 10 | 10 | 0 |
| Alpayu | 15 | 10 | 5 |
| Madhyayu | 15 | 5 | 10 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **51** | **25** |

Regression now checks the 76 unique source rule IDs, that unsupported rules remain `UNKNOWN`, the updated category coverage counters, rule 7's direct positions, and Antidote 8's requirement for explicit evidence. The seven Harana factors from printed p. 202 also remain individually source-numbered and tested.

### Remaining boundaries

- Balarishta 4, 10–12, 15–17, 25–26 and 28 remain unimplemented; the exact birth-time/Dasa conditions and complex wording are not inferred.
- Madhyayu 5–14 remain indexed as `UNKNOWN`; multiple rules require exact “between malefics,” weakness, Dasa-lord, or complete-placement facts not yet supplied by an independently validated evaluator.
- Alpayu 9–11 and 13–14 remain `UNKNOWN`; disputed or multi-condition wording is not guessed.
- This raises rule coverage; it does **not** complete every cancellation or validate the longevity classification, and does not close the separate *Ashtakavarga System of Prediction* primary Table I gate.

**Release boundary unchanged:** research-only, `certified:false`, customer display prohibited for final lifespan/death-age/death-date, PR #55 stays unmerged.

## 2026-10-19 — Second Chapter XIV evaluator pass

Additional scan-grounded conditions were added as separate evaluators rather than merged into neighbouring rules:
- Balarishta source rules 7, 8, 13, 14, 18, 21, 22, 23, 24, 29 and 30.
- Antidote source rule 8, requiring both Moon in house 6/8 and explicit `bornOnNightOfFullMoon` evidence. Missing evidence remains `UNKNOWN`.

The test fixtures now check a direct house-placement oracle for Balarishta rule 7 and an evidence-required oracle for Antidote rule 8. The inventory continues to return all 76 rules. Updated evaluator coverage is:

| Printed category | Source rules | Evaluators currently present | Gap |
|---|---:|---:|---:|
| Balarishta | 30 | 20 | 10 |
| Antidotes | 10 | 10 | 0 |
| Alpayu | 15 | 10 | 5 |
| Madhyayu | 15 | 5 | 10 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **51** | **25** |

A present evaluator does not imply that a chart result is determinate: missing source-dependent inputs, aspects, strength, or event evidence must still yield `UNKNOWN`. The counts describe code coverage only, not classical certification.

### CI after this pass

- B.V. Raman research QA: PASS — run [39211100622](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39211100622).
- Horoscope Matching DST Source QA: PASS — run [39211100524](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39211100524).
- PR #55 remains open and unmerged; this work remains research-only.

## 2026-10-19 — Alpayu source-rule coverage pass

Added separate evaluators for Alpayu rule 11 (malefics in houses 1, 2 and 8, with benefics outside Kendras) and rule 14 (strong malefics in Kendras without benefic aspects). Rule 14 is explicitly an evidence-gated rule at this stage: if the upstream chart pipeline cannot supply the strength/aspect determination, the result remains `UNKNOWN`; the evaluator does not infer classical strength from house placement alone.

| Printed category | Source rules | Evaluators currently present | Gap |
|---|---:|---:|---:|
| Balarishta | 30 | 20 | 10 |
| Antidotes | 10 | 10 | 0 |
| Alpayu | 15 | 12 | 3 |
| Madhyayu | 15 | 5 | 10 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **53** | **23** |

This is evaluator coverage, not a claim that all inputs are calculated or certified. The next remaining Alpayu gaps are source rules 9, 10 and 13; Madhyayu rules 5–14 and Balarishta rules 4, 10–12, 15–17, 25–26 and 28 remain unimplemented.

## 2026-10-19 — Latest runtime fix, source-artifact coverage and Madhyayu pass

This section supersedes earlier provisional status lines above where applicable. It records work verified on the current research branch; it does not certify or release an Ayurdaya result.

### Root cause and correction

- The integrated Chapter XIV + XXVI regression initially failed at runtime with `ReferenceError: beneficKendra is not defined` while evaluating Alpayu rule 11.
- The source fix adds `beneficInAnyKendra(map, evidence)`, deriving whether a benefic occupies houses 1, 4, 7 or 10 from available placements and planet-nature evidence. A partial chart or unknown nature remains indeterminate rather than being treated as “no benefic in a Kendra.”
- Three regression cases cover rule 11 with benefics outside Kendras (MATCHED), Jupiter in a Kendra (NOT_MATCHED), and incomplete placement data (UNKNOWN).
- The fix and regressions passed the complete B.V. Raman QA job on commit `51bc7d00303970178a220db23e9551260e639109` (run 39211723029).

### Source-image workflow gap closed

- The first workflow artifact rendered Chapter XIV pp. 63–72 and Chapter XXVI pp. 199–203, but did not render p. 190 despite the test suite referencing the HPA Standard Horoscope B.R./A.R. oracle on that page.
- The QA workflow now also renders PDF page 197 (printed p. 190), headed “Ashtakavarga Tables Before and After Reduction”, into the same source-evidence artifact. This makes the specific scanned table behind the 168-cell B.R./A.R. fixture available alongside the rule and formula pages.
- Workflow-only fix commit: `98541f48f89d6d590564baf9b4edf76d1332fe97`.
- PASS: B.V. Raman QA push and pull-request runs 39211846240 and 39211851381. The separate ASOP Chapter II Table I remains secondary-transcription-only; p. 190 from *Hindu Predictive Astrology* must not be substituted for it.

### Additional source-position evaluators

Four directly testable Madhyayu conditions from printed pp. 70–71 now have individual evaluators:
- `XIV-MAD-08`: Scorpio Lagna; Jupiter in Lagna; Mars and Rahu in house 8.
- `XIV-MAD-10`: Aries Lagna; Jupiter in house 8; malefic influence in a Kendra.
- `XIV-MAD-12`: Mars and Mercury in Kendras, Venus in Lagna, and exalted planets in houses 3 and 11. The rule requires evidence of an exalted planet in each specified house; incomplete charts stay UNKNOWN.
- `XIV-MAD-14`: Mars in house 5, Sun in house 7, Saturn in its Aries debilitation sign.

Regression includes positive cases and negative cases where the exaltation/debilitation requirement is not satisfied. These are rule-match tests only; they do not select a lifespan category or a number of years.

### Current Chapter XIV coverage and verification

| Source category | Source rules | Evaluators present | Still unimplemented |
|---|---:|---:|---:|
| Balarishta | 30 | 20 | 10 |
| Antidotes | 10 | 10 | 0 |
| Alpayu | 15 | 12 | 3 |
| Madhyayu | 15 | 9 | 6 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **57** | **19** |

The 19 unevaluated rules remain explicitly indexed as `UNKNOWN`: Balarishta 4, 10–12, 15–17, 25–26, 28; Alpayu 9, 10, 13; Madhyayu 5–7, 9, 11, 13. Their wording depends on sunrise/sunset, Navamsa, Dasa, source-sensitive affliction/strength, cancellation or multi-placement evidence that must be modelled and tested separately.

- PASS — B.V. Raman regression, syntax checks, integrated Chapter XIV + XXVI regression, BPHS Shodhana regression and P.V.R. Narasimha Rao Shodhana regression on `45ca1525b1a3c0194c08a7d46fa8e2a6b71d81e0`, run 39212458326.
- A separate Horoscope/Marriage Matching source-syntax workflow was still in progress at the last status check; do not count it as a PASS until its run completes.
- **Merge gate:** PR #55 remains open and unmerged. Keep `certified:false`; no customer-facing longevity, death-age or death-date output. A green CI establishes software regression parity only for the pinned cases, not complete classical certification.

## 2026-10-19 — Latest verified Chapter XIV coverage: 74 of 76 rules

This section supersedes all earlier provisional coverage counts and run-state notes above. Verified branch head before this documentation commit: `e65f3751cc6d42fe9f940857e4018d372efa049c`.

### New evaluators and regression evidence

The latest evaluator pass added source-numbered, individually tested conditions:
- **Balarishta 4:** the near-sunrise/sunset, Moon's hora and malefic-Navamsa facts are explicit required inputs; absence remains UNKNOWN.
- **Balarishta 10:** the birth-Dasa lord's conjunction with many malefics is accepted only as an explicit source-sensitive evidence input.
- **Balarishta 28:** weakness and “badly placed” facts for the Lagna lord / Moon-sign lord are separately required; they are not inferred from house placement alone.
- **Madhyayu 5:** Sun in Lagna plus explicit enemy-sign/enclosure evidence, weak-Sun evidence and no benefic aspect.
- **Madhyayu 6:** Lagna lord in 6th/8th with malefic conjunction and without benefic aspect.
- **Madhyayu 13:** explicit evidence that benefics occupy Kendras, plus computed no-benefic-aspect to Lagna and malefic aspect to the Lagna lord.
- **Alpayu 9:** Saturn in Lagna, a malefic-owned Lagna sign, and explicit evidence for benefics in houses 3/6/9/12.
- **Madhyayu 7 and 11:** direct placements are checked, but “other planets in 11th” and Jupiter/Venus/Mercury being in unfavourable houses remain explicit source-sensitive inputs rather than guessed classifications.

Positive, negative and/or missing-evidence regression cases were added for these conditions. A present evaluator means code coverage only; it does not prove the upstream strength, sunrise, Dasa, Navamsa or favourable/unfavourable-house evidence has itself been independently certified.

### Current source-rule coverage

| Chapter XIV category | Source rules | Evaluators present | Not implemented |
|---|---:|---:|---:|
| Balarishta | 30 | 29 | 1 |
| Antidotes | 10 | 10 | 0 |
| Alpayu | 15 | 14 | 1 |
| Madhyayu | 15 | 15 | 0 |
| Purnayu | 6 | 6 | 0 |
| **Total** | **76** | **74** | **2** |

The remaining two rules stay indexed as `UNKNOWN` rather than being “completed” by guesswork:

- **XIV-BAL-12:** the printed wording linking the Ascendant lord / 5th and 9th lords, enemy signs, and 8th/9th houses does not unambiguously map each lord to each condition. A source-faithful evaluator needs a verified interpretation before it can return MATCHED or NOT_MATCHED.
- **XIV-ALP-13:** the printed wording relating the Ascendant and 8th lords “in quadrants”, a planet in the 8th, and no planets in Kendras does not make the reference point for “quadrants” explicit. Do not assume it means relative quadrants or Kendras from Lagna.

### CI verified on the same source/test head

- **PASS — B.V. Raman Ayurdaya research QA:** [run 39214211547](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39214211547).
- **PASS — Horoscope / Marriage Matching source and calculation QA:** [run 39214211542](https://github.com/smvastrorajaram-hub/smvastroservices/actions/runs/39214211542).
- Source artifact now renders printed HPA p. 190 (PDF p. 197) as well as Chapter XIV pp. 63–72 and Chapter XXVI pp. 199–203. HPA p. 190 remains a separate oracle from the *Ashtakavarga System of Prediction* Chapter II, Table I.
- **Still pending — ASOP primary source:** the original *Ashtakavarga System of Prediction* Table I page image is not present in the inspected repository source PDF or verified uploaded library. Its secondary-transcription oracle remains separate and cannot be upgraded to primary-page evidence by substituting HPA p. 190.
- **Still pending — numerical certification:** HPA Chapter XXVI's printed total/conversion discrepancy remains recorded: the printed `48.98` converted by `334/365` gives about `44.82`, while formula-first Pinda arithmetic gives `49.00` lunar years and `44.84` solar years. Neither output is patched to imitate the other.

**Release / merge gate remains closed:** PR #55 is research-only, `certified:false`, and unmerged. No final lifespan, age-of-death or death-date value may be emitted to customer-facing Horoscope or Marriage Matching output until the remaining source ambiguities and numerical-source gaps are closed.
