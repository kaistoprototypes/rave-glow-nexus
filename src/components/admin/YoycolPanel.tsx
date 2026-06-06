import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  yoycolListProductTemplates, yoycolPing, yoycolGetTemplate,
  yoycolListMappings, yoycolSaveMapping, yoycolDeleteMapping,
  yoycolImportTemplate, yoycolMarkPush,
  yoycolListOrders, yoycolSyncOrder, yoycolSyncAll, yoycolSubmitOrder,
} from "@/lib/yoycol.functions";
import { adminListProducts } from "@/lib/admin.functions";
import { Loader2, Plug, Search, Trash2, Download, Upload, RefreshCw, Link2, Send } from "lucide-react";
import { toast } from "sonner";

export function YoycolPanel() {
  const [section, setSection] = useState<"templates"|"mappings"|"orders">("templates");
  return (
    <div className="space-y-6">
      <Header />
      <nav className="flex gap-1 rounded-full glass p-1 w-fit">
        {(["templates","mappings","orders"] as const).map((s) => (
          <button key={s} onClick={()=>setSection(s)} className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${section===s ? "bg-[color:var(--lime)] text-black font-bold" : "text-foreground/70 hover:text-foreground"}`}>{s}</button>
        ))}
      </nav>
      {section === "templates" && <TemplatesSection />}
      {section === "mappings" && <MappingsSection />}
      {section === "orders" && <OrdersSection />}
    </div>
  );
}

function Header() {
  const pingFn = useServerFn(yoycolPing);
  const ping = useMutation({
    mutationFn: () => pingFn(),
    onSuccess: (r) => (r.ok ? toast.success("Yoycol connected") : toast.error(`Yoycol: ${r.msg} (${r.code})`)),
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="card-glow rounded-2xl p-6 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h3 className="font-display text-xl font-bold uppercase tracking-widest">Yoycol Print-On-Demand</h3>
        <p className="text-xs text-muted-foreground mt-1">HMAC-signed OpenAPI v4. Orders auto-create on Stripe payment success.</p>
      </div>
      <button onClick={()=>ping.mutate()} disabled={ping.isPending} className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">
        {ping.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
        Test connection
      </button>
    </div>
  );
}

// ---------- Templates: list + import ----------
function TemplatesSection() {
  const listFn = useServerFn(yoycolListProductTemplates);
  const importFn = useServerFn(yoycolImportTemplate);
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["yoycol-templates", keyword, page],
    queryFn: () => listFn({ data: { page, size: 20, keyword: keyword || undefined } }),
  });
  const records: any[] = (data?.data as any)?.records ?? (data?.data as any)?.list ?? [];

  const imp = useMutation({
    mutationFn: (spu_code: string) => importFn({ data: { spu_code } }),
    onSuccess: (r) => { toast.success(`Imported (${r.variant_count} variants)`); qc.invalidateQueries({ queryKey: ["yoycol-mappings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="card-glow rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={keyword} onChange={(e)=>{setPage(1);setKeyword(e.target.value);}} placeholder="Search Yoycol templates…" className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <button onClick={()=>refetch()} className="btn-outline-neon rounded-full px-4 py-2 text-xs"><RefreshCw className="inline h-3 w-3 mr-1" />Refresh</button>
      </div>
      {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{(error as Error).message}</div>}
      {isFetching ? <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</div>
       : records.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">No templates. Test connection to verify credentials.</p>
       : <div className="grid gap-2">
          {records.map((r, i) => {
            const spu = r.spuCode ?? r.spu_code ?? r.designCode ?? r.id;
            return (
              <div key={spu ?? i} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 p-3 text-sm">
                <div className="min-w-0 flex items-center gap-3">
                  {(r.coverImage || r.thumb) && <img src={r.coverImage ?? r.thumb} alt="" className="h-12 w-12 rounded-md object-cover" />}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.designName ?? r.name ?? r.title ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground truncate">{spu}</div>
                  </div>
                </div>
                <button onClick={()=>imp.mutate(String(spu))} disabled={imp.isPending} className="btn-outline-neon rounded-full px-3 py-1 text-[10px] inline-flex items-center gap-1">
                  <Download className="h-3 w-3" /> Import
                </button>
              </div>
            );
          })}
        </div>
      }
      <div className="flex justify-between items-center pt-2">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50">Prev</button>
        <span className="text-xs text-muted-foreground">Page {page}</span>
        <button onClick={()=>setPage(p=>p+1)} disabled={records.length<20} className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

// ---------- Mappings ----------
function MappingsSection() {
  const listMappingsFn = useServerFn(yoycolListMappings);
  const listProductsFn = useServerFn(adminListProducts);
  const delFn = useServerFn(yoycolDeleteMapping);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const { data: mData } = useQuery({ queryKey: ["yoycol-mappings"], queryFn: () => listMappingsFn() });
  const { data: pData } = useQuery({ queryKey: ["yoycol-products-list"], queryFn: () => listProductsFn({ data: { search: "" } }) });
  const products: any[] = (pData as any)?.products ?? [];
  const mappings: any[] = mData?.mappings ?? [];
  const mappedIds = new Set(mappings.map(m => m.product_id));
  const unmapped = products.filter(p => !mappedIds.has(p.id));

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Mapping removed"); qc.invalidateQueries({ queryKey: ["yoycol-mappings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="card-glow rounded-2xl p-6">
        <h4 className="font-display text-lg font-bold uppercase tracking-widest mb-3">Mapped products ({mappings.length})</h4>
        {mappings.length === 0 ? <p className="text-xs text-muted-foreground">No mappings yet. Import a Yoycol template or map an existing product below.</p>
         : <div className="grid gap-2">
            {mappings.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 text-sm">
                {m.cover_image && <img src={m.cover_image} alt="" className="h-12 w-12 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.products?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    SPU: {m.spu_code} · {(m.placements as any[])?.length ?? 0} placements · {Object.keys((m.variant_map as any) ?? {}).length} variants
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted">{m.sync_direction}</span>
                <button onClick={()=>setEditing(m)} className="btn-outline-neon rounded-full px-3 py-1 text-[10px]">Edit</button>
                <button onClick={()=>{ if (confirm("Remove mapping?")) del.mutate(m.id); }} className="rounded-full bg-destructive/20 text-destructive px-2 py-1 text-[10px]"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        }
      </div>

      <div className="card-glow rounded-2xl p-6">
        <h4 className="font-display text-lg font-bold uppercase tracking-widest mb-3">Unmapped products ({unmapped.length})</h4>
        {unmapped.length === 0 ? <p className="text-xs text-muted-foreground">All products are mapped.</p>
         : <div className="grid gap-2 max-h-96 overflow-auto">
          {unmapped.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 text-sm">
              {p.featured_image && <img src={p.featured_image} alt="" className="h-12 w-12 rounded-md object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.product_type} · {p.gender}</div>
              </div>
              <button onClick={()=>setEditing({ product_id: p.id, products: p, spu_code: "", placements: [], variant_map: {}, sync_direction: "manual" })} className="btn-outline-neon rounded-full px-3 py-1 text-[10px] inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Map
              </button>
            </div>
          ))}
        </div>}
      </div>

      {editing && <MappingEditor mapping={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MappingEditor({ mapping, onClose }: { mapping: any; onClose: () => void }) {
  const saveFn = useServerFn(yoycolSaveMapping);
  const pushFn = useServerFn(yoycolMarkPush);
  const getTplFn = useServerFn(yoycolGetTemplate);
  const qc = useQueryClient();

  const [spu, setSpu] = useState<string>(mapping.spu_code ?? "");
  const [placements, setPlacements] = useState<any[]>(mapping.placements ?? []);
  const [variantMap, setVariantMap] = useState<Record<string, any>>((mapping.variant_map as any) ?? {});
  const [syncDir, setSyncDir] = useState<"pull"|"push"|"manual">(mapping.sync_direction ?? "manual");

  const product = mapping.products;
  const productImages: string[] = useMemo(() => {
    return [product?.featured_image, ...(product?.gallery ?? [])].filter(Boolean);
  }, [product]);

  const loadTpl = useMutation({
    mutationFn: (s: string) => getTplFn({ data: { spu_code: s } }),
    onSuccess: (r) => {
      const variants: any[] = (r.variants as any)?.records ?? (r.variants as any)?.list ?? (r.variants as any) ?? [];
      const next: Record<string, any> = { ...variantMap };
      for (const v of variants) {
        const key = `${v.size ?? v.sizeName ?? ""}|${v.color ?? v.colorName ?? ""}`;
        if (!next[key]) next[key] = { sku: v.sku ?? v.skuCode, variant_id: String(v.id ?? v.variantId ?? v.skuCode ?? ""), price: Number(v.price ?? 0) || undefined };
      }
      setVariantMap(next);
      toast.success(`Loaded ${variants.length} variants from Yoycol`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      product_id: mapping.product_id,
      spu_code: spu,
      template_name: mapping.template_name ?? product?.name,
      cover_image: mapping.cover_image ?? product?.featured_image ?? undefined,
      placements: placements as any,
      variant_map: variantMap as any,
      sync_direction: syncDir,
    } }),
    onSuccess: () => { toast.success("Mapping saved"); qc.invalidateQueries({ queryKey: ["yoycol-mappings"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const markPush = useMutation({
    mutationFn: () => pushFn({ data: { product_id: mapping.product_id } }),
    onSuccess: () => { toast.success("Marked for push to Yoycol — mirror design in Yoycol UI"); setSyncDir("push"); },
  });

  const addPlacement = (image_url: string, position = "front") => {
    setPlacements((p) => [...p, { position, image_url, scale: 1, rotation: 0, offset_x: 0, offset_y: 0 }]);
  };

  const variantKeys = Object.keys(variantMap);

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 overflow-auto" onClick={onClose}>
      <div className="card-glow w-full max-w-3xl rounded-2xl p-6 space-y-4 bg-card max-h-[90vh] overflow-auto" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">Map → Yoycol</h3>
            <p className="text-xs text-muted-foreground">{product?.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Yoycol SPU code
            <input value={spu} onChange={(e)=>setSpu(e.target.value)} className="mt-1 w-full rounded-full bg-input/60 border border-border px-4 py-2 text-sm normal-case" placeholder="e.g. AHS001" />
          </label>
          <button onClick={()=>spu && loadTpl.mutate(spu)} disabled={!spu || loadTpl.isPending} className="btn-outline-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">
            {loadTpl.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Load variants
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Design placements</div>
            <button onClick={()=>{ const url = prompt("Design image URL"); if (url) addPlacement(url); }} className="btn-outline-neon rounded-full px-3 py-1 text-[10px]">+ Custom URL</button>
          </div>
          {productImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {productImages.map((u, i) => (
                <button key={i} onClick={()=>addPlacement(u)} className="relative group rounded-md overflow-hidden border border-border/40 hover:border-[color:var(--lime)]">
                  <img src={u} alt="" className="h-20 w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 group-hover:opacity-100 text-[10px] uppercase font-bold">+ Use</span>
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {placements.length === 0 && <p className="text-xs text-muted-foreground">No placements. Pick a product image or paste a design URL.</p>}
            {placements.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-xl border border-border/40 p-2 text-xs">
                <img src={p.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                <select value={p.position} onChange={(e)=>setPlacements(ps=>ps.map((x,i)=>i===idx?{...x,position:e.target.value}:x))} className="rounded-md bg-input/60 border border-border px-2 py-1">
                  {["front","back","left_sleeve","right_sleeve","hood","pocket","inside_label"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <input value={p.image_url} onChange={(e)=>setPlacements(ps=>ps.map((x,i)=>i===idx?{...x,image_url:e.target.value}:x))} className="flex-1 min-w-0 rounded-md bg-input/60 border border-border px-2 py-1 text-[11px]" />
                <button onClick={()=>setPlacements(ps=>ps.filter((_,i)=>i!==idx))} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Variant map (size|color → Yoycol)</div>
          {variantKeys.length === 0 ? <p className="text-xs text-muted-foreground">No variants. Click "Load variants" above, or add one manually.</p>
           : <div className="space-y-1 max-h-48 overflow-auto">
            {variantKeys.map((k) => (
              <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center text-xs">
                <code className="text-muted-foreground truncate">{k || "(default)"}</code>
                <input placeholder="SKU" value={variantMap[k]?.sku ?? ""} onChange={(e)=>setVariantMap(m=>({...m,[k]:{...m[k],sku:e.target.value}}))} className="rounded bg-input/60 border border-border px-2 py-1" />
                <input placeholder="Variant ID" value={variantMap[k]?.variant_id ?? ""} onChange={(e)=>setVariantMap(m=>({...m,[k]:{...m[k],variant_id:e.target.value}}))} className="rounded bg-input/60 border border-border px-2 py-1" />
                <button onClick={()=>setVariantMap(m=>{ const n={...m}; delete n[k]; return n; })} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>}
          <button onClick={()=>{ const k = prompt("Key as size|color (e.g. L|Black)"); if (k!=null) setVariantMap(m=>({...m,[k]:{}})); }} className="mt-2 btn-outline-neon rounded-full px-3 py-1 text-[10px]">+ Variant</button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Sync
            <select value={syncDir} onChange={(e)=>setSyncDir(e.target.value as any)} className="ml-2 rounded-md bg-input/60 border border-border px-2 py-1 text-xs normal-case">
              <option value="manual">manual</option>
              <option value="pull">pull (Yoycol → site)</option>
              <option value="push">push (site → Yoycol)</option>
            </select>
          </label>
          {syncDir !== "push" && (
            <button onClick={()=>markPush.mutate()} className="btn-outline-neon rounded-full px-3 py-1 text-[10px] inline-flex items-center gap-1">
              <Upload className="h-3 w-3" /> Mark as push
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <button onClick={onClose} className="rounded-full bg-muted px-4 py-2 text-xs">Cancel</button>
          <button onClick={()=>save.mutate()} disabled={!spu || save.isPending} className="btn-neon rounded-full px-4 py-2 text-xs">
            {save.isPending ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null} Save mapping
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Orders ----------
function OrdersSection() {
  const listFn = useServerFn(yoycolListOrders);
  const syncOneFn = useServerFn(yoycolSyncOrder);
  const syncAllFn = useServerFn(yoycolSyncAll);
  const submitFn = useServerFn(yoycolSubmitOrder);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["yoycol-orders-admin"], queryFn: () => listFn() });
  const rows: any[] = data?.orders ?? [];

  const syncAll = useMutation({
    mutationFn: () => syncAllFn(),
    onSuccess: (r) => { toast.success(`Synced ${r.count} orders`); qc.invalidateQueries({ queryKey: ["yoycol-orders-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const syncOne = useMutation({
    mutationFn: (id: string) => syncOneFn({ data: { id } }),
    onSuccess: () => { toast.success("Synced"); qc.invalidateQueries({ queryKey: ["yoycol-orders-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const submit = useMutation({
    mutationFn: (order_id: string) => submitFn({ data: { order_id } }),
    onSuccess: (r: any) => { toast.success(r?.yoycol_order_id ? `Submitted ${r.yoycol_order_id}` : "Submitted"); qc.invalidateQueries({ queryKey: ["yoycol-orders-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="card-glow rounded-2xl p-6 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-display text-lg font-bold uppercase tracking-widest">Yoycol fulfillment orders</h4>
        <button onClick={()=>syncAll.mutate()} disabled={syncAll.isPending} className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">
          {syncAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync all
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-2">Order</th><th className="p-2">Yoycol #</th><th className="p-2">Status</th><th className="p-2">Tracking</th><th className="p-2">Updated</th><th className="p-2">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">No Yoycol orders yet. They appear after a customer pays.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 font-mono text-xs">#{r.order_id.slice(0,8).toUpperCase()}<div className="text-[10px] text-muted-foreground">{r.orders?.email}</div></td>
                <td className="p-2 font-mono text-xs">{r.yoycol_order_id ?? "—"}</td>
                <td className="p-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                    r.status === "shipped" || r.status === "delivered" ? "bg-[color:var(--lime)] text-black" :
                    r.status === "error" ? "bg-destructive/20 text-destructive" :
                    r.status === "in_production" ? "bg-[color:var(--magenta)]/30 text-[color:var(--magenta)]" :
                    "bg-muted text-muted-foreground"
                  }`}>{r.status}</span>
                  {r.last_error && <div className="text-[10px] text-destructive mt-1 max-w-xs truncate" title={r.last_error}>{r.last_error}</div>}
                </td>
                <td className="p-2 text-xs">
                  {r.tracking_number ? (
                    r.tracking_url ? <a href={r.tracking_url} target="_blank" rel="noopener noreferrer" className="underline">{r.tracking_number}</a> : r.tracking_number
                  ) : "—"}
                  {r.carrier && <div className="text-[10px] text-muted-foreground">{r.carrier}</div>}
                </td>
                <td className="p-2 text-[10px] text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</td>
                <td className="p-2 space-x-1 whitespace-nowrap">
                  {r.yoycol_order_id ? (
                    <button onClick={()=>syncOne.mutate(r.id)} className="btn-outline-neon rounded-full px-2 py-1 text-[10px]"><RefreshCw className="inline h-3 w-3 mr-1" />Sync</button>
                  ) : (
                    <button onClick={()=>submit.mutate(r.order_id)} className="btn-neon rounded-full px-2 py-1 text-[10px]"><Send className="inline h-3 w-3 mr-1" />Retry submit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
