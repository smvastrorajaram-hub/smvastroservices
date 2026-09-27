SMV ASTRO Phase 3 — Swiss Ephemeris local WASM vendor slot

This directory intentionally contains NO third-party Swiss Ephemeris binary yet.
Reason: Swiss Ephemeris is dual licensed. The selected browser/WASM build must be
used under terms compatible with the SMV ASTRO deployment (AGPL or a commercial
Swiss Ephemeris licence).

Required production assets after licence choice:
- local JS wrapper (same origin)
- local .wasm binary (same origin)
- Swiss ephemeris data covering the supported birth-date range (for example
  sepl_18.se1 + semo_18.se1 for 1800–2400, plus any files the chosen build needs)

Do not replace these with Moshier if exact parity with a server SWIEPH result is
required. Phase 3 parity must pass before offline-new-chart is enabled.
