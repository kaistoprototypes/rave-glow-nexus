import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping — Electric Pulse Emporium" },
      { name: "description", content: "Shipping information for Electric Pulse Emporium orders." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <div className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-black text-neon">Shipping</h1>
          <p className="text-muted-foreground">How we get your gear from the floor to your door.</p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Made to Order</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every item at Electric Pulse Emporium is made to order. We do not hold bulk inventory — each piece is produced specifically for you once your order is placed. This keeps our designs fresh, reduces waste, and lets us offer original artwork at a fair price.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Production & Fulfillment</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We partner with trusted manufacturing facilities to produce and fulfill orders on demand. Outsourcing production allows us to keep costs low and pass those savings directly on to you, while maintaining quality control on every print and stitch.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>Production time: 3–7 business days</li>
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>Standard shipping: 7–15 business days worldwide</li>
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>Express shipping: 3–7 business days (select at checkout)</li>
          </ul>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Tracking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You will receive a shipping confirmation email with tracking details as soon as your order leaves the facility. If you do not see it within 10 business days, check your spam folder or reach out via our Contact page.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Customs & Duties</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            International orders may be subject to customs fees, import duties, or taxes depending on your country. These charges are the responsibility of the buyer and are not included in the item or shipping price.
          </p>
        </div>
      </div>
    </div>
  );
}
