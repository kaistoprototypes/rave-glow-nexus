# Shopify + Yoycol Integration Plan

## Architecture
```
Yoycol catalog ──(create only)──▶ Shopify  ◀──(edit images/desc/price)── Your Admin Panel
                                     │
                                     ▼
                              Storefront API (read)
                                     │
                                     ▼
                              Your Lovable Site (cart)
                                     │
                                     ▼  checkout
                              Shopify Checkout
                                     │
                                  paid order
                                     │
                              orders/create webhook
                                     ▼
                            /api/public/shopify-order
                                     │
                            Create Yoycol fulfillment order
```

Shopify is the single source of truth. Yoycol creates products; manual edits in your admin update Shopify directly via Admin API and are live instantly.

## What I'll build

### 1. Storefront (read products from Shopify)
- `src/lib/shopify.ts` — Storefront API client (token, domain, GraphQL helper), 2025-07.
- `src/stores/cartStore.ts` — Zustand cart with Shopify cart create/update/remove + checkoutUrl.
- `src/hooks/useCartSync.ts` — clears local cart after checkout completion.
- `src/components/CartDrawer.tsx` — cart UI with "Checkout with Shopify" (opens checkoutUrl in new tab, `channel=online_store`).
- `src/components/ShopifyProductGrid.tsx` + product detail route `src/routes/product/$handle.tsx`.
- Mount `useCartSync` in `__root.tsx`.

### 2. Admin edits → Shopify (server-side)
- `src/lib/shopify-admin.functions.ts` — `createServerFn` wrappers (admin-only via `has_role`) for:
  - `updateShopifyProduct({ productId, title?, description?, price?, images? })`
  - Uses Shopify Admin GraphQL via stored admin token (already configured by the integration).
- Hook into existing admin Products screen: edits call this fn → Shopify → live.

### 3. Yoycol → Shopify (create only)
- Update existing `src/routes/api/public/yoycol-sync.ts` to:
  - Create new Shopify products via `shopify--create_product` Admin API.
  - Store mapping in `yoycol_product_mappings`.
  - Skip update if a mapping already exists (preserves manual edits).

### 4. Shopify orders → Yoycol fulfillment
- New route `src/routes/api/public/shopify-order.ts` (HMAC-verified Shopify webhook).
- On `orders/paid`:
  - Look up Yoycol product IDs via `yoycol_product_mappings`.
  - Call Yoycol order-create API with shipping address + line items.
  - Persist into `yoycol_orders`.
- Add `SHOPIFY_WEBHOOK_SECRET` to project secrets.
- Webhook registration URL provided so you can paste into Shopify Admin → Notifications → Webhooks (`orders/paid` event).

## Technical notes
- Storefront token + shop domain fetched from Shopify integration tools and written into `src/lib/shopify.ts` as constants (storefront token is publishable).
- Admin operations go through `createServerFn` so the Admin token never reaches the browser.
- Yoycol mapping table already exists (`yoycol_product_mappings`); no schema change.
- One secret needed: `SHOPIFY_WEBHOOK_SECRET` (you copy it from the Shopify webhook config screen after I give you the URL).

## Out of scope (call out)
- Tax/shipping rules: handled by Shopify Checkout, nothing to wire.
- Inventory sync from Yoycol: print-on-demand has no stock, so we skip.
- Variant-level Yoycol mapping if products have many variants — flag if needed.
