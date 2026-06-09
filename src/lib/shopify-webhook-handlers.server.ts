// Server-only persistence logic for each Shopify webhook topic.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Orders ----------
export async function upsertShopifyOrder(payload: any) {
  const row = {
    shopify_order_id: String(payload.id),
    order_number: payload.name ?? (payload.order_number ? String(payload.order_number) : null),
    email: payload.email ?? payload.contact_email ?? null,
    total_price: num(payload.total_price ?? payload.current_total_price),
    currency: payload.currency ?? null,
    financial_status: payload.financial_status ?? null,
    fulfillment_status: payload.fulfillment_status ?? null,
    cancel_reason: payload.cancel_reason ?? null,
    cancelled_at: payload.cancelled_at ?? null,
    line_items: payload.line_items ?? [],
    shipping_address: payload.shipping_address ?? null,
    billing_address: payload.billing_address ?? null,
    customer: payload.customer ?? null,
    shopify_created_at: payload.created_at ?? null,
    shopify_updated_at: payload.updated_at ?? null,
    raw: payload,
  };
  const { error } = await supabaseAdmin
    .from("shopify_orders")
    .upsert(row, { onConflict: "shopify_order_id" });
  if (error) throw new Error(error.message);
}

export async function markShopifyOrderCancelled(payload: any) {
  const { error } = await supabaseAdmin
    .from("shopify_orders")
    .upsert(
      {
        shopify_order_id: String(payload.id),
        cancelled_at: payload.cancelled_at ?? new Date().toISOString(),
        cancel_reason: payload.cancel_reason ?? null,
        financial_status: payload.financial_status ?? null,
        fulfillment_status: payload.fulfillment_status ?? null,
        shopify_updated_at: payload.updated_at ?? null,
        raw: payload,
      },
      { onConflict: "shopify_order_id" },
    );
  if (error) throw new Error(error.message);
}

// ---------- Products ----------
export async function upsertShopifyProduct(payload: any) {
  const variants: any[] = payload.variants ?? [];
  const prices = variants.map((v) => num(v.price)).filter((n): n is number => n !== null);
  const compareAt = variants
    .map((v) => num(v.compare_at_price))
    .filter((n): n is number => n !== null);
  const inventory = variants
    .map((v) => num(v.inventory_quantity))
    .filter((n): n is number => n !== null)
    .reduce((s, n) => s + n, 0);

  const row = {
    shopify_product_id: String(payload.id),
    handle: payload.handle ?? null,
    title: payload.title ?? null,
    description: payload.body_html ?? null,
    vendor: payload.vendor ?? null,
    product_type: payload.product_type ?? null,
    status: payload.status ?? null,
    tags: typeof payload.tags === "string"
      ? payload.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(payload.tags) ? payload.tags : [],
    images: payload.images ?? [],
    variants,
    min_price: prices.length ? Math.min(...prices) : null,
    max_price: prices.length ? Math.max(...prices) : null,
    compare_at_price: compareAt.length ? Math.max(...compareAt) : null,
    total_inventory: variants.length ? inventory : null,
    deleted_at: null,
    shopify_created_at: payload.created_at ?? null,
    shopify_updated_at: payload.updated_at ?? null,
    raw: payload,
  };
  const { error } = await supabaseAdmin
    .from("shopify_products")
    .upsert(row, { onConflict: "shopify_product_id" });
  if (error) throw new Error(error.message);
}

export async function softDeleteShopifyProduct(payload: any) {
  const { error } = await supabaseAdmin
    .from("shopify_products")
    .upsert(
      {
        shopify_product_id: String(payload.id),
        deleted_at: new Date().toISOString(),
        raw: payload,
      },
      { onConflict: "shopify_product_id" },
    );
  if (error) throw new Error(error.message);
}
