import type { CartItem } from "./cart-store";

export type PromotionKind = "buy_2_get_1_free" | "buy_1_get_half_off" | "flat_off";

export type Promotion = {
  id: string;
  name: string;
  kind: PromotionKind;
  flat_amount: number | null;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  priority: number;
};

export type DiscountResult = {
  amount: number;
  label: string;
  requiresAuth: boolean;
};

const BUY3_CAP = 45;

// Expand items into per-unit prices sorted desc
function expandPrices(items: CartItem[]): number[] {
  const arr: number[] = [];
  for (const i of items) for (let k = 0; k < i.quantity; k++) arr.push(i.price);
  return arr.sort((a, b) => b - a);
}

// Buy N Get 1 Free → cheapest of every (N+1) group is free
function buyNGet1Free(prices: number[], n: number, cap?: number): number {
  let total = 0;
  const groupSize = n + 1;
  for (let i = 0; i + groupSize <= prices.length; i += groupSize) {
    const group = prices.slice(i, i + groupSize);
    total += group[group.length - 1]; // cheapest (sorted desc)
  }
  return cap != null ? Math.min(total, cap) : total;
}

function buy1GetHalfOff(prices: number[]): number {
  // Every pair: cheaper one gets 50% off
  let total = 0;
  for (let i = 0; i + 2 <= prices.length; i += 2) {
    total += prices[i + 1] * 0.5;
  }
  return total;
}

export function findActivePromotion(promos: Promotion[], now = new Date()): Promotion | null {
  const t = now.getTime();
  const active = promos.filter(
    (p) => p.enabled && new Date(p.starts_at).getTime() <= t && new Date(p.ends_at).getTime() >= t,
  );
  if (!active.length) return null;
  return active.sort((a, b) => b.priority - a.priority)[0];
}

export function computeDiscount(
  items: CartItem[],
  activePromo: Promotion | null,
  isAuthenticated: boolean,
): DiscountResult {
  const prices = expandPrices(items);
  if (!prices.length) return { amount: 0, label: "", requiresAuth: false };

  // Baseline: Buy 3 Get 1 Free up to $45
  const baseline = buyNGet1Free(prices, 3, BUY3_CAP);
  let best = { amount: baseline, label: "Buy 3 Get 1 Free (up to $45)" };

  if (activePromo) {
    let promoAmt = 0;
    let promoLabel = activePromo.name;
    if (activePromo.kind === "buy_2_get_1_free") {
      promoAmt = buyNGet1Free(prices, 2);
      promoLabel = `${activePromo.name} — Buy 2 Get 1 Free`;
    } else if (activePromo.kind === "buy_1_get_half_off") {
      promoAmt = buy1GetHalfOff(prices);
      promoLabel = `${activePromo.name} — Buy 1 Get 50% Off`;
    } else if (activePromo.kind === "flat_off") {
      promoAmt = Math.min(activePromo.flat_amount ?? 0, prices.reduce((s, p) => s + p, 0));
      promoLabel = `${activePromo.name} — $${activePromo.flat_amount?.toFixed(0)} off`;
    }
    if (promoAmt > best.amount) best = { amount: promoAmt, label: promoLabel };
  }

  return {
    amount: Math.round(best.amount * 100) / 100,
    label: best.label,
    requiresAuth: !isAuthenticated && best.amount > 0,
  };
}
