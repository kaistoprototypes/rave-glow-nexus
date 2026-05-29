import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listProducts = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      gender: z.string().optional(),
      product_type: z.string().optional(),
      design_style: z.string().optional(),
      collection: z.string().optional(),
      search: z.string().optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "best"]).optional(),
      featured: z.boolean().optional(),
      best_seller: z.boolean().optional(),
      new_drop: z.boolean().optional(),
      limit: z.number().min(1).max(120).optional(),
    }),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("products").select("*").eq("status", "active");
    if (data.gender) q = q.eq("gender", data.gender);
    if (data.product_type) q = q.eq("product_type", data.product_type);
    if (data.design_style) q = q.eq("design_style", data.design_style);
    if (data.collection) q = q.eq("collection_slug", data.collection);
    if (data.featured) q = q.eq("is_featured", true);
    if (data.best_seller) q = q.eq("is_best_seller", true);
    if (data.new_drop) q = q.eq("is_new_drop", true);
    if (data.search) q = q.or(`name.ilike.%${data.search}%,short_description.ilike.%${data.search}%,design_style.ilike.%${data.search}%`);
    if (data.sort === "price_asc") q = q.order("price", { ascending: true });
    else if (data.sort === "price_desc") q = q.order("price", { ascending: false });
    else if (data.sort === "best") q = q.order("is_best_seller", { ascending: false }).order("created_at", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    q = q.limit(data.limit ?? 90);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { products: rows ?? [] };
  });

export const getProductBySlug = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const { data: product, error } = await supabaseAdmin.from("products").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) return { product: null, related: [] };
    const { data: related } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("design_style", product.design_style)
      .neq("id", product.id)
      .limit(4);
    return { product, related: related ?? [] };
  });

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const [featured, best, drops, settings] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("is_featured", true).limit(8),
    supabaseAdmin.from("products").select("*").eq("is_best_seller", true).limit(8),
    supabaseAdmin.from("products").select("*").eq("is_new_drop", true).limit(8),
    supabaseAdmin.from("site_settings").select("*"),
  ]);
  const map: Record<string, any> = {};
  for (const s of settings.data ?? []) map[s.key] = s.value;
  return {
    featured: featured.data ?? [],
    bestSellers: best.data ?? [],
    newDrops: drops.data ?? [],
    settings: map,
  };
});

export const getFilterOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("categories").select("kind,slug,name").order("position");
  const styles = (data ?? []).filter((c) => c.kind === "design_style");
  const types = (data ?? []).filter((c) => c.kind === "product_type");
  const collections = (data ?? []).filter((c) => c.kind === "collection");
  return { styles, types, collections };
});
