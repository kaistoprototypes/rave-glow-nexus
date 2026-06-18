import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { createCheckout } from "@/lib/checkout.functions";
import { startShopifyCheckout } from "@/lib/start-checkout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Electric Pulse Emporium" }] }),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal } = useCart();
  const checkoutFn = useServerFn(createCheckout);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email); });
  }, []);

  const visibleItems = mounted ? items : [];
  const total = mounted ? subtotal() : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visibleItems.length === 0) { toast.error("Bag is empty"); return; }
    setLoading(true);
    const ok = await startShopifyCheckout(checkoutFn as any, visibleItems, email || undefined);
    if (!ok) setLoading(false);
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl md:text-5xl font-black mb-8">Checkout</h1>
        <div className="card-glow rounded-2xl p-6 text-sm text-muted-foreground">Loading checkout…</div>
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black">Your bag is empty</h1>
        <Link to="/shop" className="btn-neon mt-6 inline-block rounded-full px-6 py-2 text-xs">Browse drops</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl md:text-5xl font-black mb-8">Checkout</h1>
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="card-glow rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full rounded-md bg-input/60 border border-border px-3 py-2.5 text-sm outline-none focus:border-[color:var(--lime)]" />
          </div>
          <p className="text-xs text-muted-foreground">Payment, shipping address, shipping rates, and taxes are handled securely by Shopify.</p>
          <button type="submit" disabled={loading} className="btn-neon w-full rounded-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Redirecting to Shopify…" : `Proceed to Checkout — ${money(total)}`}
          </button>
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">Secured by Shopify</p>
        </form>

        <aside className="card-glow rounded-2xl p-6 h-fit space-y-3">
          <h3 className="font-display text-lg font-bold uppercase tracking-widest mb-2">Order</h3>
          {visibleItems.map((i) => (
            <div key={`${i.productId}-${i.size}-${i.color}`} className="flex justify-between text-sm">
              <span className="text-foreground/90">{i.name} <span className="text-muted-foreground">× {i.quantity}</span></span>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border/40 pt-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{money(total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping & taxes</span><span>Calculated by Shopify</span></div>
            <div className="flex justify-between text-lg font-bold pt-2"><span>Total</span><span className="text-[color:var(--lime)] glow-lime">{money(total)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
