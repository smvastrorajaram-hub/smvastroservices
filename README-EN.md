# SMV temporary Android test wrappers

This project contains three Android Trusted Web Activity wrappers for zero-cost local testing:
SMV ASTRO, SMV HOROSCOPE and SMV CALENDAR.

They use `.test` application IDs so later Google Play signing cannot conflict with these debug builds.
The live SMV website remains the application logic; this project does not fork the website source.

For a verified production TWA, use final production package IDs, Play App Signing and publish
`/.well-known/assetlinks.json` with the Play signing certificate SHA-256 fingerprint.
