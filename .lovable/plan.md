# Live Shopify storefront + on-site checkout

Goal: products pulled live from your Shopify store, customers buy on your domain with Stripe Elements (no redirect), and paid orders are pushed into Shopify so inventory decrements and your existing Yoycol fulfillment fires.

Current state I found while investigating:
- Local `products` table has **0 rows** → that's why your site shows nothing
- Shopify store has **1 product** (the one you just created)
- The existing checkout already uses Stripe **Hosted Checkout** (redirects to stripe.com). I'll convert it to **on-site Stripe Elements** so the customer never leaves your site.
- Stripe is BYOK today (`STRIPE_SECRET_KEY` already configured). No new secret needed.

## Decisions (locked in)
- Storefront source of truth: **Shopify** (live, via Storefront API)
- Checkout: **on-site** using Stripe Payment Element
- Shipping: **flat $5.99**, free over $80 (stored in `site_settings` so you can change it later)
- Guests + signed-in users both supported
- After successful Stripe payment, server pushes order into Shopify Admin API with `financial_status: paid` → Shopify decrements inventory → your `orders-create` webhook fires → Yoycol fulfillment runs (already wired)

## Build phases

### Phase 1 — Live Shopify storefront (the fix for "nothing showing")
1. New `src/lib/shopify-storefront.server.ts` — Storefront GraphQL client (uses existing `SHOPIFY_STOREFRONT_ACCESS_TOKEN`).
2. New `src/lib/shopify-products.functions.ts` — server fns: `listShopifyProducts`, `getShopifyProductByHandle`, `getShopifyHomeData`. Maps Shopify response → existing `ProductCardData` shape so the UI doesn't have to change much.
3. Rewrite `src/routes/index.tsx`, `src/routes/shop.tsx`, `src/routes/products.$slug.tsx` to call the new fns. Product slug becomes Shopify `handle`.
4. Add **inventory badges** to `ProductCard` ("Sold out" / "Only N left" / nothing if plenty). Disable Add-to-Cart when sold out.
5. Filters (gender, style, type) reused via Shopify product tags. I'll show you how to tag products in Shopify.

### Phase 2 — On-site checkout with Stripe Elements
6. Install `@stripe/stripe-js` + `@stripe/react-stripe-js`.
7. New `src/routes/checkout.tsx` — single page with: email, shipping address, Payment Element. No redirect.
8. New `src/lib/checkout.functions.ts` → add `createPaymentIntent` server fn (validates cart against Shopify live prices + inventory, creates Stripe PaymentIntent, returns client_secret).
9. After payment confirms client-side, call new `finalizeOrder` server fn which:
   - Verifies PaymentIntent succeeded
   - Calls Shopify Admin API `POST /orders.json` with `financial_status: paid`, line items (with variant IDs), shipping address, customer email
   - Persists local copy in `orders` + `order_items`
   - Returns order confirmation
10. New `src/routes/api/public/stripe/webhook.ts` — `payment_intent.succeeded` as backup source of truth (handles browser-close-after-payment case).

### Phase 3 — Cleanup
11. Update cart store to use Shopify variant IDs (needed for Shopify order creation).
12. Remove now-unused `listProducts` / `getProductBySlug` / `getHomeData` from local-products path (keep table for admin overlays like featured/best-seller flags, but storefront no longer queries it).

## Files I'll create or change
**New (~7):**
- `src/lib/shopify-storefront.server.ts`
- `src/lib/shopify-products.functions.ts`
- `src/lib/shopify-admin.server.ts` (Admin API client for order push)
- `src/routes/checkout.tsx`
- `src/routes/api/public/stripe/webhook.ts`
- migration: `site_settings` seed for shipping config

**Modified (~8):**
- `src/routes/index.tsx`, `src/routes/shop.tsx`, `src/routes/products.$slug.tsx`
- `src/components/ProductCard.tsx` (inventory badges, variant ID)
- `src/lib/cart-store.ts` (carry variant ID)
- `src/routes/cart.tsx` (link to /checkout, not Hosted Checkout)
- `src/lib/checkout.functions.ts` (rewrite for Elements + Shopify push)

## Open questions before I start
1. **Filters.** Your current filters use `gender`, `product_type`, `design_style`. Shopify's standard taxonomy doesn't have these. I'll filter by **product tags** — you'd tag products in Shopify like `gender:men`, `style:cosmic-carnival`, `type:hoodie`. Cool with that approach, or drop filters entirely until you've added more products?
2. **Test order.** Should I include a Stripe test-mode card flow so you can place a real end-to-end test order (storefront → checkout → Shopify order created → Yoycol triggered) after Phase 2 ships?

This is a ~3-message build. Phase 1 first (gets your site populated). Then Phase 2 in a follow-up message. Approve and I'll start with Phase 1.
