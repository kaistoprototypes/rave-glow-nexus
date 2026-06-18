import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, RotateCcw, Mail, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Electric Pulse Emporium" },
      { name: "description", content: "Shipping, returns, contact, and FAQ for Electric Pulse Emporium." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const links = [
    {
      to: "/shipping",
      icon: Truck,
      title: "Shipping",
      desc: "Production times, delivery estimates, tracking, and customs info.",
    },
    {
      to: "/returns",
      icon: RotateCcw,
      title: "Returns & Refunds",
      desc: "Our made-to-order policy, why returns are not accepted, and defective item replacements.",
    },
    {
      to: "/contact",
      icon: Mail,
      title: "Contact",
      desc: "Reach our support team for order questions and general inquiries.",
    },
    {
      to: "/faq",
      icon: HelpCircle,
      title: "FAQ",
      desc: "Quick answers about orders, sizing, designs, and delivery.",
    },
  ];

  return (
    <div className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl md:text-5xl font-black text-neon">Help Center</h1>
          <p className="text-muted-foreground">Everything you need to know about ordering from the floor.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="card-glow rounded-2xl p-6 md:p-8 group flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <l.icon className="h-6 w-6 text-[color:var(--lime)]" />
                <h2 className="font-display text-xl font-bold group-hover:text-neon transition-colors">{l.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{l.desc}</p>
              <span className="mt-auto pt-2 text-xs uppercase tracking-widest text-[color:var(--cyan)] group-hover:translate-x-2 transition-transform">Learn more →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
