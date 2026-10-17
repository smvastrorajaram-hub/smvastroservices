# SMV ASTRO — C.G. Rajan Shadbala Graha Yuddha project rule

**Status:** implemented on the open draft PR branch only; not merged to `main`.

## Rule

- No resolved Graha Yuddha: **0 Virupa**.
- Resolved winner: **+10 Virupa**.
- Resolved loser: **−10 Virupa**.
- If a possible war cannot be resolved from the required inputs, return **null** for that planet's Yuddha component and block a complete Shadbala total. Do not mislabel missing evidence as "no war."

## Source split

The C.G. Rajan Shadbala path reuses the Uttara Kalamrita Chapter II war eligibility and decision procedure:
- only Mars, Mercury, Jupiter, Venus and Saturn can participate;
- the planets must share the same bhava and the same degree-and-minute longitude bin;
- the planet with the more northerly geocentric ecliptic latitude wins;
- missing latitude, equal latitude or ambiguous overlapping encounters are unresolved.

The Uttara Kalamrita module continues to expose its own one-Rupa comparison as **+60/−60 Virupa** and keeps its separate disc-diameter quotient discussion visible. The C.G. Rajan integration maps the *resolved winner/loser result* to the user's fixed **+10/−10/0** project policy. Therefore, the fixed values are a project-specific policy, **not** a claim that Uttara Kalamrita's native numeric formula is fixed at ±10.

## Integration safeguards

- Yuddha is kept separate from the six existing component calculations and is added exactly once to a complete total.
- If any required Cheshta, Drig or Yuddha input is unresolved, the final total remains null.
- C.G. Rajan printed p.50 remains unchanged: its worked example has no established Graha Yuddha, so Mars remains **620** and the Yuddha row stays zero.
- The policy does not certify the full seven-graha Shadbala chain and does not change legacy `strength3`, customer Horoscope/Matching output, or `main`.

## Tests

The source QA covers no-war zero, fixed +10/−10, northern-latitude winner selection, same-bhava/same-degree-minute eligibility, rejection of different-minute or different-bhava pairs, exclusion of Sun and Moon, unresolved missing latitude, balanced pair adjustment, and exactly-once inclusion in a complete total. Five-natal integration asserts the policy is attached while full certification remains withheld.
