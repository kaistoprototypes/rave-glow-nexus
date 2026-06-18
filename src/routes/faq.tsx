import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Electric Pulse Emporium" },
      { name: "description", content: "Frequently asked questions about Electric Pulse Emporium orders, shipping, and products." },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  const faqs = [
    {
      q: "How long until my order ships?",
      a: "Every item is made to order. Production takes 3–7 business days, plus shipping time. You will get a tracking email once it ships.",
    },
    {
      q: "Do you accept returns or refunds?",
      a: "All sales are final. Because each product is made to order, we cannot offer refunds or accept returns for change of mind. We can only replace items that arrive damaged or defective.",
    },
    {
      q: "Why is production outsourced?",
      a: "We partner with manufacturing facilities to produce each piece on demand. Outsourcing keeps our costs low and allows us to offer original designs at accessible prices without holding bulk inventory.",
    },
    {
      q: "Where do you ship?",
      a: "We ship worldwide. Standard delivery typically takes 7–15 business days. Express options are available at checkout for most regions.",
    },
    {
      q: "Are your designs original?",
      a: "Yes. Every print is created in-house. No protected logos, no copycat artwork — just original neon festival and after-dark streetwear.",
    },
    {
      q: "How do I track my order?",
      a: "Once your order ships, you will receive an email with a tracking link. If you do not see it within 10 business days of ordering, check your spam folder or contact us.",
    },
    {
      q: "Can I cancel or change my order?",
      a: "Orders enter production immediately after payment. Because items are made to order, we cannot guarantee cancellations or changes. Contact us as soon as possible and we will do our best if production has not yet started.",
    },
  ];

  return (
    <div className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-black text-neon">FAQ</h1>
          <p className="text-muted-foreground">Quick answers to common questions.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="card-glow rounded-2xl p-6 md:p-8">
              <h3 className="font-display text-lg font-bold text-[color:var(--lime)] mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
