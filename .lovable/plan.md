# Promotions, Holiday Calendar & Signup Discounts

## 1. Database (new tables)

**`promotions`** — holiday specials with a date range
- `name`, `kind` (`buy_3_get_1_free` always-on | `buy_2_get_1_free` | `buy_1_get_half_off` | `flat_off`), `flat_amount` (nullable, for $5–$10 off), `starts_at`, `ends_at`, `enabled`, `priority`
- Admin manage; public read of active rows only.

**`signup_rewards`** — 20% off first product coupon, auto-issued on signup
- `user_id`, `code` (unique), `percent_off`, `used_at`, `expires_at`
- Trigger on `auth.users` insert → create a row + insert a personal coupon code into the existing `coupons` table scoped to that user (or store directly in `signup_rewards` and check it at checkout).

**Permanent rule** (no DB row needed): Buy 3 Get 1 Free, cheapest free, capped at $45 — lives in code as the baseline promo.

## 2. Promo engine (`src/lib/promotions.ts`)
Pure function `computeDiscount(items, activePromo, isAuthenticated)` returning `{ discount, label, requiresAuth }`:
- Always evaluate **Buy 3 Get 1 Free** (cheapest item per group of 3, free amount capped at $45 total).
- If a holiday promo is active, evaluate it and pick whichever yields higher discount.
- If `!isAuthenticated`, return `requiresAuth: true` with the would-be discount shown but not applied.

## 3. Cart updates
- Show discount line + "Sign in to unlock $X off" CTA when unauthenticated.
- Apply 20% first-product coupon automatically post-login if user has unused `signup_rewards` row.
- Cart already persists via zustand+localStorage; on auth state change merge local cart into a new `user_carts` table (jsonb) so it follows the user across devices.

## 4. Admin: Promotions Calendar
New tab in `/admin` "Promotions":
- Calendar (shadcn `Calendar`) highlighting days with active promos.
- List + form to create/edit/delete promos: name, kind dropdown, flat amount (if `flat_off`), date range picker, enabled toggle.
- Server fns: `listPromotions`, `upsertPromotion`, `deletePromotion` in `src/lib/admin.functions.ts` (admin-gated).

## 5. Homepage banner
Top-of-page dismissible banner: **"Sign up & get 20% off your first product"** → links to `/login?signup=1`. Hidden for authenticated users.

## 6. Checkout gate
At checkout, if discount applied and user not authed → redirect to `/login?redirect=/checkout` with toast "Sign in to claim your discount".

## Files
- migration: `promotions`, `signup_rewards`, `user_carts` + signup trigger
- new: `src/lib/promotions.ts`, `src/lib/promotions.functions.ts`, `src/components/PromoBanner.tsx`, `src/components/admin/PromotionsPanel.tsx`
- edit: `src/routes/admin.tsx` (add tab), `src/routes/cart.tsx` (discount UI + auth gate), `src/routes/checkout.tsx` (apply discount), `src/routes/index.tsx` (banner), `src/lib/cart-store.ts` (sync hook), `src/lib/admin.functions.ts`

## Technical notes (non-technical readers can skip)
- Promo selection: highest-discount-wins to keep UX simple.
- Buy-N-Get-1 implementation: sort cart line items expanded by qty, group into N+1 buckets, free = cheapest in each bucket; sum capped at $45 for the permanent rule, uncapped for holiday `buy_2_get_1_free`.
- Coupon code stays optional — these promos auto-apply.
- Cart sync: on `SIGNED_IN`, upsert local items to `user_carts`; on load while authed, merge remote → local (remote wins on conflict by productId+size).