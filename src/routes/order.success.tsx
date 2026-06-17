import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { CheckCircle2, ShoppingBag, Mail } from "lucide-react";

export const Route = createFileRoute("/order/success")({
  head: () => ({ meta: [{ title: "Order confirmed — Electric Pulse Emporium" }] }),
  component: Success,
});

function Success() {
  const clear = useCart((s) => s.clear);

  useEffect(() => { clear(); }, [clear]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-[color:var(--lime)] glow-lime" />
      <h1 className="font-display text-4xl md:text-5xl font-black mt-6">Order confirmed</h1>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Thanks for your purchase. You will receive a confirmation email shortly with your order details.
      </p>
      <div className="card-glow rounded-2xl p-6 mt-8 text-left space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-[color:var(--cyan)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">What&apos;s next?</p>
            <p className="text-sm mt-1">We&apos;ll email your receipt and tracking info as soon as your order ships.</p>
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-3 justify-center">
        <Link to="/shop" className="btn-neon rounded-full px-6 py-2.5 text-xs flex items-center gap-2">
          <ShoppingBag className="h-3.5 w-3.5" />
          Back to store
        </Link>
      </div>
    </div>
  );
}
