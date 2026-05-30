import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ItemSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  price: z.number().min(0).max(10000),
  quantity: z.number().int().min(1).max(50),
  size: z.string().optional(),
  color: z.string().optional(),
  image_palette: z.array(z.string()).optional(),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    items: z.array(ItemSchema).min(1).max(50),
  }))
  .handler(async ({ data }) => {
    // Re-price server-side to prevent tampering
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error } = await supabaseAdmin
      .from("products").select("id,price,name,slug,status").in("id", ids);
    if (error) throw new Error(error.message);
    const priceMap = new Map((products ?? []).map((p) => [p.id, p]));

    const subtotal = data.items.reduce((sum, i) => {
      const p = priceMap.get(i.productId);
      if (!p || p.status !== "active") throw new Error(`Product ${i.name} unavailable`);
      return sum + Number(p.price) * i.quantity;
    }, 0);
    const shipping = subtotal > 80 ? 0 : 9;
    const total = subtotal + shipping;

    const { data: order, error: oErr } = await supabaseAdmin.from("orders").insert({
      email: data.email,
      status: "pending",
      subtotal, shipping, total,
      currency: "usd",
    }).select().single();
    if (oErr) throw new Error(oErr.message);

    const itemRows = data.items.map((i) => {
      const p = priceMap.get(i.productId)!;
      const unit = Number(p.price);
      return {
        order_id: order.id,
        product_id: i.productId,
        name: i.name,
        unit_price: unit,
        quantity: i.quantity,
        subtotal: unit * i.quantity,
        variant: { size: i.size, color: i.color },
      };
    });
    await supabaseAdmin.from("order_items").insert(itemRows);

    const stripe = getStripe();
    const origin = process.env.PUBLIC_URL
      ?? `https://${process.env.LOVABLE_PUBLIC_HOST ?? "project--24e6b821-7ac9-4112-b1e7-4cf3bbadc2fd.lovable.app"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: data.email,
      line_items: data.items.map((i) => {
        const p = priceMap.get(i.productId)!;
        return {
          quantity: i.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(p.price) * 100),
            product_data: {
              name: i.name,
              description: [i.size, i.color].filter(Boolean).join(" · ") || undefined,
            },
          },
        };
      }).concat(shipping > 0 ? [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shipping * 100,
          product_data: { name: "Shipping" },
        },
      }] : []),
      shipping_address_collection: { allowed_countries: ["US","CA","GB","AU","DE","FR","NL","ES","IT","MX","BR","JP"] },
      metadata: { order_id: order.id },
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

    // Mark paid as a fallback in case webhook hasn't fired yet
    if (session.payment_status === "paid") {
      await supabaseAdmin.from("orders")
        .update({ status: "paid", stripe_payment_intent_id: session.payment_intent as string ?? null })
        .eq("stripe_session_id", session.id);
    }

    const { data: order } = await supabaseAdmin
      .from("orders").select("id,email,total,status,created_at").eq("stripe_session_id", session.id).maybeSingle();
    return { order };
  });
