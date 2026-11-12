# Horoscope & Marriage Matching Narrative Quality Audit — 12 November 2026

## Purpose and scope

This is a separate narrative-quality implementation PR, independent of website CSS/performance work. It addresses repeated prose in SMV HOROSCOPE and Marriage Matching while preserving the existing astronomical calculation path.

## Root causes verified in source

1. **Integrated Horoscope renderer:** `public/horoscope/integrated.js` created a sentence de-duplication set, but reset it for each house and again before the chronology, Pratyantara and annual chapters. Identical substantial sentences could therefore reappear across different sections of the same report.
2. **12-house D1 narrative:** `public/horoscope/d1-human-narrative.js` created a fresh `seen` set for each house and only removed duplicate paragraphs. A repeated sentence could survive when embedded in otherwise different paragraphs across houses.
3. **Marriage Matching annual transit narrative:** `public/horoscope/matching-timeline.mjs` rendered all four slow-planet transit descriptions again for every annual midpoint, even when the relevant planet sign, ascendant house, Moon-relative house and age-specific life area had not changed. It also printed a repeated “No changes” line in years without a calculated sign ingress, despite the report introduction already saying repeated midpoint descriptions are condensed.
4. **Marriage Matching topic evidence:** `mm335PersonEvidence` added the same generic lordship, dignity, retrograde, combustion or aspect explanation in multiple life-area chapters for the same person.

## Changes in this PR

- One report-wide sentence set is now shared across the integrated Horoscope overview, all twelve houses, Dasha chronology, Pratyantara and annual chapters.
- Repeated substantial sentences are identified using Unicode normalization, case folding and punctuation/whitespace normalization. Short labels and dates are not treated as narrative duplicates.
- Statements containing uncertainty, medical, fertility, lifespan, death or guarantee-related cautions are intentionally exempt from de-duplication so relevant safety context is not removed.
- The D1-only 12-house renderer shares one sentence set across the compiled report. It splits longer paragraphs into sentences before checking duplicates.
- Marriage Matching tracks each person's annual transit signature by planet and suppresses only consecutive years with the same calculated midpoint state. A changed planet/sign/house/age-context signature is shown again. The actual transit calculations, annual midpoint dates and ingress dates are not changed.
- Technical “calculated sign changes” details are shown only in years with recorded ingress events; empty years no longer print the same “No changes” paragraph.
- Matching's general chart-factor sentences are de-duplicated per person across the twelve topic chapters. Topic-specific house-lord evidence, bridge text, practical scenarios and Dasha windows remain.
- The source changes use no AI/LLM dependency, remote call, new data store or new user data.

## Calculation and production safety

No planetary longitude, ayanamsa, divisional chart, Dasha period, transit position, house lord, Porutham, Shadbala, compatibility score or verdict calculation is changed. Changes are limited to report prose assembly and repeated explanatory text.

No Firebase, identity, Wallet, Recharge, Razorpay, Commission, payout, Live/Booking session, Calendar calculation or backend routes are changed. No localStorage/sessionStorage/IndexedDB data is cleared. No origin-wide Cache Storage is cleared.

For the user's synchronized-cache policy, this PR updates the Pages.dev and .in cache-release markers together in all three Service Workers: SMV ASTRO, SMV HOROSCOPE and SMV CALENDAR. The Calendar worker receives only the cache-release marker update.

## Regression and audit coverage

- A synthetic integrated-report test verifies that the same substantial sentence appears once across Overview, houses, Dasha, Pratyantara and annual chapters.
- The same test verifies that uncertainty/safety caveats remain in separate relevant conclusions.
- The existing 150-chart D1 narrative audit now checks for repeated substantial sentences across all twelve topics in both Tamil and English, for each deterministic test fixture.
- Marriage Matching source regressions verify transit-state continuity compression and one-per-person common evidence handling.
- The dedicated workflow checks syntax and runs the new narrative tests plus the existing Marriage Matching feature-mode regression.
- The existing full 150-Horoscope / 150-Matching audit remains a separate broad calculation/code-path check.

## Important limitation

Automated duplicate removal improves report repetition; it cannot certify that every interpretation is astrologically correct, fully natural Tamil prose, or reviewed by a practicing astrologer. The 150-chart inputs are deterministic test fixtures, not a representative population of verified real birth records. Human expert review of the final Tamil and English sample reports remains necessary before claiming prediction-quality certification.
