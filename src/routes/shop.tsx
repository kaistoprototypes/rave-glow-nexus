import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { listShopifyProducts, getShopifyFilterOptions } from "@/lib/shopify-products.functions";
import { ProductCard } from "@/components/ProductCard";
import { Search, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { useProductLimit } from "@/hooks/use-mobile";

const search = z.object({
  gender: z.string().optional(),
  product_type: z.string().optional(),
  design_style: z.string().optional(),
  collection: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "best"]).optional(),
  new_drop: z.string().optional(),
  best_seller: z.string().optional(),
  page: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Shop all drops — Electric Pulse Emporium" },
      { name: "description", content: "Browse original neon ravewear designs. Filter by category, style, and color." },
    ],
  }),
  component: Shop,
});

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price: low → high",
  price_desc: "Price: high → low",
  best: "Best sellers",
};

function Shop() {
  const sp = Route.useSearch();
  const nav = useNavigate({ from: "/shop" });
  const limit = useProductLimit();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const { data: opts } = useQuery({ queryKey: ["shopify-filter-opts"], queryFn: () => getShopifyFilterOptions() });
  const { data, isLoading } = useQuery({
    queryKey: ["shopify-shop", sp],
    queryFn: () => listShopifyProducts({ data: {
      gender: sp.gender,
      product_type: sp.product_type,
      design_style: sp.design_style,
      collection: sp.collection,
      search: sp.q,
      sort: sp.sort,
      new_drop: sp.new_drop === "1",
      best_seller: sp.best_seller === "1",
      limit: 120,
    } }),
  });

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const products = data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / limit));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;
  const paginated = products.slice(start, start + limit);

  const goPage = (p: number) => nav({ search: (prev: any) => ({ ...prev, page: p === 1 ? undefined : String(p) }) as any });
  const update = (patch: Record<string, any>) => {
    nav({ search: (prev: any) => ({ ...prev, page: undefined, ...patch }) as any });
    setOpenKey(null);
  };

  const genderOpts = [{ slug: "men", name: "Men" }, { slug: "women", name: "Women" }, { slug: "accessories", name: "Accessories" }];
  const sortOpts = [
    { slug: "newest", name: "Newest" },
    { slug: "price_asc", name: "Price: low → high" },
    { slug: "price_desc", name: "Price: high → low" },
    { slug: "best", name: "Best sellers" },
  ];

  const labelFor = (list: { slug: string; name: string }[], val?: string) =>
    list.find((o) => o.slug === val)?.name;

  const hasFilters = !!(sp.gender || sp.product_type || sp.design_style || sp.sort);

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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterDropdown
          name="gender"
          label="Gender"
          activeLabel={labelFor(genderOpts, sp.gender)}
          options={genderOpts}
          current={sp.gender}
          openKey={openKey}
          setOpenKey={setOpenKey}
          onPick={(v) => update({ gender: v })}
        />
        <FilterDropdown
          name="type"
          label="Type"
          activeLabel={labelFor(opts?.types ?? [], sp.product_type)}
          options={opts?.types ?? []}
          current={sp.product_type}
          openKey={openKey}
          setOpenKey={setOpenKey}
          onPick={(v) => update({ product_type: v })}
        />
        <FilterDropdown
          name="style"
          label="Style"
          activeLabel={labelFor(opts?.styles ?? [], sp.design_style)}
          options={opts?.styles ?? []}
          current={sp.design_style}
          openKey={openKey}
          setOpenKey={setOpenKey}
          onPick={(v) => update({ design_style: v })}
        />
        <FilterDropdown
          name="sort"
          label="Sort"
          activeLabel={sp.sort ? SORT_LABELS[sp.sort] : undefined}
          options={sortOpts}
          current={sp.sort}
          openKey={openKey}
          setOpenKey={setOpenKey}
          onPick={(v) => update({ sort: v })}
          showAllOption={false}
        />
        {hasFilters && (
          <button
            onClick={() => { nav({ search: {} }); setOpenKey(null); }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:border-[color:var(--magenta)] hover:text-[color:var(--magenta)] transition"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div>
        {isLoading && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({length: limit}).map((_,i)=>(<div key={i} className="aspect-square rounded-2xl bg-muted/30 animate-pulse" />))}</div>}
        {!isLoading && products.length === 0 && <p className="text-muted-foreground py-20 text-center">No drops match those filters.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginated.map((p: any) => <ProductCard key={p.id} p={p} />)}
        </div>
        {!isLoading && products.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{products.length} drops · Page {currentPage} / {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={currentPage <= 1} onClick={() => goPage(currentPage - 1)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs uppercase tracking-wider hover:border-[color:var(--cyan)] disabled:opacity-30 transition">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => goPage(currentPage + 1)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs uppercase tracking-wider hover:border-[color:var(--cyan)] disabled:opacity-30 transition">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterDropdown({
  name, label, activeLabel, options, current, openKey, setOpenKey, onPick, showAllOption = true,
}: {
  name: string;
  label: string;
  activeLabel?: string;
  options: { slug: string; name: string }[];
  current?: string;
  openKey: string | null;
  setOpenKey: (v: string | null) => void;
  onPick: (v: string | undefined) => void;
  showAllOption?: boolean;
}) {
  const isOpen = openKey === name;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenKey(null); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, setOpenKey]);

  const active = !!current;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpenKey(isOpen ? null : name)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider transition ${active ? "border-[color:var(--cyan)] text-[color:var(--cyan)]" : "border-border text-foreground/80 hover:border-[color:var(--lime)]"}`}
      >
        <span>{label}{activeLabel ? `: ${activeLabel}` : ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-[180px] rounded-xl border border-border bg-background/95 backdrop-blur shadow-xl p-1 max-h-72 overflow-y-auto">
          {showAllOption && (
            <button
              onClick={() => onPick(undefined)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 ${!current ? "text-[color:var(--cyan)]" : "text-foreground/80"}`}
            >
              All
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.slug}
              onClick={() => onPick(o.slug)}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 ${current === o.slug ? "text-[color:var(--cyan)] font-semibold" : "text-foreground/80"}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
