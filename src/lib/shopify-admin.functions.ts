import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const listShopifyProductsForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ search: z.string().optional() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin } = await import("./shopify-admin.server");
    const qs = new URLSearchParams({
      limit: "100",
      fields: "id,title,handle,product_type,status,image,variants",
    });
    if (data.search) qs.set("title", data.search);
    const json = await shopifyAdmin<{ products: any[] }>(`products.json?${qs}`);
    const products = json.products.map((p) => ({
      id: String(p.id),
      title: p.title,
      handle: p.handle,
      product_type: p.product_type,
      status: p.status,
      image: p.image?.src ?? null,
      min_price: p.variants?.[0]?.price ?? null,
      variant_count: p.variants?.length ?? 0,
    }));
    return { products };
  });

export const getShopifyProductForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const id = gidToNumericId(data.productId);
    const json = await shopifyAdmin<{ product: any }>(`products/${id}.json`);
    return { product: json.product };
  });

export const getShopifyProductByHandleForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ handle: z.string() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin } = await import("./shopify-admin.server");
    const qs = new URLSearchParams({ handle: data.handle, limit: "1" });
    const json = await shopifyAdmin<{ products: any[] }>(`products.json?${qs}`);
    return { product: json.products?.[0] ?? null };
  });

export const updateShopifyProductBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      productId: z.string(),
      title: z.string().min(1).max(255).optional(),
      body_html: z.string().max(100000).optional(),
      product_type: z.string().max(255).optional(),
      tags: z.string().max(5000).optional(),
      status: z.enum(["active", "draft", "archived"]).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const id = gidToNumericId(data.productId);
    const { productId, ...patch } = data;
    await shopifyAdmin(`products/${id}.json`, {
      method: "PUT",
      body: { product: { id: Number(id), ...patch } },
    });
    return { ok: true };
  });

export const updateShopifyVariantPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      variantId: z.string(),
      price: z.string().regex(/^\d+(\.\d{1,2})?$/),
      compare_at_price: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const id = gidToNumericId(data.variantId);
    await shopifyAdmin(`variants/${id}.json`, {
      method: "PUT",
      body: {
        variant: {
          id: Number(id),
          price: data.price,
          compare_at_price: data.compare_at_price ?? null,
        },
      },
    });
    return { ok: true };
  });

export const addShopifyProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string(), src: z.string().url(), alt: z.string().optional() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const id = gidToNumericId(data.productId);
    const json = await shopifyAdmin<{ image: any }>(`products/${id}/images.json`, {
      method: "POST",
      body: { image: { src: data.src, alt: data.alt } },
    });
    return { image: json.image };
  });

export const deleteShopifyProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string(), imageId: z.string() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const pid = gidToNumericId(data.productId);
    const iid = gidToNumericId(data.imageId);
    await shopifyAdmin(`products/${pid}/images/${iid}.json`, { method: "DELETE" });
    return { ok: true };
  });

export const reorderShopifyProductImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string(), orderedImageIds: z.array(z.string()).min(1) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { shopifyAdmin, gidToNumericId } = await import("./shopify-admin.server");
    const pid = gidToNumericId(data.productId);
    const images = data.orderedImageIds.map((iid, idx) => ({
      id: Number(gidToNumericId(iid)),
      position: idx + 1,
    }));
    await shopifyAdmin(`products/${pid}.json`, {
      method: "PUT",
      body: { product: { id: Number(pid), images } },
    });
    return { ok: true };
  });
