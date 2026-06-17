import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Pencil, Loader2 } from "lucide-react";
import { listShopifyProductsForAdmin } from "@/lib/shopify-admin.functions";
import { ProductEditDrawer } from "./ProductEditDrawer";

export function ShopifyProductsPanel() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const qc = useQueryClient();
  const listFn = useServerFn(listShopifyProductsForAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shopify-products", search],
    queryFn: () => listFn({ data: { search } }),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Shopify products..."
            className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Live from Shopify. Edits sync to your store immediately.
        </p>
      </div>

      <div className="card-glow rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3 w-16"></th>
              <th className="p-3">Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Price</th>
              <th className="p-3">Variants</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {data?.products?.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                  No products in Shopify yet.
                </td>
              </tr>
            )}
            {data?.products?.map((p) => (
              <tr key={p.id} className="border-t border-border/30">
                <td className="p-3">
                  {p.image ? (
                    <img src={p.image} alt="" className="h-10 w-10 rounded object-cover bg-white" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </td>
                <td className="p-3 font-semibold">{p.title}</td>
                <td className="p-3 text-xs text-muted-foreground">{p.product_type || "—"}</td>
                <td className="p-3 font-bold text-[color:var(--lime)]">
                  {p.min_price ? `$${p.min_price}` : "—"}
                </td>
                <td className="p-3 text-xs">{p.variant_count}</td>
                <td className="p-3 text-xs">{p.status}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setEditing(p.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--magenta)] px-3 py-1 text-[10px] font-bold uppercase text-white"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductEditDrawer
        open={!!editing}
        onClose={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["admin-shopify-products"] });
        }}
        productId={editing ?? undefined}
      />
    </>
  );
}
