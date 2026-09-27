# SMV local Swiss Ephemeris adapter contract

The adapter exports `createSMVSwissEph()` and returns an object with:

- `utcToJd(y,m,d,h,min,sec)` -> `{ut, et}`
- `setSiderealLahiri()`
- `siderealSpeedFlags()` -> calculation flags using sidereal Lahiri + speed
- `calc(jdEt, bodyId, flags)` -> `{longitude, speed}`
- `ayanamsa(jdUt)` -> numeric Lahiri ayanamsa
- `houses(jdUt, lat, lon, system)` -> `{cusps:[12], ascendant, mc}`
- `version` and `ephemerisMode`

Constants used by SMV: Sun=0, Moon=1, Mercury=2, Venus=3, Mars=4,
Jupiter=5, Saturn=6, Mean Node=10. House system `S` is Sripati.

No method may fetch from a CDN. Required WASM and `.se1` data must be local and
pre-cached by the service worker.
