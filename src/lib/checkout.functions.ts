import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { shopifyStorefront } from "@/lib/shopify-storefront.server";

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

const CART_CREATE = /* GraphQL */ `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

function withOnlineStoreChannel(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("channel", "online_store");
    return u.toString();
  } catch {
    return url;
  }
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    items: z.array(ItemSchema).min(1).max(50),
  }))
  .handler(async ({ data }) => {
    const lines = data.items
      .filter((i) => i.variantId)
      .map((i) => ({ quantity: i.quantity, merchandiseId: i.variantId! }));
    if (lines.length === 0) {
      throw new Error("No items with Shopify variant IDs — cannot create checkout.");
    }

    const res = await shopifyStorefront<any>(CART_CREATE, {
      input: { lines, buyerIdentity: { email: data.email } },
    });

    const errs = res?.cartCreate?.userErrors ?? [];
    if (errs.length > 0) {
      throw new Error(`Shopify: ${errs.map((e: any) => e.message).join(", ")}`);
    }
    const checkoutUrl = res?.cartCreate?.cart?.checkoutUrl;
    if (!checkoutUrl) throw new Error("Shopify did not return a checkout URL.");

    return { url: withOnlineStoreChannel(checkoutUrl), orderId: null };
  });

// Legacy Stripe confirm — kept as no-op so /order/success doesn't crash.
// Orders are now created via Shopify webhooks (orders/create).
export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ session_id: z.string().min(1) }))
  .handler(async () => {
    return { order: null };
  });
