# SMV ASTRO PRODUCTS — GitHub Pages deployment

The standalone store landing page is published as a subpath of the existing custom-domain site, not as a second domain:
- Page: https://smvastroservices.in/products/
- Source: `public/products/index.html` and `public/products/styles.css`
- The main site custom domain remains `smvastroservices.in` in the repository's existing `CNAME` file.

## Auto-deploy
The existing `.github/workflows/static.yml` workflow publishes the `public/` directory to GitHub Pages whenever files under `public/**` are pushed to `main`. Changes under `public/products/**` therefore trigger the existing workflow. No second Pages site, domain change, CNAME edit, or new DNS record is required for this `/products/` route.

## Current storefront behavior
- Product/collection buttons open the existing Shoopy storefront: https://smv-astro-services.store.shoopy.in/
- The category cards are placeholders, not a live Shoopy product feed, and do not show current prices or stock.
- The main homepage, Horoscope and Calendar runtime files are not changed by this product-page change.

## Before final merchandising
1. Replace the placeholder categories with actual product categories.
2. Add product photos and specific Shoopy product links.
3. Verify mobile layout and test each link after GitHub Pages deployment.
4. Keep order management, checkout and payment processing in Shoopy.
