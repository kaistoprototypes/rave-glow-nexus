import { Link } from "@tanstack/react-router";
import { ProductArt } from "./ProductArt";
import { money } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { Plus, Heart } from "lucide-react";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  compare_at_price?: number | string | null;
  color_palette: string[];
  design_style?: string | null;
  gender?: string;
  product_type?: string;
  is_new_drop?: boolean;
  is_best_seller?: boolean;
  sizes?: string[];
  colors?: string[];
  sold_count?: number | string;
  featured_image?: string | null;
  total_inventory?: number;
  available_for_sale?: boolean;
  variants?: Array<{ id: string; available: boolean; quantity: number | null; options: Record<string, string> }>;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const add = useCart((s) => s.add);
  const price = Number(p.price);
  const compare = p.compare_at_price ? Number(p.compare_at_price) : null;
  const soldOut = p.available_for_sale === false;
  const lowStock = !soldOut && typeof p.total_inventory === "number" && p.total_inventory > 0 && p.total_inventory <= 5;

  const handleAdd = () => {
    if (soldOut) return;
    const v = (p.variants ?? []).find((v) => v.available) ?? p.variants?.[0];
    add({
      productId: p.id,
      variantId: v?.id,
      slug: p.slug,
      name: p.name,
      price,
      quantity: 1,
      size: v?.options?.Size ?? p.sizes?.[2] ?? p.sizes?.[0],
      color: v?.options?.Color ?? p.colors?.[0],
      image_palette: p.color_palette,
      image_url: p.featured_image ?? undefined,
    });
  };

  return (
    <div className="group card-glow rounded-2xl overflow-hidden">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block relative">
        <div className="aspect-square overflow-hidden bg-muted/20">
          {p.featured_image ? (
            <img src={p.featured_image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <ProductArt palette={p.color_palette} name={p.name} style={p.design_style ?? ""} className="h-full w-full transition-transform duration-700 group-hover:scale-110" />
          )}
        </div>
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {soldOut && <span className="rounded-full bg-black/80 text-white px-2 py-0.5 text-[10px] font-bold uppercase">Sold out</span>}
          {!soldOut && lowStock && <span className="rounded-full bg-[color:var(--orange,#FF6B00)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">Only {p.total_inventory} left</span>}
          {p.is_new_drop && !soldOut && <span className="rounded-full bg-[color:var(--lime)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">New</span>}
          {p.is_best_seller && <span className="rounded-full bg-[color:var(--magenta)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Best</span>}
          {compare && <span className="rounded-full bg-[color:var(--orange,#FF6B00)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">Sale</span>}
        </div>
        <button
          aria-label="wishlist"
          onClick={(e) => { e.preventDefault(); }}
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
        >
          <Heart className="h-4 w-4" />
        </button>
      </Link>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <Link to="/products/$slug" params={{ slug: p.slug }} className="font-display font-bold text-sm tracking-tight hover:text-[color:var(--lime)] transition-colors line-clamp-1">
            {p.name}
          </Link>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider line-clamp-1">{[p.product_type, p.gender].filter(Boolean).join(" · ")}</p>
          <div className="flex items-center gap-1">
            {compare && <span className="text-xs line-through text-muted-foreground">{money(compare)}</span>}
            <span className="text-sm font-bold text-[color:var(--cyan)]">{money(price)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            disabled={soldOut}
            onClick={handleAdd}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[color:var(--lime)] px-3 text-xs font-bold uppercase text-black ring-glow-lime hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> {soldOut ? "Sold out" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
