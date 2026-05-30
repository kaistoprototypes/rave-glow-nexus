import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useCart } from "@/lib/cart-store";
import { confirmCheckout } from "@/lib/checkout.functions";
import { money } from "@/lib/format";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/order/success")({
  validateSearch: (s) => z.object({ session_id: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Order confirmed — Electric Pulse Emporium" }] }),
  component: Success,
});

function Success() {
  const { session_id } = Route.useSearch();
  const clear = useCart((s) => s.clear);
  const { data, isLoading } = useQuery({
    queryKey: ["confirm", session_id],
    queryFn: () => confirmCheckout({ data: { session_id: session_id ?? "" } }),
    enabled: !!session_id,
  });

  useEffect(() => { if (data?.order) clear(); }, [data, clear]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      {isLoading && <Loader2 className="h-10 w-10 animate-spin mx-auto text-[color:var(--lime)]" />}
      {!isLoading && data?.order && (
        <>
          <CheckCircle2 className="mx-auto h-16 w-16 text-[color:var(--lime)] glow-lime" />
          <h1 className="font-display text-4xl md:text-5xl font-black mt-6">Order confirmed</h1>
          <p className="mt-2 text-muted-foreground">Thanks — we'll email a receipt to {data.order.email}.</p>
          <div className="card-glow rounded-2xl p-6 mt-8 text-left">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Order</p>
            <p className="font-mono text-sm">#{data.order.id.slice(0, 8).toUpperCase()}</p>
            <p className="mt-3 text-xl font-bold text-[color:var(--lime)]">{money(Number(data.order.total))}</p>
          </div>
          <div className="mt-8 flex gap-3 justify-center">
            <Link to="/account" className="btn-outline-neon rounded-full px-6 py-2.5 text-xs">My orders</Link>
            <Link to="/shop" className="btn-neon rounded-full px-6 py-2.5 text-xs">Keep shopping</Link>
          </div>
        </>
      )}
      {!isLoading && !data?.order && (
        <>
          <h1 className="font-display text-4xl font-black">Order received</h1>
          <p className="mt-2 text-muted-foreground">Your payment is being processed. Check your email shortly.</p>
          <Link to="/shop" className="btn-neon mt-6 inline-block rounded-full px-6 py-2 text-xs">Keep shopping</Link>
        </>
      )}
    </div>
  );
}
