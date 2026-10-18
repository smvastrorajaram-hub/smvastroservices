# SMV ASTRO — B.V. Raman Shadbala Source-Verification Certificate

**Certificate ID:** SMV-BVR-SHADBALA-LIMITED-2026-10-19  
**Date:** 19 October 2026  
**Method under review:** B.V. Raman, *Graha and Bhava Balas*, 13th edition  
**Status:** **LIMITED-SCOPE PASS for specified printed-example arithmetic and source-specific software invariants; FULL NATAL CLASSICAL CERTIFICATION WITHHELD**  
**Independence rule:** This certificate uses the B.V. Raman source-specific test fixtures and rules. It does **not** use a BPHS certificate as evidence for Raman.

## 1. What this certificate does certify

This certificate records only the software checks that can be tied to the B.V. Raman source and its transcribed standard-horoscope fixture. It is not an institutional, astronomical-observatory, or publisher-issued certificate.

The repository test fixture is tests/bv-raman-strength6-regression.mjs. Its source-level checks cover:

- Seven-graha result shape and the six distinct Bala components.
- Printed standard-horoscope component values for Sthana, Dig, Kala, Drik/Drishti Pinda and Naisargika Bala, using explicit tolerances where the printed values are rounded.
- Chapter VI Cheshta worked-example values for Mars, Mercury, Jupiter, Venus and Saturn, using the fixture's explicitly transcribed mean, true and Sheeghrocca longitudes.
- Separate Chapter X Ishta/Kashta Phala formula checks, including the square-root formulas and source-specific treatment of Sun/Moon.
- Node/server and browser calculation parity for the tested fixture.
- Five Perambalur chart integrations (five dates × seven grahas), presence of the six component outputs, protection against reintroducing the old BPHS strength3 result path, and preservation of provisional status.
- Consistency checks preventing Chapter X Phala inputs from silently replacing the Chapter VI sixfold Cheshta value.

## 2. Source-example values used by the regression

Graha order in the source fixture: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn.

| Component | Values asserted by the fixture (Virupas) |
|---|---|
| Sthana Bala | 198; 126.50; 172.06; 279.50; 157.58; 178.20; 177.30 |
| Dig Bala | 48.10; 31.56; 55.70; 21.09; 11.50; 15.15; 58.02 |
| Kala Bala | 102.98; 202.04; 30.06; 192.79; 211.18; 115.53; 116.97 |
| Drik Bala | 15.86; −21.73; 0.95; 15.64; −16.04; 18.47; 7.21 |
| Cheshta Bala, five eligible visible planets | Mars 22.23; Mercury 2.30; Jupiter 35.26; Venus 5.95; Saturn 21.14 |

The regression explicitly tolerates source-table rounding. It also preserves the documented small discrepancy between the printed Mercury Dig Bala value and the value implied by the printed angular arc; it must not be hidden by altering the formula.

## 3. Important source-specific rule

In the current B.V. Raman implementation, Sun and Moon have zero **sixfold Chapter VI motional Cheshta Bala**. Their Chapter X Chesta-for-Phala used for Ishta/Kashta is a separate calculation and may be non-zero. The two quantities must not be conflated. For Mars–Saturn, the Chapter X result reuses the same Chapter VI Cheshta source inputs/value rather than reconstructing a second, inconsistent true longitude.

## 4. What is not certified

This limited certificate does **not** certify:

1. Historical, classical mean and true planetary longitudes, Mandocca/Bīja evolution or Sheeghrocca for arbitrary birth dates.
2. Full astronomical accuracy of the six components for every real natal chart or every supported date.
3. Every final total/ranking as a source-certified classical result.
4. Predictive accuracy of Horoscope or Marriage Matching interpretations.
5. The current runtime status of GitHub Actions. The regression file contains assertions, but a current green CI run must be checked separately before release approval.

The unresolved five-planet classical mean/true/Sheeghrocca chain means classicalCertified:false and provisional:true must remain in production output. A numerical total that happens to be computable is not, by itself, proof that its historical astronomical inputs are certified.

## 5. Evidence and release decision

- **Source-example/component arithmetic:** LIMITED-SCOPE PASS as defined above.
- **Browser/Node parity in the specified fixture:** covered by the regression; current CI run must be confirmed separately.
- **Full arbitrary-date classical natal Shadbala:** **NOT CERTIFIED**.
- **Production flag:** keep classicalCertified:false; do not change it by documentation-only approval.

This certificate is intentionally limited to B.V. Raman-specific source evidence. It must not be reused as a BPHS or C.G. Rajan certificate.
