import { toast } from "sonner";
import type { CartItem } from "./cart-store";
import { createCheckout } from "./checkout.functions";

export async function startShopifyCheckout(items: CartItem[], email?: string) {
  const lineItems = items.filter((i) => i.variantId);
  if (lineItems.length === 0) {
    toast.error("Your bag is empty or items can't be purchased.");
    return;
  }
  try {
    const res = await createCheckout({
      data: {
        email: email || undefined,
        returnUrl: window.location.origin + "/order/success",
        items: lineItems.map((i) => ({
          productId: i.productId, variantId: i.variantId, name: i.name, price: i.price,
          quantity: i.quantity, size: i.size, color: i.color, slug: i.slug,
          image_palette: i.image_palette,
        })),
      },
    });
    if (res.url) {
      window.location.assign(res.url);
    } else {
      toast.error("Could not start checkout");
    }
  } catch (err: any) {
    toast.error(err?.message ?? "Checkout failed");
  }
}
