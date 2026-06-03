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
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const add = useCart((s) => s.add);
  const price = Number(p.price);
  const compare = p.compare_at_price ? Number(p.compare_at_price) : null;

  return (
    <div className="group card-glow rounded-2xl overflow-hidden">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block relative">
        <div className="aspect-square overflow-hidden">
          <ProductArt palette={p.color_palette} name={p.name} style={p.design_style ?? ""} className="h-full w-full transition-transform duration-700 group-hover:scale-110" />
        </div>
        <div className="absolute top-2 left-2 flex gap-1.5">
          {p.is_new_drop && <span className="rounded-full bg-[color:var(--lime)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">New</span>}
          {p.is_best_seller && <span className="rounded-full bg-[color:var(--magenta)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Best</span>}
          {compare && <span className="rounded-full bg-[color:var(--orange)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">Sale</span>}
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{p.product_type} · {p.gender}</p>
          <div className="flex items-center gap-1">
            {compare && <span className="text-xs line-through text-muted-foreground">{money(compare)}</span>}
            <span className="text-sm font-bold text-[color:var(--cyan)]">{money(price)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {p.sold_count && Number(p.sold_count) > 0 ? (
              <><strong className="text-foreground">{Number(p.sold_count).toLocaleString()}</strong> sold</>
            ) : null}
          </span>
          <button
            onClick={() =>
              add({
                productId: p.id,
                slug: p.slug,
                name: p.name,
                price,
                quantity: 1,
                size: p.sizes?.[2] ?? p.sizes?.[0],
                color: p.colors?.[0],
                image_palette: p.color_palette,
              })
            }
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[color:var(--lime)] px-3 text-xs font-bold uppercase text-black ring-glow-lime hover:brightness-110 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
