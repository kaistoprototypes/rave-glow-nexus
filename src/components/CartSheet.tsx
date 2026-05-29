import { Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { ProductArt } from "./ProductArt";
import { X, Minus, Plus, Trash2 } from "lucide-react";

export function CartSheet() {
  const { items, isOpen, close, setQty, remove, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && <div onClick={close} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-up" />}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md glass border-l border-border/50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/40 p-4">
          <h3 className="font-display text-lg font-bold uppercase tracking-wider">Your bag</h3>
          <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex h-[calc(100%-13rem)] flex-col gap-3 overflow-y-auto p-4">
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-display text-xl">Nothing here yet.</p>
              <Link to="/shop" onClick={close} className="btn-neon mt-6 inline-block rounded-full px-6 py-2 text-xs">Browse drops</Link>
            </div>
          )}
          {items.map((i) => (
            <div key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-3 rounded-lg border border-border/40 p-2 bg-card/50">
              <div className="h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                <ProductArt palette={i.image_palette ?? ["#39FF14", "#00E5FF", "#FF00C8"]} name={i.name} className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <Link to="/products/$slug" params={{ slug: i.slug }} onClick={close} className="text-sm font-bold line-clamp-1 hover:text-[color:var(--lime)]">{i.name}</Link>
                <p className="text-xs text-muted-foreground">{[i.size, i.color].filter(Boolean).join(" · ")}</p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-border/50">
                    <button onClick={() => setQty(i.productId, i.quantity - 1, i.size, i.color)} className="grid h-7 w-7 place-items-center"><Minus className="h-3 w-3" /></button>
                    <span className="px-2 text-xs">{i.quantity}</span>
                    <button onClick={() => setQty(i.productId, i.quantity + 1, i.size, i.color)} className="grid h-7 w-7 place-items-center"><Plus className="h-3 w-3" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[color:var(--cyan)]">{money(i.price * i.quantity)}</span>
                    <button onClick={() => remove(i.productId, i.size, i.color)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/40 p-4 glass space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold text-lg text-[color:var(--lime)] glow-lime">{money(subtotal())}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => { close(); navigate({ to: "/checkout" }); }}
            className="btn-neon w-full rounded-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
          <Link to="/cart" onClick={close} className="block text-center text-xs text-muted-foreground hover:text-foreground">View full bag</Link>
        </div>
      </aside>
    </>
  );
}
