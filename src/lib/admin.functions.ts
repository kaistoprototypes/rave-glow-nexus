import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminListProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ search: z.string().optional() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { products: rows ?? [] };
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid(),
    patch: z.object({
      name: z.string().optional(),
      slug: z.string().optional(),
      price: z.number().optional(),
      compare_at_price: z.number().nullable().optional(),
      status: z.enum(["active", "draft", "archived"]).optional(),
      short_description: z.string().optional(),
      long_description: z.string().optional(),
      design_story: z.string().optional(),
      is_featured: z.boolean().optional(),
      is_best_seller: z.boolean().optional(),
      is_new_drop: z.boolean().optional(),
      inventory: z.number().int().optional(),
      sold_count: z.number().int().min(0).max(1000000).optional(),
      product_type: z.string().optional(),
      gender: z.string().optional(),
      featured_image: z.string().nullable().optional(),
    }),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("products").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "lowercase, numbers, hyphens"),
    price: z.number().min(0),
    product_type: z.string().min(1).max(60).default("tee"),
    gender: z.string().min(1).max(30).default("unisex"),
    status: z.enum(["active", "draft", "archived"]).default("draft"),
    short_description: z.string().max(500).optional(),
    inventory: z.number().int().min(0).default(100),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("products").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid(),
    patch: z.object({
      status: z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]).optional(),
      notes: z.string().max(2000).nullable().optional(),
    }),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("orders").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("order_items").delete().eq("order_id", data.id);
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { coupons: data ?? [] };
  });

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/, "uppercase letters, numbers, _ or -"),
    description: z.string().max(200).nullable().optional(),
    percent_off: z.number().int().min(1).max(100).nullable().optional(),
    amount_off: z.number().min(0).nullable().optional(),
    usage_limit: z.number().int().min(1).nullable().optional(),
    active: z.boolean().default(true),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const payload = { ...data };
    if (data.id) {
      const { error } = await supabaseAdmin.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { id: _omit, ...insertPayload } = payload;
    const { data: row, error } = await supabaseAdmin.from("coupons").insert(insertPayload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ percent: z.number().min(-90).max(500) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: products } = await supabaseAdmin.from("products").select("id,price");
    for (const p of products ?? []) {
      const next = Math.max(1, Math.round(Number(p.price) * (1 + data.percent / 100)));
      await supabaseAdmin.from("products").update({ price: next }).eq("id", p.id);
    }
    return { updated: products?.length ?? 0 };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("orders").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const adminGenerateProductCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const { data: p } = await supabaseAdmin.from("products").select("*").eq("id", data.productId).single();
    if (!p) throw new Error("Product not found");

    const prompt = `Write product copy for a neon ravewear / festival merch item.
Name: ${p.name}
Type: ${p.product_type} for ${p.gender}
Design style: ${p.design_style}
Color palette: ${(p.color_palette ?? []).join(", ")}

Return STRICT JSON with these keys: short_description (max 140 chars, punchy, sensory), long_description (3-4 short paragraphs about fit, fabric vibe, and where to wear it — desert lights, bass nights, electric weekends), design_story (1 short paragraph about the artwork inspiration), seo_title (max 60 chars), seo_description (max 155 chars). No festival trademarks. No copycat language.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a copywriter for an independent neon festival ravewear label. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI gateway: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/^```json\s*|\s*```$/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(clean); } catch { parsed = { short_description: clean.slice(0, 140), long_description: clean }; }

    await supabaseAdmin.from("ai_product_content").insert({
      product_id: p.id, status: "generated", payload: parsed, created_by: context.userId,
    });
    return { content: parsed };
  });

export const adminApplyAiCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string().uuid(), content: z.record(z.string(), z.any()) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const c = data.content;
    const { error } = await supabaseAdmin.from("products").update({
      short_description: c.short_description ?? null,
      long_description: c.long_description ?? null,
      design_story: c.design_story ?? null,
      seo_title: c.seo_title ?? null,
      seo_description: c.seo_description ?? null,
    }).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
