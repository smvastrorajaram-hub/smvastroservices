# SMV ASTRO --- FINAL A--Z ROOT-CAUSE AUDIT REPORT

**Date:** 29 September 2026\
**Scope:** SMV ASTRO website/service, excluding Horoscope and Marriage
Matching calculation sections.\
**Baseline:** latest uploaded `SMV ASTRO.zip`, overlaid with the latest
changed source used in the final Offer single-load fix.

## Executive result

**SOURCE / STATIC AUDIT: PASS**

No new source-clean blocker was found in the audited non-horoscope
workflows. The recently corrected Offer loading path is consistent with
the quota-safe design: Admin initial Offer data is part of the Admin
data payload, while explicit Offer save verification can still perform a
deliberate `/admin/offers` read.

Live third-party delivery/payment behavior is marked **deployment
verification required**, not falsely reported as locally executed.

## Test evidence

  -----------------------------------------------------------------------
  Test                                Result
  ----------------------------------- -----------------------------------
  Main backend `server.js` syntax     PASS

  Main frontend `smvastro.mjs` syntax PASS

  `public-content.mjs` syntax         PASS

  Remaining public JS/MJS syntax      PASS

  Supporting backend JS syntax        PASS

  HTML duplicate ID scan              PASS --- 0 duplicate IDs

  Local HTML asset references         PASS --- 0 missing local assets

  Client → backend literal route      PASS after normalizing query-string
  contract                            variants

  MutationObserver network/Firebase   PASS
  trigger audit                       

  Admin Offer initial duplicate-load  PASS
  audit                               

  Dashboard hydration/reuse guard     PASS
  present                             

  Dashboard load de-duplication guard PASS
  present                             
  -----------------------------------------------------------------------

A local live server boot was not counted as a functional failure because
the audit container does not contain the repository's installed Node
dependencies (`express`, etc.). The source syntax itself passes; Render
installs dependencies from `package.json` during deployment.

## A. Home / Public surface

**PASS**

Home/public navigation remains separate from authenticated Dashboard
surfaces. Public sections are hidden when an internal Dashboard/Admin
view is opened. Home restoration logic restores the public surface
instead of mixing it under a Dashboard.

Public content, approved astrologer surfaces, FAQ/contact/navigation
hooks and offer-banner integration remain present. No MutationObserver
is used to repeatedly fetch Home data.

## B. Authentication / Registration

**PASS --- source flow**

Customer and Astrologer registration paths are distinct. Email/password
authentication, Google authentication, email verification and
registered-role resolution are present.

The previously corrected Dashboard/auth race protection remains in the
current main application. The audit did not modify login or
Dashboard-opening code.

**Deployment verification:** actual Google OAuth authorized-domain
settings and Firebase Auth responses depend on the deployed
Firebase/Google configuration.

## C. Dashboard opening / session / navigation

**PASS**

Customer and Astrologer Dashboard loads are deduplicated. A second
caller does not invalidate the first active load.

An already successfully hydrated Dashboard can be reused without another
full data load when returning from another internal flow, unless data is
dirty or an explicit action requests `force=true`.

Live dashboard invalidations are coalesced/serialized. SSE
reconnect/status handling does not itself equal a data refresh.

## D. Customer Dashboard

**PASS --- source flow**

The Customer Dashboard contains the non-horoscope
question/private-consultation state, notifications, answer state, refund
state and review actions.

Public and Private Consultation data are loaded through explicit
customer endpoints. Payment/result transitions retain their transaction
context.

A pending-refund reconciliation timer exists. It is conditional, not a
permanent global polling loop.

## E. Astrologer Dashboard

**PASS --- source flow**

Approved/pending/rejected role handling is present. Open Questions and
assigned work remain separated from Private Consultations.

Answer submission, answer editing/resubmission paths, private answer
submission, withdrawal/payout paths and profile/qualification controls
remain represented.

## F. Admin Dashboard

**PASS**

Admin data loading is deduplicated. The main `/admin-data` response
supplies the principal Admin datasets.

The Admin panel still performs three bounded settings-document reads for
commission/question/answer settings. These are explicit reads, not
MutationObserver activity.

Admin subsections represented in source include questions, answer
review, allocation/reallocation, refunds, private consultations,
commissions, withdrawals/payouts, astrologer management/qualification,
offers, content and notifications.

## G. Public Ask Question

**PASS --- source flow**

The service price is read and maintained through one settings listener.
Offer quoting is performed explicitly. Question/order context is
retained through payment verification and Dashboard transition.

Retry logic is tied to the existing question context rather than
silently creating an unrelated question.

## H. Private Consultation

**PASS --- source flow**

Astrologer selection, consultation question form, offer quote, Razorpay
order creation, verification and Dashboard handoff are present.

The Private Consultation offer quote explicitly uses
`service: private_consultation`, so an offer configured for both
services can be evaluated independently for Private Consultation.

## I. Public + Private answer approval rules

**PASS --- source contract**

Public and Private answer flows contain the required distinction:

-   Auto Allow ON → direct release path.
-   Auto Allow OFF → Admin-review path before customer release.

Admin approval endpoints and customer/astrologer notification paths are
present.

## J. Email / Resend event layer

**PASS --- source contract; live delivery verification required**

The backend contains event-based email delivery with idempotency keys.
Public/Private answer events and Admin/customer/astrologer notification
cases are represented.

Email sending is treated as a side effect; it is not intended to
invalidate the underlying successful payment/question/answer transaction
when delivery fails.

Live delivery still depends on the deployed Resend API key, verified
sender/domain and recipient address data.

## K. Reviews / ratings

**PASS --- source flow**

Customer review retrieval/submission endpoints and public astrologer
review retrieval are present. Firestore rules restrict creation to a
signed-in customer with a corresponding answered question and valid 1--5
rating.

## L. Offers / Promotion codes / Banners

**PASS after latest fix**

Automatic vs manual promo-code handling is separated in the backend
offer resolver.

Offers can target Public Question, Private Consultation or both.

Home/customer banner delivery is handled separately from payment quote
eligibility.

Admin initial Offer rendering now uses Offers already included in the
Admin data response, preventing the previous visible
`Loading offers...` + separate initial Offer request pattern.

Explicit save verification still performs a deliberate `/admin/offers`
read after a save. This is event-driven and is not an idle quota loop.

## M. Payment / Razorpay / Refund

**PASS --- source contract; live payment verification required**

Public and Private order/verification/retry paths are represented.
Refund Admin paths, refund synchronization and RRN/ARN/UTR-related state
are represented.

No test payment was generated by this audit, so production Razorpay
credentials/webhooks must be checked after deployment with a controlled
transaction.

## N. Withdrawals / commissions

**PASS --- source flow**

Astrologer withdrawal and payout-management paths are present. Private
Consultation commission settings and answer-view/credit workflow remain
represented.

## O. Notifications

**PASS --- source flow**

Customer, Astrologer and Admin notification paths are present. Admin
notifications are sorted for display and deduplicated for the rendered
notification list.

## P. Firebase quota / repeated-read audit

**PASS with watch items**

No active MutationObserver performs Firestore/API/payment work.

The important remaining bounded read mechanisms are:

-   one Public Question price `onSnapshot` listener per page session;
-   conditional pending-refund reconciliation;
-   explicit Dashboard data refresh after genuine data-changing actions;
-   Admin initial `/admin-data` plus bounded settings reads.

These are materially different from an uncontrolled observer/retry loop.

**Do not add:** MutationObserver → API calls, automatic full-dashboard
refresh on SSE ready/error/reconnect, repeated offer collection polling,
or payment retry chains beyond the intended checkout timeout/retry
behavior.

## Q. Firestore rules

**PASS for the audited role separation at source level**

Rules distinguish Admin, Customer and Astrologer access for users,
astrologers, questions, payments, reviews, withdrawals and
notifications.

The Horoscope-specific rules were not evaluated as part of this
requested audit.

## R. Static integrity

**PASS**

All audited JavaScript parses successfully. The main HTML has no
duplicate IDs in the static document, and its local `src`/`href` assets
resolve within the reconstructed source tree.

## Final conclusion

For the requested **non-Horoscope** scope, the current source is
suitable for deployment from a static/source-integrity perspective.

**Final status: PASS --- no new root-cause code blocker found.**

The following must be treated as post-deployment acceptance checks
rather than source-test claims:

1.  Firebase Email + Google login with real authorized domains.
2.  Customer, Astrologer and Admin Dashboard open/reopen on Chrome/PWA.
3.  One Public Question payment and one Private Consultation payment.
4.  Auto Allow ON answer email delivery.
5.  Auto Allow OFF → Admin approval → customer email delivery.
6.  Resend delivery to customer/admin/astrologer addresses.
7.  Offer configured for BOTH → discount appears in Ask Question and
    Private Consultation.
8.  Home + Customer banner visibility.
9.  Refund/RRN synchronization against a real Razorpay transaction.

No Horoscope calculation, Horoscope payment, saved Horoscope, PDF
Horoscope, Marriage Matching engine or related Horoscope runtime result
is certified by this report because that section was explicitly
excluded.
