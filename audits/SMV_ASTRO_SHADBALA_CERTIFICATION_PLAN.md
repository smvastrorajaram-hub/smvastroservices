# SMV ASTRO — Shadbala and Ishta/Kashta certification plan

**Status: research branch only; no live customer calculation is replaced by this document.**

## Current decision

1. Keep the sixfold Shadbala formula source-specific. The candidate primary rule set is BPHS Chapter 27 (one named edition/translation; no mixture of BPHS and Uttara Kalamrita intermediate rules). Use the complete worked Standard Horoscope in B.V. Raman, *Graha and Bhava Balas* as a second numeric regression oracle, not as permission to mix rules silently.
2. Keep C.G. Rajan and Uttara Kalamrita as separately named validation channels until each book's discrepancies are reconciled. Their rows must not be averaged or combined to manufacture a total.
3. Implement the B.V. Raman square-root Ishta/Kashta method in its own named module. Do not label this square-root method as the distinct BPHS Chapter 28 Rasmi procedure.
4. Do not surface a Shadbala total, Rupa ratio/strong-weak verdict, or Ishta/Kashta chart result as certified until every required component and its source inputs pass the gates below.

## Exact defects in the current calculation path

The main `swiss_vedic.js` path still has these blockers:

- Five-planet Cheshta is selected by speed buckets (`motionClassical`) instead of the same-frame classical mean/true/Sighrocca calculation. This is a heuristic, not a certified classical Chesta formula.
- Kala inputs can fall back to an approximate local solar hour / sunrise path. Required hora, tribhaga, weekday/month/year lord, and Ayana inputs must be explicit and source-checked.
- `digBalaClassical` returns a numeric zero when the directional cusp is missing. A missing cusp is unknown, not zero; it must block certification.
- Drig uses a candidate aspect matrix and benefic classification that still needs to reproduce a complete printed numerical example, all seven receiving-planet totals, and independently computed live charts.
- `phase3Strength` currently sums those provisional values into `totalVirupa` even while returning `classicalCertified:false`. The report no longer displays an incomplete subtotal, but that alone does not make the internal total certified.

## Method definition for the separate Ishta/Kashta module

B.V. Raman, *Graha and Bhava Balas*, Chapter X, printed pp. 102–104, paras 136–139:

- `Ishta = sqrt(Uchcha Bala × Chesta-for-Phala)`
- `Kashta = sqrt((60 − Uchcha Bala) × (60 − Chesta-for-Phala))`

Inputs are on the 0–60 Virupa/Shashtiamsa scale. This module must not accept Total Shadbala or confuse the special Chesta value used for Ishta/Kashta with the Chesta contribution to the sixfold Shadbala sum.

The source separately provides special Chesta-for-Phala inputs:
- Sun: reduce (Sayana Sun longitude + 90°) to the shorter 0–180° arc, then divide by 3.
- Moon: reduce (Moon Nirayana longitude − Sun Nirayana longitude) to the shorter 0–180° arc, then divide by 3.
- Mars/Mercury/Jupiter/Venus/Saturn: reduce Sighrocca minus the circular midpoint of same-frame mean and true longitudes, then divide by 3.

These formulas calculate an intermediate, not the validity of its astronomical inputs.

## Known source conflicts that must stay visible

- B.V. Raman's Standard Horoscope transcription has discrepancies between rounded input values, the Ishta example (printed p. 103), and the Kashta example (printed p. 104). For example, the extracted rows conflict on Mars Chesta (22.03 / 22.23) and Mercury's Chesta (2.30 / 1.30); the Sun's printed 22.66 also does not equal exact 67°50′ ÷ 3 (22.6111). The source scan must be reviewed before using all seven printed outputs as a golden oracle. Do not adjust formulas just to force a match.
- C.G. Rajan Part I printed p. 50: Mars D12 Saptavargaja is computed as 38 versus printed 50; Venus/Saturn Dig differ by one point; the candidate Drig angle generation does not reproduce the full printed matrix; classical Cheshta inputs remain unresolved; the printed Mars Yuddha +10 conflicts with final 620.
- Uttara Kalamrita: historic five-graha mean/true/Sighrocca records are not independently verified for the five natal comparison charts; its named section does not define a numerical Sun/Moon orbital Cheshta formula.

## Certification gates before production activation

1. Select and pin one primary formula edition and unit convention in code metadata.
2. Build an isolated oracle for each component, using a photographed/verified printed worked example and a second independent calculation (e.g. source-isolated PyJHora calculations) without treating a library's output as authority by itself.
3. Reproduce the complete Standard Horoscope from birth inputs to seven grahas × six components; compare every component and total before rounding. Explain every source discrepancy rather than fitting it away.
4. Independently verify the astronomy chain (Swiss Ephemeris true positions plus the chosen method's mean/Sighrocca source) and birth time-zone, sunrise, latitude/longitude, declinations and bhava cusps.
5. Repeat component-by-component for the five existing Perambalur regression births and new edge charts (near exaltation/debilitation, stationary/retrograde, 0° wrap, sunrise boundary, war/no-war).
6. Only then remove the certification gate from seven complete results and attach Ishta/Kashta after its Uchcha/Chesta-for-Phala inputs are independently validated.

**Pass is not “the code returns a number”. Pass means the selected source, each formula, each input, and the full output table reconcile to an independent numeric oracle.**
