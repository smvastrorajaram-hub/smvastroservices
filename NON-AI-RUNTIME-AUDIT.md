# SMV ASTRO — Non-AI Runtime Audit

Date: 5 October 2026

## Result

PASS after removal of obsolete disabled AI UI residue.

## Verified

- No OpenAI, Anthropic, Gemini or other generative-AI SDK appears in the production dependency list.
- No active astrology calculation/prediction fetch/API path to a generative-AI provider was found.
- Horoscope, Marriage Matching, Panchang, Transit and SMV CALENDAR are implemented through programmed calculation/rule code and local/browser ephemeris resources.
- Automated prediction text is rule/evidence based.
- Personal consultation answers are provided through the astrologer workflow, not by the automated prediction engine.
- Obsolete disabled `AI Future Insights` translation/binding/function/export code was removed from `public/horoscope/horoscope.js`.
- Public README, FAQ, Terms, Privacy Policy, Sitemap and Horoscope disclosure now consistently say that astrology results are not AI-generated and not AI-calculated.

## Audit limitation

This verifies production/runtime behavior visible in the audited source. Source code cannot prove which development tools were historically used to edit files. Therefore the public wording accurately addresses service calculation/prediction behavior rather than making an unverifiable historical authorship claim.
