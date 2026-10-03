# SMV ASTRO V1 — Horoscope + Marriage Matching End-to-End Audit
Date: 2026-10-02
Source baseline: `SMV ASTRO OCT 2 , 2026 ; 1507.zip` only.

## Scope
Login/Logout → Admin OFF / ON ₹0 / ON ₹1+ → Basic Horoscope → Advanced payment success/fail/cancel → calculation → Advanced redirect → save → Saved Horoscope list → View/Download/Print/Delete busy queue → refresh/re-login/cloud restore → Nakshatra Matching → paid Full Marriage Matching → automatic result → save/list → logout isolation. English + Tamil payment messages are included.

## Root defects found and corrected
1. **Marriage calculation could fail but payment callback still behave as completed.** `runFull()` caught its own error and resolved. It now renders the error and rethrows it. The paid callback also verifies that a non-empty Full Matching result exists before it can complete.
2. **Saved reports login restore was asynchronous after the visible list refresh.** Login could first show only device-local records while cloud restore was still running. Auth refresh now awaits the one login cloud synchronization before it completes and rerenders the list.
3. **Cloud saved-report entitlement was trusting the client snapshot.** `paid-full` is now accepted only when the exact feature + birth identity has a verified paid record. `free-full` is accepted only when that feature is enabled and current price is ₹0. `basic` remains basic.
4. **Payment-failure fallback was English-only.** Fallback is now English/Tamil. Razorpay's own specific failure description is retained when supplied.
5. **Stale browser assets could preserve an older flow.** Service-worker cache and the three changed script query versions were bumped together.

## Contract audit
| Contract | Result |
|---|---|
| Firebase horoscope auth uses local persistence | PASS |
| Payment click rechecks authenticated customer | PASS |
| Logout clears paid/access context and visible result roots | PASS |
| Admin OFF hides Advanced content and Marriage section | PASS |
| Admin ON + ₹0 unlocks enabled feature without payment | PASS |
| Admin ON + ₹1+ shows locked paid access | PASS |
| Missing Horoscope birth details blocks payment | PASS |
| Marriage paid flow validates/sets the birth context before purchase | PASS |
| Razorpay runs in the temporary payment window | PASS |
| Payment success → bilingual success → calculating message | PASS |
| Payment failure → no unlock/calculation + retry available | PASS |
| Payment cancel → closes temporary window + restores button | PASS |
| Advanced payment callback waits for calculation before ready/scroll | PASS |
| Marriage payment callback waits for successful Full Matching result | PASS |
| Marriage calculation error cannot be reported as “Report ready” | PASS |
| Basic saved report remains `basic` | PASS |
| ₹0 full saved report remains `free-full` | PASS |
| Verified paid full saved report remains `paid-full` | PASS |
| Cloud cannot promote a forged `paid-full` snapshot | PASS |
| Login restore waits for cloud saved-report sync | PASS |
| Logout hides/clears both Saved Horoscope and Saved Matching lists | PASS |
| PDF action while calculation/save busy queues only the first action | PASS |
| Other PDF buttons during busy state show Wait/Generating message | PASS |
| Changed JS/MJS + server syntax | PASS (16/16 files checked) |
| Deterministic source-contract checks | PASS (16/16) |

## Runtime verification boundary
The audit executed local deterministic source/runtime contract checks and Node syntax checks. It did **not** perform a real Razorpay charge or connect to production Firebase/Render credentials from the audit container. Those external services require deployed production credentials and an interactive checkout. The source now fails visibly instead of falsely reporting success if Full Marriage Matching calculation does not complete.

## Deployment requirement
Deploy both frontend changed files **and `server.js`**. If `server.js` is not deployed, the saved-report entitlement verification correction is not active. The service-worker cache version is bumped, but after deployment an already-open old tab should be closed/reopened once so the new worker/assets take control.
