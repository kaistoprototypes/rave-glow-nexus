import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import { computeDiscount, findActivePromotion, type Promotion } from "@/lib/promotions";
import type { CartItem } from "@/lib/cart-store";

const ItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  price: z.number().min(0).max(10000),
  quantity: z.number().int().min(1).max(50),
  size: z.string().optional(),
  color: z.string().optional(),
  image_palette: z.array(z.string()).optional(),
  image_url: z.string().optional(),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
}

async function getAuthedUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.auth.getClaims(token);
    return data?.claims?.sub ?? null;
  } catch { return null; }
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    items: z.array(ItemSchema).min(1).max(50),
  }))
  .handler(async ({ data }) => {
    const userId = await getAuthedUserId();

    // Re-price server-side to prevent tampering
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error } = await supabaseAdmin
      .from("products").select("id,price,name,slug,status").in("id", ids);
    if (error) throw new Error(error.message);
    const priceMap = new Map((products ?? []).map((p) => [p.id, p]));

    const repricedItems: CartItem[] = data.items.map((i) => {
      const p = priceMap.get(i.productId);
      if (!p || p.status !== "active") throw new Error(`Product ${i.name} unavailable`);
      return { ...i, price: Number(p.price) } as CartItem;
    });
    const subtotal = repricedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Discount: only for authenticated users
    let discount = 0;
    let discountLabel = "";
    if (userId) {
      const { data: promos } = await supabaseAdmin.from("promotions").select("*").eq("enabled", true);
      const active = findActivePromotion((promos ?? []) as Promotion[]);
      const d = computeDiscount(repricedItems, active, true);
      discount = d.amount;
      discountLabel = d.label;

      // First-product 20% off signup reward (stacks with best of cart promos? Keep separate.)
      const { data: reward } = await supabaseAdmin
        .from("signup_rewards")
        .select("*")
        .eq("user_id", userId)
        .is("used_at", null)
        .maybeSingle();
      if (reward && repricedItems.length > 0) {
        const cheapest = [...repricedItems].sort((a, b) => a.price - b.price)[0];
        const rewardDiscount = cheapest.price * (reward.percent_off / 100);
        if (rewardDiscount > discount) {
          discount = Math.round(rewardDiscount * 100) / 100;
          discountLabel = `${reward.percent_off}% off first product`;
        }
      }
    }

    const discounted = Math.max(0, subtotal - discount);
    const shipping = discounted > 80 ? 0 : 9;
    const total = discounted + shipping;

    const { data: order, error: oErr } = await supabaseAdmin.from("orders").insert({
      user_id: userId,
      email: data.email,
      status: "pending",
      subtotal, shipping, total, discount,
      currency: "usd",
      notes: discountLabel || null,
    }).select().single();
    if (oErr) throw new Error(oErr.message);

    const itemRows = repricedItems.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
      subtotal: i.price * i.quantity,
      variant: { size: i.size, color: i.color },
    }));
    await supabaseAdmin.from("order_items").insert(itemRows);

    const stripe = getStripe();
    const origin = process.env.PUBLIC_URL
      ?? `https://${process.env.LOVABLE_PUBLIC_HOST ?? "project--24e6b821-7ac9-4112-b1e7-4cf3bbadc2fd.lovable.app"}`;

    // Apply discount proportionally across line items
    const ratio = subtotal > 0 ? discounted / subtotal : 1;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = repricedItems.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.max(1, Math.round(i.price * ratio * 100)),
        product_data: {
          name: i.name,
          description: [i.size, i.color].filter(Boolean).join(" · ") || undefined,
        },
      },
    }));
    if (shipping > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: "usd", unit_amount: shipping * 100, product_data: { name: "Shipping" } },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: data.email,
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ["US","CA","GB","AU","DE","FR","NL","ES","IT","MX","BR","JP"] },
      metadata: { order_id: order.id, discount_label: discountLabel },
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/cancel`,
    });

    await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return { url: session.url, orderId: order.id };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ session_id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(data.session_id);
    if (!session) return { order: null };

    if (session.payment_status === "paid") {
      await supabaseAdmin.from("orders")
        .update({ status: "paid", stripe_payment_intent_id: session.payment_intent as string ?? null })
        .eq("stripe_session_id", session.id);

      // Mark signup reward used if this order's user has one
      const { data: order } = await supabaseAdmin
        .from("orders").select("id,user_id,notes").eq("stripe_session_id", session.id).maybeSingle();
      if (order?.user_id && order.notes?.includes("first product")) {
        await supabaseAdmin.from("signup_rewards")
          .update({ used_at: new Date().toISOString() })
          .eq("user_id", order.user_id).is("used_at", null);
      }
    }

    const { data: order } = await supabaseAdmin
      .from("orders").select("id,email,total,status,created_at").eq("stripe_session_id", session.id).maybeSingle();
    return { order };
  });
