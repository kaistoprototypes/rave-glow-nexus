## Admin product editor (site → Shopify)

Build an admin-only product editor inside your site. Edits are saved by calling the Shopify Admin API, so changes go straight to your live Shopify store (and flow back through the existing `products/update` webhook).

### Scope
- **Basics**: title, description (rich text), product type, tags, status (active/draft)
- **Pricing**: price + compare-at price per variant
- **Images**: upload new, reorder, delete

Out of scope for now: inventory quantities, creating/deleting variants, creating new products (you said "basic, pricing and images" — keeping it tight).

### Access control
- Gated by the existing `has_role(auth.uid(), 'admin')` check
- Server functions re-check the role on every call (never trust the client)

### Where it lives
1. **Admin tab** at `/admin` → new "Products" panel
   - Searchable list of Shopify products
   - Click a row → full edit drawer (basics + pricing + images in tabs)
2. **Inline on `/products/$slug`**
   - Floating "Edit" button visible only to admins
   - Opens the same edit drawer over the product page

### How sync works
```text
Admin edits in UI
   │
   ▼
createServerFn (admin-only, requireSupabaseAuth + has_role check)
   │
   ▼
Shopify Admin API (REST 2025-07)
   - PUT /products/{id}.json           (basics)
   - PUT /variants/{id}.json           (pricing per variant)
   - POST/DELETE /products/{id}/images (image add/remove/reorder)
   │
   ▼
Shopify accepts → fires products/update webhook
   │
   ▼
Existing webhook handler refreshes shopify_products cache
   │
   ▼
Storefront re-fetches via Storefront API → user sees new data
```

After each save, the UI also calls `router.invalidate()` so the live preview updates immediately without waiting on the webhook round-trip.

### Image uploads
- Use Supabase Storage `product-images` bucket (already exists, public)
- Upload from browser → get public URL → send URL to Shopify Admin API `POST /products/{id}/images.json` with `src`
- Shopify stores its own copy, returns its CDN URL, which the storefront then serves

### Files to create
- `src/lib/shopify-admin.server.ts` — Admin API client (REST helper using existing `SHOPIFY_ACCESS_TOKEN`)
- `src/lib/shopify-admin.functions.ts` — server fns: `updateShopifyProductBasics`, `updateShopifyVariantPricing`, `addShopifyProductImage`, `deleteShopifyProductImage`, `reorderShopifyProductImages`, `listShopifyProductsForAdmin`, `getShopifyProductForAdmin`
- `src/components/admin/ProductsPanel.tsx` — list + search inside `/admin`
- `src/components/admin/ProductEditDrawer.tsx` — the actual editor (tabs: Basics / Pricing / Images)
- `src/components/AdminEditProductButton.tsx` — floating inline edit button for `/products/$slug`

### Files to modify
- `src/routes/admin.tsx` — add Products tab
- `src/routes/products.$slug.tsx` — mount `AdminEditProductButton` when current user has admin role
- `src/lib/admin.functions.ts` — add `getCurrentUserIsAdmin` helper if not already present

### Security guarantees
- Every Admin API call wrapped in `createServerFn` + `requireSupabaseAuth` + server-side `has_role('admin')` check
- `SHOPIFY_ACCESS_TOKEN` never leaves the server
- Image uploads validated for type (jpg/png/webp) and size (≤ 10 MB) before forwarding to Shopify

### Open question
Long term, do you also want **inventory quantity** editing (requires an extra Shopify location lookup + `inventory_levels/set.json` call)? Easy to add in a follow-up — just confirm and I'll include it. Approve this plan and I'll build it.
