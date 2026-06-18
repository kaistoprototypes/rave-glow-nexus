import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Electric Pulse Emporium" },
      { name: "description", content: "Get in touch with Electric Pulse Emporium." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-black text-neon">Contact</h1>
          <p className="text-muted-foreground">Questions? We are here for the crew.</p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Email</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For order questions, sizing help, or general inquiries:
          </p>
          <p className="text-lg font-medium text-[color:var(--cyan)]">support@electricpulseemporium.com</p>
          <p className="text-sm text-muted-foreground">
            We typically respond within 24–48 hours.
          </p>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Before You Write</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>Include your order number if your question is about an existing order</li>
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>Check our Shipping and Returns pages for common questions</li>
            <li className="flex gap-2"><span className="text-[color:var(--cyan)]">→</span>For defective items, attach clear photos showing the issue</li>
          </ul>
        </div>

        <div className="card-glow rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[color:var(--lime)]">Response Hours</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our support team operates Monday through Friday. Messages sent over the weekend or during peak drop periods may take slightly longer, but we read every email and will get back to you as soon as possible.
          </p>
        </div>
      </div>
    </div>
  );
}
