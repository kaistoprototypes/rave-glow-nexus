import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- Catalog ----------
export const yoycolListProductTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    page: z.number().int().min(1).max(1000).default(1),
    size: z.number().int().min(1).max(50).default(20),
    keyword: z.string().max(120).optional(),
    spu_code: z.string().max(120).optional(),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { yoycolFetch } = await import("./yoycol.server");
    const res = await yoycolFetch<any>({
      path: "/api/2025/open/v4/catalog/products",
      query: { page: data.page, size: data.size, keyword: data.keyword, spu_code: data.spu_code },
    });
    return { code: res.code, msg: res.msg, data: res.data };
  });

export const yoycolGetTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ spu_code: z.string().min(1).max(120) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { yoycolFetch } = await import("./yoycol.server");
    // Fetch template detail + variants (best-effort across endpoint shapes)
    const [detail, variants] = await Promise.all([
      yoycolFetch<any>({ path: `/api/2025/open/v4/catalog/products/${encodeURIComponent(data.spu_code)}` }).catch((e) => ({ code: "ERR", msg: e.message, data: null })),
      yoycolFetch<any>({ path: `/api/2025/open/v4/catalog/products/${encodeURIComponent(data.spu_code)}/variants` }).catch((e) => ({ code: "ERR", msg: e.message, data: null })),
    ]);
    return { detail: detail.data, variants: variants.data };
  });

export const yoycolPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { yoycolFetch } = await import("./yoycol.server");
    try {
      const res = await yoycolFetch<any>({ path: "/api/2025/open/v4/catalog/products", query: { page: 1, size: 1 } });
      return { ok: res.code === "100000", code: res.code, msg: res.msg };
    } catch (e: any) { return { ok: false, code: "ERR", msg: e.message }; }
  });

// ---------- Mappings ----------
const PlacementSchema = z.object({
  position: z.string().min(1).max(60), // 'front' | 'back' | 'left_sleeve' | etc.
  image_url: z.string().url().max(2000),
  print_area_id: z.string().max(120).optional(),
  scale: z.number().min(0.01).max(5).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  offset_x: z.number().min(-1).max(1).optional(),
  offset_y: z.number().min(-1).max(1).optional(),
});

export const yoycolListMappings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("yoycol_product_mappings")
      .select("*, products!inner(id,name,slug,featured_image)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { mappings: data ?? [] };
  });

export const yoycolSaveMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    product_id: z.string().uuid(),
    spu_code: z.string().min(1).max(120),
    template_name: z.string().max(200).optional(),
    cover_image: z.string().url().max(2000).optional(),
    placements: z.array(PlacementSchema).max(10).default([]),
    variant_map: z.record(z.string().max(120), z.object({
      sku: z.string().max(200).optional(),
      variant_id: z.string().max(200).optional(),
      price: z.number().min(0).max(10000).optional(),
    })).default({}),
    sync_direction: z.enum(["pull", "push", "manual"]).default("manual"),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("yoycol_product_mappings").select("id").eq("product_id", data.product_id).maybeSingle();
    const payload = {
      product_id: data.product_id,
      spu_code: data.spu_code,
      template_name: data.template_name ?? null,
      cover_image: data.cover_image ?? null,
      placements: data.placements as any,
      variant_map: data.variant_map as any,
      sync_direction: data.sync_direction,
      last_synced_at: new Date().toISOString(),
    };
    if (existing) {
      const { error } = await supabaseAdmin.from("yoycol_product_mappings").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, updated: true };
    } else {
      const { data: row, error } = await supabaseAdmin.from("yoycol_product_mappings").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id, updated: false };
    }
  });

export const yoycolDeleteMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("yoycol_product_mappings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Import (Yoycol → catalog) ----------
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `yoycol-${Date.now()}`;
}

export const yoycolImportTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    spu_code: z.string().min(1).max(120),
    name: z.string().max(200).optional(),
    price: z.number().min(0).max(10000).optional(),
    product_type: z.string().max(60).default("tee"),
    gender: z.string().max(30).default("unisex"),
    status: z.enum(["active","draft","archived"]).default("draft"),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { yoycolFetch } = await import("./yoycol.server");

    // Pull template + variants
    const detail = await yoycolFetch<any>({ path: `/api/2025/open/v4/catalog/products/${encodeURIComponent(data.spu_code)}` }).catch(() => null);
    const variantsRes = await yoycolFetch<any>({ path: `/api/2025/open/v4/catalog/products/${encodeURIComponent(data.spu_code)}/variants` }).catch(() => null);
    const tpl = detail?.data ?? {};
    const variants: any[] = variantsRes?.data?.records ?? variantsRes?.data?.list ?? variantsRes?.data ?? [];

    const name = data.name ?? tpl.designName ?? tpl.name ?? tpl.title ?? `Yoycol ${data.spu_code}`;
    const cover = tpl.coverImage ?? tpl.thumb ?? variants?.[0]?.image ?? null;
    const baseSlug = slugify(name);
    let slug = baseSlug;
    // ensure unique slug
    for (let i = 1; i < 50; i++) {
      const { data: dup } = await supabaseAdmin.from("products").select("id").eq("slug", slug).maybeSingle();
      if (!dup) break;
      slug = `${baseSlug}-${i}`;
    }
    const colors = Array.from(new Set(variants.map((v) => v.color ?? v.colorName).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(variants.map((v) => v.size ?? v.sizeName).filter(Boolean))) as string[];

    const { data: product, error } = await supabaseAdmin.from("products").insert({
      name, slug,
      price: data.price ?? Number(tpl.basePrice ?? tpl.price ?? 39),
      product_type: data.product_type,
      gender: data.gender,
      status: data.status,
      short_description: tpl.shortDesc ?? tpl.description ?? null,
      long_description: tpl.description ?? null,
      featured_image: cover,
      gallery: (tpl.images ?? []).filter(Boolean),
      colors, sizes,
      tags: ["yoycol", data.spu_code],
    }).select().single();
    if (error) throw new Error(error.message);

    // Variants
    if (variants.length) {
      const rows = variants.slice(0, 200).map((v) => ({
        product_id: product.id,
        color: v.color ?? v.colorName ?? null,
        size: v.size ?? v.sizeName ?? null,
        sku: v.sku ?? v.skuCode ?? null,
        price: Number(v.price ?? data.price ?? 0) || null,
        inventory: 100,
      }));
      await supabaseAdmin.from("product_variants").insert(rows);
    }

    // Variant map keyed by "size|color"
    const variant_map: Record<string, any> = {};
    for (const v of variants) {
      const key = `${v.size ?? v.sizeName ?? ""}|${v.color ?? v.colorName ?? ""}`;
      variant_map[key] = { sku: v.sku ?? v.skuCode, variant_id: String(v.id ?? v.variantId ?? v.skuCode ?? ""), price: Number(v.price ?? 0) || undefined };
    }

    await supabaseAdmin.from("yoycol_product_mappings").insert({
      product_id: product.id,
      spu_code: data.spu_code,
      template_name: name,
      cover_image: cover,
      placements: [],
      variant_map: variant_map as any,
      sync_direction: "pull",
      last_synced_at: new Date().toISOString(),
    });

    return { product_id: product.id, slug, variant_count: variants.length };
  });

// ---------- Push (catalog → Yoycol) ----------
// Yoycol does not expose a public "create template for arbitrary store" endpoint.
// We mark the mapping as push and store designs/placements so admin knows what to mirror in Yoycol UI.
export const yoycolMarkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ product_id: z.string().uuid(), note: z.string().max(500).optional() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("yoycol_product_mappings")
      .update({ sync_direction: "push", last_synced_at: new Date().toISOString() })
      .eq("product_id", data.product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Orders: create on Yoycol from local order ----------
async function createYoycolOrderForLocalOrder(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { yoycolFetch } = await import("./yoycol.server");

  const { data: order, error: oerr } = await supabaseAdmin
    .from("orders").select("*").eq("id", orderId).single();
  if (oerr || !order) throw new Error(oerr?.message ?? "Order not found");

  const { data: items, error: ierr } = await supabaseAdmin
    .from("order_items").select("*").eq("order_id", orderId);
  if (ierr) throw new Error(ierr.message);

  // Skip if already submitted
  const { data: existingYy } = await supabaseAdmin
    .from("yoycol_orders").select("id,status,yoycol_order_id").eq("order_id", orderId).maybeSingle();
  if (existingYy?.yoycol_order_id) return { skipped: true, yoycol_order_id: existingYy.yoycol_order_id };

  // Build line items via mappings
  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean) as string[])];
  const { data: mappings } = await supabaseAdmin
    .from("yoycol_product_mappings").select("*").in("product_id", productIds);
  const mapByProduct = new Map((mappings ?? []).map((m) => [m.product_id, m]));

  const lineItems: any[] = [];
  const missing: string[] = [];
  for (const it of items ?? []) {
    const m = it.product_id ? mapByProduct.get(it.product_id) : null;
    if (!m) { missing.push(it.name); continue; }
    const v = (it.variant ?? {}) as any;
    const key = `${v.size ?? ""}|${v.color ?? ""}`;
    const vm = (m.variant_map as any)?.[key] ?? Object.values((m.variant_map as any) ?? {})[0];
    lineItems.push({
      spu_code: m.spu_code,
      sku: vm?.sku,
      variant_id: vm?.variant_id,
      quantity: it.quantity,
      placements: m.placements ?? [],
    });
  }

  const addr: any = order.shipping_address ?? {};
  const shipName = addr.name ?? addr.recipient ?? order.email;
  const a = addr.address ?? addr;
  const payload: any = {
    external_order_no: order.id,
    currency: order.currency,
    customer: { name: shipName, email: order.email, phone: a.phone ?? null },
    shipping_address: {
      name: shipName,
      country: a.country ?? null,
      state: a.state ?? null,
      city: a.city ?? null,
      address1: a.line1 ?? a.address1 ?? null,
      address2: a.line2 ?? a.address2 ?? null,
      zip: a.postal_code ?? a.zip ?? null,
      phone: a.phone ?? null,
    },
    items: lineItems,
  };

  // Pre-insert pending row
  const { data: row } = await supabaseAdmin.from("yoycol_orders").insert({
    order_id: orderId,
    status: lineItems.length === 0 ? "error" : "pending",
    request_payload: payload as any,
    last_error: missing.length ? `Unmapped products: ${missing.join(", ")}` : null,
  }).select().single();

  if (lineItems.length === 0) return { error: "No mappings for any item", id: row?.id };

  try {
    const res = await yoycolFetch<any>({ method: "POST", path: "/api/2025/open/v4/order/create", body: payload });
    const ok = res.code === "100000";
    const yyId = res.data?.order_no ?? res.data?.orderNo ?? res.data?.id ?? null;
    await supabaseAdmin.from("yoycol_orders").update({
      status: ok ? "submitted" : "error",
      yoycol_order_id: yyId,
      yoycol_order_no: yyId,
      response_payload: res.data as any,
      last_error: ok ? null : `${res.code}: ${res.msg}`,
    }).eq("id", row!.id);
    await supabaseAdmin.from("orders").update({
      yoycol_status: ok ? "submitted" : "error",
      yoycol_order_id: yyId,
    }).eq("id", orderId);
    return { id: row!.id, yoycol_order_id: yyId, ok };
  } catch (e: any) {
    await supabaseAdmin.from("yoycol_orders").update({ status: "error", last_error: e.message }).eq("id", row!.id);
    await supabaseAdmin.from("orders").update({ yoycol_status: "error" }).eq("id", orderId);
    return { id: row!.id, error: e.message };
  }
}

export const yoycolSubmitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ order_id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return createYoycolOrderForLocalOrder(data.order_id);
  });

// Exported for use by Stripe webhook (server-only context, no auth header)
export async function submitOrderToYoycolServerSide(orderId: string) {
  try { return await createYoycolOrderForLocalOrder(orderId); }
  catch (e: any) { return { error: e.message }; }
}

// ---------- Orders: poll status ----------
function mapYoycolStatus(s: any): string {
  const v = String(s ?? "").toLowerCase();
  if (!v) return "submitted";
  if (v.includes("ship")) return "shipped";
  if (v.includes("deliver")) return "delivered";
  if (v.includes("cancel")) return "cancelled";
  if (v.includes("production") || v.includes("printing") || v.includes("processing")) return "in_production";
  return v;
}

async function syncOneYoycolOrder(yyRowId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { yoycolFetch } = await import("./yoycol.server");
  const { data: row } = await supabaseAdmin.from("yoycol_orders").select("*").eq("id", yyRowId).maybeSingle();
  if (!row?.yoycol_order_id) return { skipped: true };

  const res = await yoycolFetch<any>({
    path: "/api/2025/open/v4/order/detail",
    query: { order_no: row.yoycol_order_id },
  }).catch((e) => ({ code: "ERR", msg: e.message, data: null }));
  const d = (res as any).data ?? {};
  const status = mapYoycolStatus(d.status ?? d.orderStatus ?? d.state);
  const tracking_number = d.trackingNumber ?? d.tracking_no ?? d.logistics?.trackingNumber ?? null;
  const tracking_url = d.trackingUrl ?? d.logistics?.trackingUrl ?? null;
  const carrier = d.carrier ?? d.logistics?.carrier ?? null;

  await supabaseAdmin.from("yoycol_orders").update({
    status,
    tracking_number, tracking_url, carrier,
    response_payload: d as any,
    shipped_at: status === "shipped" && !row.shipped_at ? new Date().toISOString() : row.shipped_at,
    delivered_at: status === "delivered" && !row.delivered_at ? new Date().toISOString() : row.delivered_at,
  }).eq("id", row.id);

  await supabaseAdmin.from("orders").update({
    yoycol_status: status, tracking_number, tracking_url,
    status: status === "delivered" ? "fulfilled" : status === "shipped" ? "fulfilled" : undefined,
  } as any).eq("id", row.order_id);

  return { ok: true, status };
}

export const yoycolSyncOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    return syncOneYoycolOrder(data.id);
  });

export async function syncAllOpenYoycolOrders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("yoycol_orders").select("id")
    .not("yoycol_order_id", "is", null)
    .not("status", "in", "(delivered,cancelled,error)")
    .limit(100);
  const results = [];
  for (const r of rows ?? []) {
    try { results.push(await syncOneYoycolOrder(r.id)); }
    catch (e: any) { results.push({ id: r.id, error: e.message }); }
  }
  return { count: results.length, results };
}

export const yoycolSyncAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return syncAllOpenYoycolOrders();
  });

export const yoycolListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("yoycol_orders")
      .select("*, orders!inner(id,email,total,status,created_at)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });
