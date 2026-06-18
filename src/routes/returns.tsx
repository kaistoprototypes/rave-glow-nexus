import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns & Refunds — Electric Pulse Emporium" },
      { name: "description", content: "Returns and refund policy for Electric Pulse Emporium." },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  return (
    <div className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-black text-neon">Returns & Refunds</h1>
          <p className="text-muted-foreground">What to know before you glow.</p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">All Sales Are Final</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Because every product is made to order, we do not offer refunds or accept returns for change of mind, sizing, or fit. Your order is sent into production immediately after purchase, which means we cannot cancel, restock, or resell the item.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Why We Cannot Accept Returns</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our items are outsourced to manufacturing partners specifically to produce each piece on demand at a lower cost. This made-to-order model is what keeps our prices accessible, but it also means returned inventory has no resale channel. We appreciate your understanding.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Damaged or Defective Items</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If your order arrives damaged, misprinted, or defective, contact us within 7 days of delivery with photos and your order number. We will review the issue and arrange a replacement at no extra cost.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Sizing Notes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please refer to the size chart on each product page before ordering. Since every item is produced on demand, we cannot exchange for a different size. If you are between sizes, we recommend sizing up for a relaxed festival fit.
          </p>
        </div>
      </div>
    </div>
  );
}
