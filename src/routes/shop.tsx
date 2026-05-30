import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listProducts, getFilterOptions } from "@/lib/products.functions";
import { ProductCard } from "@/components/ProductCard";
import { Search } from "lucide-react";

const search = z.object({
  gender: z.string().optional(),
  product_type: z.string().optional(),
  design_style: z.string().optional(),
  collection: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "best"]).optional(),
  new_drop: z.string().optional(),
  best_seller: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Shop all drops — Electric Pulse Emporium" },
      { name: "description", content: "Browse 90 original neon ravewear designs. Filter by category, style, and color." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const sp = Route.useSearch();
  const nav = useNavigate({ from: "/shop" });

  const { data: opts } = useQuery({ queryKey: ["filter-opts"], queryFn: () => getFilterOptions() });
  const { data, isLoading } = useQuery({
    queryKey: ["shop", sp],
    queryFn: () => listProducts({ data: {
      gender: sp.gender,
      product_type: sp.product_type,
      design_style: sp.design_style,
      collection: sp.collection,
      search: sp.q,
      sort: sp.sort,
      new_drop: sp.new_drop === "1",
      best_seller: sp.best_seller === "1",
    } }),
  });

  const update = (patch: Record<string, any>) => nav({ search: (prev) => ({ ...prev, ...patch }) as any });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--lime)]">Catalog</p>
          <h1 className="font-display text-4xl md:text-6xl font-black">All drops</h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            defaultValue={sp.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            placeholder="Search prints, styles, vibes..."
            className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[color:var(--lime)]"
          />
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <FilterGroup label="Gender" current={sp.gender} options={[{slug:"men",name:"Men"},{slug:"women",name:"Women"},{slug:"accessories",name:"Accessories"}]} onPick={(v)=>update({gender:v})} />
          <FilterGroup label="Type" current={sp.product_type} options={opts?.types ?? []} onPick={(v)=>update({product_type:v})} />
          <FilterGroup label="Style" current={sp.design_style} options={opts?.styles ?? []} onPick={(v)=>update({design_style:v})} />
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[color:var(--lime)] mb-2">Sort</h4>
            <select
              value={sp.sort ?? "newest"}
              onChange={(e) => update({ sort: e.target.value })}
              className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="best">Best sellers</option>
            </select>
          </div>
          <button onClick={() => nav({ search: {} })} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-[color:var(--magenta)]">Clear all</button>
        </aside>

        <div>
          {isLoading && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=>(<div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse" />))}</div>}
          {!isLoading && (data?.products?.length ?? 0) === 0 && <p className="text-muted-foreground py-20 text-center">No drops match those filters.</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(data?.products ?? []).map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
          {!isLoading && <p className="mt-8 text-xs text-muted-foreground">{data?.products?.length ?? 0} drops</p>}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, current, options, onPick }: { label: string; current?: string; options: { slug: string; name: string }[]; onPick: (v: string | undefined) => void }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-widest text-[color:var(--lime)] mb-2">{label}</h4>
      <div className="flex flex-col gap-1">
        <button onClick={() => onPick(undefined)} className={`text-left text-sm px-2 py-1 rounded hover:bg-white/5 ${!current ? "text-[color:var(--cyan)]" : "text-foreground/70"}`}>All</button>
        {options.map((o) => (
          <button key={o.slug} onClick={() => onPick(o.slug)} className={`text-left text-sm px-2 py-1 rounded hover:bg-white/5 ${current === o.slug ? "text-[color:var(--cyan)] font-semibold" : "text-foreground/70"}`}>{o.name}</button>
        ))}
      </div>
    </div>
  );
}
