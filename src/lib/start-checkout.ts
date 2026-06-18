import { toast } from "sonner";
import type { CartItem } from "./cart-store";

type CheckoutFn = (args: { data: any }) => Promise<{ url: string | null; orderId: string | null }>;

export async function startShopifyCheckout(
  checkoutFn: CheckoutFn,
  items: CartItem[],
  email?: string,
) {
  const lineItems = items.filter((i) => i.variantId);
  if (lineItems.length === 0) {
    toast.error("Your bag is empty or items can't be purchased.");
    return false;
  }
  try {
    const res = await checkoutFn({
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
      return true;
    }
    toast.error("Could not start checkout");
    return false;
  } catch (err: any) {
    toast.error(err?.message ?? "Checkout failed");
    return false;
  }
}
