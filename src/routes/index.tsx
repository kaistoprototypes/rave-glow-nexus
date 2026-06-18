import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getShopifyHomeData } from "@/lib/shopify-products.functions";
import { ProductCard } from "@/components/ProductCard";
import { useProductLimit } from "@/hooks/use-mobile";
import { PromoBanner } from "@/components/PromoBanner";
import { Sparkles, Zap, Flame, Music4 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Electric Pulse Emporium — Neon Festival Ravewear & After-Dark Streetwear" },
      { name: "description", content: "Original neon ravewear designs. Cosmic carnival prints, desert lights graphics, bass night essentials. Shop now." },
      { property: "og:title", content: "Electric Pulse Emporium — Neon Festival Ravewear" },
      { property: "og:description", content: "Original neon ravewear designed for the floor. Men, women, and accessories." },
    ],
  }),
  component: Home,
});

function Home() {
  const limit = useProductLimit();
  const { data, isLoading } = useQuery({
    queryKey: ["shopify-home"],
    queryFn: () => getShopifyHomeData(),
  });

  return (
    <>
      <PromoBanner />
      <section className="relative overflow-hidden px-4 pt-10 pb-20 md:pt-20 md:pb-32">
        <div className="mx-auto max-w-7xl grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--lime)]" /> New cosmic carnival drop
            </div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight">
              Dressed for <span className="animate-neon-pulse">after dark.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Ninety original ravewear designs engineered for desert lights, bass nights, and electric weekends.
              No copycat artwork, no protected logos — just our own neon.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/shop" className="btn-neon rounded-full px-7 py-3 text-sm">Shop the drops</Link>
              <Link to="/shop" search={{ new_drop: "1" } as any} className="btn-outline-neon rounded-full px-7 py-3 text-sm">New arrivals</Link>
            </div>
            <div className="flex gap-6 pt-4 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[color:var(--cyan)]" /> Worldwide shipping</span>
              <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-[color:var(--magenta)]" /> Limited runs</span>
            </div>
          </div>

          <div className="relative h-[520px] hidden md:block animate-fade-up">
            <div className="absolute inset-0 grid grid-cols-2 gap-4">
              {(data?.featured ?? []).slice(0, limit).map((p: any, i: number) => (
                <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className={`card-glow rounded-2xl overflow-hidden group ${i % 2 ? "translate-y-8" : ""}`}>
                  <div className="aspect-square relative">
                    {p.featured_image ? (
                      <img
                        src={p.featured_image}
                        alt={p.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ProductArtTiny palette={p.color_palette} name={p.name} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
                      <p className="font-display text-sm font-bold text-white line-clamp-2">{p.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="absolute -inset-20 -z-10 bg-[radial-gradient(circle_at_center,#39FF1444,transparent_60%)] animate-pulse-glow" />
          </div>
        </div>
      </section>

      <div className="border-y border-border/40 glass py-4 overflow-hidden">
        <div className="flex gap-12 animate-marquee whitespace-nowrap font-display text-xl font-black uppercase tracking-widest">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-12 shrink-0">
              {["Cosmic Carnival", "Desert Lights", "Bass Night", "Electric Weekend", "After-Dark", "Liquid Marble", "Glow Tribe"].map((t) => (
                <span key={t} className="text-neon"><Music4 className="inline h-5 w-5 mr-2 text-[color:var(--cyan)]" />{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Section title="Featured drops" subtitle="Hand-picked for the floor" items={data?.featured ?? []} loading={isLoading} />
      <Section title="Best sellers" subtitle="What the crew is wearing" items={data?.bestSellers ?? []} loading={isLoading} />
      <Section title="New arrivals" subtitle="Fresh off the press" items={data?.newDrops ?? []} loading={isLoading} />

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl grid gap-4 md:grid-cols-3">
          {[
            { t: "Men", s: "Tees, hoodies, shorts", to: "men" },
            { t: "Women", s: "Crops, tops, bottoms", to: "women" },
            { t: "Accessories", s: "Bags, hats, glasses", to: "accessories" },
          ].map((c) => (
            <Link key={c.to} to="/shop" search={{ gender: c.to } as any} className="card-glow rounded-2xl p-6 md:p-8 group">
              <p className="text-xs uppercase tracking-widest text-[color:var(--lime)]">Shop</p>
              <h3 className="mt-1 font-display text-2xl md:text-3xl font-black group-hover:text-neon">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.s}</p>
              <span className="mt-4 inline-block text-sm uppercase tracking-widest text-[color:var(--cyan)] group-hover:translate-x-2 transition-transform">Enter →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Section({ title, subtitle, items, loading }: { title: string; subtitle: string; items: any[]; loading: boolean }) {
  const limit = useProductLimit();
  const maxItems = limit;
  return (
    <section className="px-4 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--lime)]">{subtitle}</p>
            <h2 className="font-display text-3xl md:text-5xl font-black">{title}</h2>
          </div>
          <Link to="/shop" className="text-xs uppercase tracking-widest text-[color:var(--cyan)] hover:text-[color:var(--lime)]">View all →</Link>
        </div>
        {loading && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length: limit}).map((_,i)=>(<div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse" />))}</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.slice(0, maxItems).map((p) => (<ProductCard key={p.id} p={p as any} />))}
        </div>
      </div>
    </section>
  );
}

function ProductArtTiny({ palette, name }: { palette: string[]; name: string }) {
  // Lightweight inline preview, avoids prop drilling style
  const [c1, c2, c3] = palette;
  return (
    <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}55, ${c3}66)` }}>
      <div className="h-full w-full flex items-end p-4">
        <p className="font-display text-xl font-black text-white/90 line-clamp-2">{name}</p>
      </div>
    </div>
  );
}
