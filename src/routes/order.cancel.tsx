import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/order/cancel")({
  head: () => ({ meta: [{ title: "Checkout canceled — Electric Pulse Emporium" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <XCircle className="mx-auto h-16 w-16 text-[color:var(--magenta)] glow-magenta" />
      <h1 className="font-display text-4xl font-black mt-6">Checkout canceled</h1>
      <p className="mt-2 text-muted-foreground">Your bag is still saved — pick up where you left off.</p>
      <div className="mt-8 flex gap-3 justify-center">
        <Link to="/cart" className="btn-outline-neon rounded-full px-6 py-2.5 text-xs">Back to bag</Link>
        <Link to="/shop" className="btn-neon rounded-full px-6 py-2.5 text-xs">Keep shopping</Link>
      </div>
    </div>
  ),
});
