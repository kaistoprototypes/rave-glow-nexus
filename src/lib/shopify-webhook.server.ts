// Server-only helpers for Shopify webhook verification & idempotency.
import crypto from "crypto";

export type ShopifyWebhookContext = {
  topic: string;
  shopDomain: string | null;
  webhookId: string;
  body: string;
  payload: any;
};

export async function verifyAndParseShopifyWebhook(
  request: Request,
  expectedTopic: string,
): Promise<{ ok: true; ctx: ShopifyWebhookContext } | { ok: false; response: Response }> {
  const secret = process.env.SHOPIFY_WEBHOOK_SIGN ?? process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, response: new Response("Webhook secret not configured", { status: 500 }) };
  }

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");

  if (!hmacHeader || !webhookId) {
    return { ok: false, response: new Response("Missing Shopify headers", { status: 401 }) };
  }
  if (topic && topic !== expectedTopic) {
    return { ok: false, response: new Response("Topic mismatch", { status: 400 }) };
  }

  // Raw body required for HMAC.
  const body = await request.text();
  const computed = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const a = Buffer.from(computed);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, response: new Response("Invalid signature", { status: 401 }) };
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
  }

  console.log(
    `[shopify-webhook] topic=${topic} shop=${shopDomain ?? "?"} webhook_id=${webhookId} status=verified`,
  );

  return { ok: true, ctx: { topic, shopDomain, webhookId, body, payload } };
}

/**
 * Returns true if this webhook_id is new (and reserves it). Returns false if it
 * has already been processed — caller should respond 200 without reprocessing.
 */
export async function reserveWebhookId(ctx: ShopifyWebhookContext): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("shopify_webhook_events").insert({
    webhook_id: ctx.webhookId,
    topic: ctx.topic,
    shop_domain: ctx.shopDomain,
    status: "received",
  });
  if (error) {
    // Unique violation = duplicate delivery.
    if ((error as any).code === "23505") return false;
    console.error("[shopify-webhook] reserve failed", error);
    throw new Error(error.message);
  }
  return true;
}

export async function markWebhookProcessed(webhookId: string, errorMsg?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("shopify_webhook_events")
    .update({
      status: errorMsg ? "error" : "processed",
      error: errorMsg ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("webhook_id", webhookId);
}
