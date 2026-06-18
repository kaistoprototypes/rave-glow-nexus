import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/lib/cart-store";
import { ProductArt } from "@/components/ProductArt";
import { money } from "@/lib/format";
import { Minus, Plus, Trash2, Lock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listActivePromotions } from "@/lib/promotions.functions";
import { computeDiscount, findActivePromotion, type Promotion } from "@/lib/promotions";
import { createCheckout } from "@/lib/checkout.functions";
import { startShopifyCheckout } from "@/lib/start-checkout";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your bag — Electric Pulse Emporium" }] }),
  component: Cart,
});

function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const nav = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const checkoutFn = useServerFn(createCheckout);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user);
      setUserEmail(data.user?.email ?? undefined);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsAuthed(!!s);
      setUserEmail(s?.user?.email ?? undefined);
    });
    return () => subscription.unsubscribe();
  }, []);

  const promosFn = useServerFn(listActivePromotions);
  const { data: promoData } = useQuery({ queryKey: ["active-promotions"], queryFn: () => promosFn() });
  const activePromo = findActivePromotion((promoData?.promotions ?? []) as Promotion[]);
  const discount = computeDiscount(items, activePromo, isAuthed);

  const sub = subtotal();
  const appliedDiscount = isAuthed ? discount.amount : 0;
  const shipping = sub - appliedDiscount > 80 || items.length === 0 ? 0 : 9;
  const total = Math.max(0, sub - appliedDiscount + shipping);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl md:text-6xl font-black mb-8">Your bag</h1>
      {items.length === 0 ? (
        <div className="card-glow rounded-2xl p-16 text-center">
          <p className="text-xl font-display">Empty. The floor awaits.</p>
          <Link to="/shop" className="btn-neon mt-6 inline-block rounded-full px-7 py-2.5 text-xs">Browse drops</Link>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((i) => (
              <div key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-4 card-glow rounded-xl p-3">
                <div className="h-28 w-28 rounded-md overflow-hidden flex-shrink-0">
                  <ProductArt palette={i.image_palette ?? ["#39FF14","#00E5FF","#FF00C8"]} name={i.name} className="h-full w-full" />
                </div>
                <div className="flex-1">
                  <Link to="/products/$slug" params={{ slug: i.slug }} className="font-bold hover:text-[color:var(--lime)]">{i.name}</Link>
                  <p className="text-xs text-muted-foreground mt-1">{[i.size, i.color].filter(Boolean).join(" · ")}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button onClick={()=>setQty(i.productId, i.quantity - 1, i.size, i.color)} className="grid h-8 w-8 place-items-center"><Minus className="h-3 w-3" /></button>
                      <span className="px-3 text-sm">{i.quantity}</span>
                      <button onClick={()=>setQty(i.productId, i.quantity + 1, i.size, i.color)} className="grid h-8 w-8 place-items-center"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[color:var(--cyan)]">{money(i.price * i.quantity)}</span>
                      <button onClick={()=>remove(i.productId, i.size, i.color)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="card-glow rounded-2xl p-6 h-fit space-y-4">
            <h3 className="font-display text-lg font-bold uppercase tracking-widest">Summary</h3>
            <Row label="Subtotal" value={money(sub)} />
            {discount.amount > 0 && (
              <div className={`rounded-lg border p-3 text-xs ${isAuthed ? "border-[color:var(--lime)]/40 bg-[color:var(--lime)]/10" : "border-[color:var(--magenta)]/40 bg-[color:var(--magenta)]/10"}`}>
                <div className="flex items-center gap-2 font-bold uppercase tracking-widest mb-1">
                  <Sparkles className="h-3 w-3" /> {discount.label}
                </div>
                {isAuthed ? (
                  <p className="text-[color:var(--lime)] font-bold">You save {money(discount.amount)}</p>
                ) : (
                  <p className="text-muted-foreground">
                    <Lock className="inline h-3 w-3 mr-1" />
                    <Link to="/login" search={{ redirect: "/cart" } as any} className="underline text-[color:var(--magenta)]">Sign in</Link> to unlock {money(discount.amount)} off
                  </p>
                )}
              </div>
            )}
            {isAuthed && appliedDiscount > 0 && <Row label="Discount" value={`− ${money(appliedDiscount)}`} />}
            <Row label="Shipping" value={shipping === 0 ? "Free" : money(shipping)} />
            <div className="border-t border-border/40 pt-3 flex justify-between text-lg font-bold">
              <span>Total</span><span className="text-[color:var(--lime)] glow-lime">{money(total)}</span>
            </div>
            <button
              disabled={loading || items.length === 0}
              onClick={async () => {
                if (!isAuthed && discount.amount > 0) {
                  nav({ to: "/login", search: { redirect: "/cart" } as any });
                  return;
                }
                setLoading(true);
                const ok = await startShopifyCheckout(checkoutFn as any, items, userEmail);
                if (!ok) setLoading(false);
              }}
              className="btn-neon w-full rounded-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {!isAuthed && discount.amount > 0
                ? "Sign in to checkout"
                : loading
                ? "Redirecting to Shopify…"
                : "Proceed to Checkout"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
