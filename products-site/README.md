# SMV ASTRO PRODUCTS storefront

A standalone, static storefront landing page isolated in `products-site/`. It is deliberately kept separate from the main SMV ASTRO application and does not modify its server, Horoscope/Calendar PWAs, assets, workflows, or root deployment configuration.

## Current behavior
- Product/collection links open the existing Shoopy store: https://smv-astro-services.store.shoopy.in/
- The category cards are placeholders, not a live Shoopy product feed.
- No DNS records or Cloudflare settings are changed by these files.

## Cloudflare Pages deployment
Create a **separate Pages project** connected to this same repository and configure:
- Root directory: `products-site`
- Build command: leave blank for this plain static HTML/CSS site
- Build output directory: `.` (the root of `products-site`)

After the `pages.dev` preview has been checked, add `products.smvastroservices.in) as a custom domain in that separate Pages project and follow Cloudflare's DNS instructions. Do not change the apex `@` record or the existing `horoscope` / `calendar` records.

## Before public launch
1. Replace generic categories with the actual product categories.
2. Add real product images and links to specific Shoopy products when available.
3. Confirm brand assets and check phone-sized layout.
4. Verify Shoopy checkout, order confirmation, shipping, and payment settings.
