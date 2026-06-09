import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shopify/webhooks/orders-create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyAndParseShopifyWebhook, reserveWebhookId, markWebhookProcessed } =
          await import("@/lib/shopify-webhook.server");
        const result = await verifyAndParseShopifyWebhook(request, "orders/create");
        if (!result.ok) return result.response;
        const { ctx } = result;
        const fresh = await reserveWebhookId(ctx);
        if (!fresh) return new Response("Duplicate", { status: 200 });
        try {
          const { upsertShopifyOrder } = await import("@/lib/shopify-webhook-handlers.server");
          await upsertShopifyOrder(ctx.payload);
          await markWebhookProcessed(ctx.webhookId);
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[orders-create] handler error", e);
          await markWebhookProcessed(ctx.webhookId, e.message);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
