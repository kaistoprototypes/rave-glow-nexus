import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getShopifyProductByHandle } from "@/lib/shopify-products.functions";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { Heart, Truck, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Electric Pulse Emporium` },
      { name: "description", content: "Original neon ravewear, designed in-house." },
    ],
  }),
});

type ActiveMedia = { kind: "image"; url: string } | { kind: "video"; url: string } | { kind: "art" };

function ProductPage() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const [size, setSize] = useState<string | undefined>();
  const [active, setActive] = useState<ActiveMedia>({ kind: "art" });
  const [initedFor, setInitedFor] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["shopify-product", slug],
    queryFn: () => getShopifyProductByHandle({ data: { handle: slug } }),
  });

  const p = data?.product;
  const gallery: string[] = p
    ? ((p.gallery && p.gallery.length > 0) ? p.gallery : (p.featured_image ? [p.featured_image] : []))
    : [];
  const videoUrl: string | null = p?.video_url ?? null;

  if (p && initedFor !== p.id) {
    const initial: ActiveMedia = videoUrl
      ? { kind: "video", url: videoUrl }
      : (gallery[0] ? { kind: "image", url: gallery[0] } : { kind: "art" });
    setActive(initial);
    setInitedFor(p.id);
  }

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-20"><div className="h-96 rounded-2xl bg-muted/30 animate-pulse" /></div>;
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black">Drop not found</h1>
        <Link to="/shop" className="btn-neon mt-6 inline-block rounded-full px-6 py-2 text-xs">Back to shop</Link>
      </div>
    );
  }

  const price = Number(p.price);
  const compare = p.compare_at_price ? Number(p.compare_at_price) : null;
  const sizes: string[] = p.sizes ?? [];

  const handleAdd = () => {
    if (sizes.length && !size) { toast.error("Pick a size"); return; }
    add({
      productId: p.id, slug: p.slug, name: p.name, price, quantity: 1,
      size: size ?? sizes[0],
      image_palette: p.color_palette,
    });
    toast.success(`${p.name} added`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 text-xs text-muted-foreground uppercase tracking-widest">
        <Link to="/" className="hover:text-[color:var(--cyan)]">Home</Link> / <Link to="/shop" className="hover:text-[color:var(--cyan)]">Shop</Link> / {p.name}
      </div>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square card-glow rounded-2xl overflow-hidden">
            {active.kind === "video" ? (
              <video src={active.url} controls autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : active.kind === "image" ? (
              <img src={active.url} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <ProductArt palette={p.color_palette} name={p.name} style={p.design_style ?? ""} className="h-full w-full" />
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {videoUrl && (
              <button
                onClick={() => setActive({ kind: "video", url: videoUrl })}
                aria-label="Play hero video"
                className={`relative aspect-square rounded-xl overflow-hidden border transition ${active.kind === "video" ? "border-[color:var(--lime)] ring-2 ring-[color:var(--lime)]/50" : "border-border/40 hover:border-[color:var(--cyan)]"}`}
              >
                <video src={videoUrl} muted className="h-full w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/40 text-white text-[10px] font-bold uppercase">▶ Video</span>
              </button>
            )}
            {gallery.length > 0 ? gallery.slice(0, videoUrl ? 3 : 4).map((url, i) => (
              <button
                key={url + i}
                onClick={() => setActive({ kind: "image", url })}
                aria-label={`View image ${i + 1}`}
                className={`aspect-square rounded-xl overflow-hidden border transition ${active.kind === "image" && active.url === url ? "border-[color:var(--lime)] ring-2 ring-[color:var(--lime)]/50" : "border-border/40 hover:border-[color:var(--cyan)]"}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            )) : !videoUrl && [0,1,2,3].map((i) => (
              <button
                key={i}
                onClick={() => setActive({ kind: "art" })}
                className={`aspect-square rounded-xl overflow-hidden border ${active.kind === "art" ? "border-[color:var(--lime)] ring-2 ring-[color:var(--lime)]/50" : "border-border/40"}`}
              >
                <ProductArt palette={[...p.color_palette].reverse()} name={p.name + i} style={p.design_style ?? ""} className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {p.is_new_drop && <span className="rounded-full bg-[color:var(--lime)] px-3 py-1 text-[10px] font-bold uppercase text-black">New drop</span>}
            {p.is_best_seller && <span className="rounded-full bg-[color:var(--magenta)] px-3 py-1 text-[10px] font-bold uppercase text-white">Best seller</span>}
            {p.design_style && <span className="rounded-full glass px-3 py-1 text-[10px] font-bold uppercase">{p.design_style}</span>}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black">{p.name}</h1>
          <p className="text-muted-foreground">{p.short_description}</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold text-[color:var(--lime)] glow-lime">{money(price)}</span>
            {compare && <span className="text-lg line-through text-muted-foreground">{money(compare)}</span>}
            {p.sold_count > 0 && (
              <span className="text-xs text-muted-foreground">· <strong className="text-foreground">{Number(p.sold_count).toLocaleString()}</strong> sold</span>
            )}
          </div>

          {sizes.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`h-10 min-w-10 rounded-full border px-3 text-xs font-semibold uppercase tracking-wider transition ${size===s ? "border-[color:var(--lime)] bg-[color:var(--lime)]/10 text-[color:var(--lime)]" : "border-border hover:border-[color:var(--cyan)]"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { handleAdd(); open(); }} className="btn-neon flex-1 rounded-full py-3.5 text-sm">Add to bag — {money(price)}</button>
            <button className="btn-outline-neon grid h-12 w-12 place-items-center rounded-full"><Heart className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <Stat icon={<Truck className="h-4 w-4 text-[color:var(--cyan)]" />} t="Free over $80" />
            <Stat icon={<Shield className="h-4 w-4 text-[color:var(--lime)]" />} t="30-day returns" />
            <Stat icon={<Sparkles className="h-4 w-4 text-[color:var(--magenta)]" />} t="Original art" />
          </div>

          {p.long_description && (
            <div className="pt-6 border-t border-border/40">
              <h3 className="font-display text-lg font-bold uppercase tracking-widest text-[color:var(--lime)] mb-2">The drop</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{p.long_description}</p>
            </div>
          )}
          {p.design_story && (
            <div className="pt-6 border-t border-border/40">
              <h3 className="font-display text-lg font-bold uppercase tracking-widest text-[color:var(--magenta)] mb-2">Design story</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{p.design_story}</p>
            </div>
          )}
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display text-3xl font-black mb-6">More from this style</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.related.map((r: any) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, t }: { icon: any; t: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 p-2.5 text-[11px] uppercase tracking-wider">{icon}<span>{t}</span></div>;
}
