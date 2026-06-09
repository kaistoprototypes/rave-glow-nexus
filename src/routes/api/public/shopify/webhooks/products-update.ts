import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shopify/webhooks/products-update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyAndParseShopifyWebhook, reserveWebhookId, markWebhookProcessed } =
          await import("@/lib/shopify-webhook.server");
        const result = await verifyAndParseShopifyWebhook(request, "products/update");
        if (!result.ok) return result.response;
        const { ctx } = result;
        const fresh = await reserveWebhookId(ctx);
        if (!fresh) return new Response("Duplicate", { status: 200 });
        try {
          const { upsertShopifyProduct } = await import("@/lib/shopify-webhook-handlers.server");
          await upsertShopifyProduct(ctx.payload);
          await markWebhookProcessed(ctx.webhookId);
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[products-update] handler error", e);
          await markWebhookProcessed(ctx.webhookId, e.message);
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});
