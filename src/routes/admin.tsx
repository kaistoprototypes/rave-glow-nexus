import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListProducts, adminUpdateProduct, adminBulkPrice,
  adminListOrders, adminGenerateProductCopy, adminApplyAiCopy,
  adminCreateProduct, adminDeleteProduct,
  adminUpdateOrder, adminDeleteOrder,
  adminListCoupons, adminUpsertCoupon, adminDeleteCoupon,
} from "@/lib/admin.functions";
import { money } from "@/lib/format";
import { Loader2, Sparkles, Search, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminNotificationsPanel } from "@/components/AdminNotificationsPanel";
import { MediaManagerPanel } from "@/components/MediaManagerPanel";
import { PromotionsPanel } from "@/components/admin/PromotionsPanel";
import { YoycolPanel } from "@/components/admin/YoycolPanel";
import { ShopifyWebhooksPanel } from "@/components/admin/ShopifyWebhooksPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Electric Pulse Emporium" }] }),
  component: Admin,
});

function Admin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"products"|"orders"|"media"|"tools"|"promotions"|"yoycol"|"webhooks"|"notifications">("products");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/login", replace: true }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      if (!roles?.length) { toast.error("Admin access required"); nav({ to: "/account", replace: true }); return; }
      setReady(true);
    })();
  }, [nav]);

  const listFn = useServerFn(adminListProducts);
  const updateFn = useServerFn(adminUpdateProduct);
  const createFn = useServerFn(adminCreateProduct);
  const deleteFn = useServerFn(adminDeleteProduct);
  const bulkFn = useServerFn(adminBulkPrice);
  const ordersFn = useServerFn(adminListOrders);
  const updateOrderFn = useServerFn(adminUpdateOrder);
  const deleteOrderFn = useServerFn(adminDeleteOrder);
  const aiGenFn = useServerFn(adminGenerateProductCopy);
  const aiApplyFn = useServerFn(adminApplyAiCopy);
  const couponsFn = useServerFn(adminListCoupons);
  const upsertCouponFn = useServerFn(adminUpsertCoupon);
  const deleteCouponFn = useServerFn(adminDeleteCoupon);

  const { data: prods } = useQuery({ queryKey: ["admin-products", search], queryFn: () => listFn({ data: { search } }), enabled: ready && tab==="products" });
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: () => ordersFn(), enabled: ready && tab==="orders" });
  const { data: coupons } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => couponsFn(), enabled: ready && tab==="tools" });

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">Loading…</div>;

  const togglePatch = async (id: string, patch: any) => {
    await updateFn({ data: { id, patch } });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const updatePrice = async (id: string, price: number) => {
    await updateFn({ data: { id, patch: { price } } });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const runBulk = async (percent: number) => {
    const res = await bulkFn({ data: { percent } });
    toast.success(`Updated ${res.updated} products`);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEditName = async (id: string, current: string) => {
    const name = prompt("Product name", current);
    if (!name || name === current) return;
    await togglePatch(id, { name });
  };

  const handleEditDesc = async (id: string, current: string | null) => {
    const short_description = prompt("Short description", current ?? "");
    if (short_description == null) return;
    await togglePatch(id, { short_description });
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await updateOrderFn({ data: { id, patch: { status: status as any } } });
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Delete order #${id.slice(0,8).toUpperCase()}? This cannot be undone.`)) return;
    try {
      await deleteOrderFn({ data: { id } });
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--magenta)]">Admin</p>
          <h1 className="font-display text-4xl md:text-5xl font-black">Control room</h1>
        </div>
        <nav className="flex gap-1 rounded-full glass p-1 flex-wrap">
          {(["products","orders","media","tools","promotions","yoycol","webhooks","notifications"] as const).map((t) => (
            <button key={t} onClick={()=>setTab(t)} className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${tab===t ? "bg-[color:var(--lime)] text-black font-bold" : "text-foreground/70 hover:text-foreground"}`}>{t}</button>
          ))}
        </nav>
      </header>

      {tab === "products" && (
        <>
          <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
            <div className="relative max-w-md flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm" />
            </div>
            <CreateProductButton onCreate={async (payload) => {
              try {
                await createFn({ data: payload });
                toast.success("Product created");
                qc.invalidateQueries({ queryKey: ["admin-products"] });
              } catch (e: any) { toast.error(e.message); }
            }} />
          </div>
          <div className="card-glow rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Sold</th><th className="p-3">Inv</th><th className="p-3">Flags</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>
                {prods?.products?.map((p: any) => (
                  <AdminRow key={p.id} p={p}
                    onPrice={updatePrice}
                    onToggle={togglePatch}
                    onEditName={() => handleEditName(p.id, p.name)}
                    onEditDesc={() => handleEditDesc(p.id, p.short_description)}
                    onDelete={() => handleDeleteProduct(p.id, p.name)}
                    onAi={async () => {
                      const t = toast.loading(`Generating copy for ${p.name}...`);
                      try {
                        const { content } = await aiGenFn({ data: { productId: p.id } });
                        await aiApplyFn({ data: { productId: p.id, content } });
                        toast.success("Applied AI copy", { id: t });
                        qc.invalidateQueries({ queryKey: ["admin-products"] });
                      } catch (e: any) { toast.error(e.message, { id: t }); }
                    }} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="card-glow rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="p-3">Order</th><th className="p-3">Email</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {orders?.orders?.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No orders yet.</td></tr>
              )}
              {orders?.orders?.map((o: any) => (
                <tr key={o.id} className="border-t border-border/30">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0,8).toUpperCase()}</td>
                  <td className="p-3">{o.email}</td>
                  <td className="p-3 font-bold text-[color:var(--lime)]">{money(Number(o.total))}</td>
                  <td className="p-3">
                    <select value={o.status} onChange={(e)=>handleUpdateOrderStatus(o.id, e.target.value)} className="rounded-md bg-input/60 border border-border px-2 py-1 text-xs" aria-label={`Status for order ${o.id}`}>
                      {["pending","paid","fulfilled","cancelled","refunded"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <button onClick={()=>handleDeleteOrder(o.id)} className="inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-3 py-1 text-[10px] font-bold uppercase hover:bg-destructive/30" aria-label={`Delete order ${o.id}`}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-glow rounded-2xl p-6">
              <h3 className="font-display text-xl font-bold uppercase tracking-widest mb-3">Bulk price adjust</h3>
              <p className="text-sm text-muted-foreground mb-4">Apply a percentage change to every product price.</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={()=>runBulk(10)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">+10%</button>
                <button onClick={()=>runBulk(-10)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">-10%</button>
                <button onClick={()=>runBulk(-25)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">-25% Sale</button>
                <button onClick={()=>{
                  const pct = Number(prompt("Custom percent (e.g. 15 for +15%, -5 for -5%)") ?? "");
                  if (Number.isFinite(pct) && pct !== 0) runBulk(pct);
                }} className="btn-outline-neon rounded-full px-4 py-2 text-xs">Custom…</button>
              </div>
            </div>
            <div className="card-glow rounded-2xl p-6">
              <h3 className="font-display text-xl font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[color:var(--lime)]" />AI assistant</h3>
              <p className="text-sm text-muted-foreground">Use the ✨ button on each product row to regenerate descriptions, design story, and SEO with Lovable AI.</p>
            </div>
          </div>

          <CouponsPanel
            coupons={coupons?.coupons ?? []}
            onSave={async (data) => {
              try {
                await upsertCouponFn({ data });
                toast.success(data.id ? "Coupon updated" : "Coupon created");
                qc.invalidateQueries({ queryKey: ["admin-coupons"] });
              } catch (e: any) { toast.error(e.message); }
            }}
            onDelete={async (id) => {
              if (!confirm("Delete this coupon?")) return;
              try {
                await deleteCouponFn({ data: { id } });
                toast.success("Coupon deleted");
                qc.invalidateQueries({ queryKey: ["admin-coupons"] });
              } catch (e: any) { toast.error(e.message); }
            }}
          />
        </div>
      )}

      {tab === "media" && <MediaManagerPanel />}
      {tab === "promotions" && <PromotionsPanel />}
      {tab === "yoycol" && <YoycolPanel />}
      {tab === "notifications" && <AdminNotificationsPanel />}
    </div>
  );
}

function AdminRow({ p, onPrice, onToggle, onAi, onEditName, onEditDesc, onDelete }: any) {
  const [price, setPrice] = useState(String(p.price));
  const [sold, setSold] = useState(String(p.sold_count ?? 0));
  const [inv, setInv] = useState(String(p.inventory ?? 0));
  const [busy, setBusy] = useState(false);
  return (
    <tr className="border-t border-border/30 align-top">
      <td className="p-3 max-w-xs">
        <div className="font-semibold truncate flex items-center gap-2">
          {p.name}
          <button onClick={onEditName} className="text-muted-foreground hover:text-foreground" aria-label={`Rename ${p.name}`}><Pencil className="h-3 w-3" /></button>
        </div>
        <div className="text-xs text-muted-foreground">{p.product_type} · {p.gender}</div>
        <button onClick={onEditDesc} className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline">Edit short desc</button>
      </td>
      <td className="p-3">
        <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} onBlur={()=>onPrice(p.id, Number(price))} className="w-20 rounded-md bg-input/60 border border-border px-2 py-1 text-sm" aria-label={`Price for ${p.name}`} />
      </td>
      <td className="p-3">
        <input type="number" min={0} value={sold} onChange={(e)=>setSold(e.target.value)} onBlur={()=>onToggle(p.id, { sold_count: Math.max(0, Number(sold) || 0) })} className="w-20 rounded-md bg-input/60 border border-border px-2 py-1 text-sm" aria-label={`Sold count for ${p.name}`} />
      </td>
      <td className="p-3">
        <input type="number" min={0} value={inv} onChange={(e)=>setInv(e.target.value)} onBlur={()=>onToggle(p.id, { inventory: Math.max(0, Number(inv) || 0) })} className="w-20 rounded-md bg-input/60 border border-border px-2 py-1 text-sm" aria-label={`Inventory for ${p.name}`} />
      </td>
      <td className="p-3 space-x-1 whitespace-nowrap">
        <Pill on={p.is_featured} onClick={()=>onToggle(p.id, { is_featured: !p.is_featured })}>Feat</Pill>
        <Pill on={p.is_best_seller} onClick={()=>onToggle(p.id, { is_best_seller: !p.is_best_seller })}>Best</Pill>
        <Pill on={p.is_new_drop} onClick={()=>onToggle(p.id, { is_new_drop: !p.is_new_drop })}>New</Pill>
        <Pill on={!p.hide_colors} onClick={()=>onToggle(p.id, { hide_colors: !p.hide_colors })} title="Show color options to shoppers">Colors</Pill>
      </td>
      <td className="p-3">
        <select value={p.status} onChange={(e)=>onToggle(p.id, { status: e.target.value })} className="rounded-md bg-input/60 border border-border px-2 py-1 text-xs" aria-label={`Status for ${p.name}`}>
          <option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option>
        </select>
      </td>
      <td className="p-3 space-x-1 whitespace-nowrap">
        <button onClick={async()=>{ setBusy(true); try { await onAi(); } finally { setBusy(false); } }} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--magenta)] px-3 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-50" disabled={busy} aria-label={`Generate AI copy for ${p.name}`}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Gen
        </button>
        <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-3 py-1 text-[10px] font-bold uppercase hover:bg-destructive/30" aria-label={`Delete ${p.name}`}>
          <Trash2 className="h-3 w-3" /> Del
        </button>
      </td>
    </tr>
  );
}

function Pill({ on, onClick, children, title }: any) {
  return <button onClick={onClick} title={title} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${on ? "bg-[color:var(--lime)] text-black" : "bg-muted text-muted-foreground"}`}>{children}</button>;
}

function CreateProductButton({ onCreate }: { onCreate: (p: any) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", price: 49, product_type: "tee", gender: "unisex", status: "draft" as const, short_description: "", inventory: 100 });
  return (
    <>
      <button onClick={()=>setOpen(true)} className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">
        <Plus className="h-3 w-3" /> New product
      </button>
      {open && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={()=>setOpen(false)}>
          <div className="card-glow w-full max-w-lg rounded-2xl p-6 space-y-3 bg-card" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">New product</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">Name<input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")})} /></label>
              <label className="block text-xs">Slug<input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm font-mono" value={form.slug} onChange={(e)=>setForm({...form, slug: e.target.value})} /></label>
              <label className="block text-xs">Price (USD)<input type="number" className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={form.price} onChange={(e)=>setForm({...form, price: Number(e.target.value)})} /></label>
              <label className="block text-xs">Inventory<input type="number" className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={form.inventory} onChange={(e)=>setForm({...form, inventory: Number(e.target.value)})} /></label>
              <label className="block text-xs">Type<input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={form.product_type} onChange={(e)=>setForm({...form, product_type: e.target.value})} /></label>
              <label className="block text-xs">Gender<select className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={form.gender} onChange={(e)=>setForm({...form, gender: e.target.value})}>
                <option value="unisex">unisex</option><option value="women">women</option><option value="men">men</option>
              </select></label>
              <label className="block text-xs sm:col-span-2">Short description<textarea className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" rows={2} value={form.short_description} onChange={(e)=>setForm({...form, short_description: e.target.value})} /></label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setOpen(false)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">Cancel</button>
              <button onClick={async()=>{ await onCreate(form); setOpen(false); setForm({ name: "", slug: "", price: 49, product_type: "tee", gender: "unisex", status: "draft", short_description: "", inventory: 100 }); }} className="btn-neon rounded-full px-4 py-2 text-xs">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CouponsPanel({ coupons, onSave, onDelete }: { coupons: any[]; onSave: (c: any) => void | Promise<void>; onDelete: (id: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState<any | null>(null);
  const blank = { code: "", description: "", percent_off: 10, amount_off: null, usage_limit: null, active: true };
  return (
    <div className="card-glow rounded-2xl p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="font-display text-xl font-bold uppercase tracking-widest">Coupons</h3>
        <button onClick={()=>setEditing({ ...blank })} className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"><Plus className="h-3 w-3" />New coupon</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="py-2">Code</th><th className="py-2">Discount</th><th className="py-2">Usage</th><th className="py-2">Active</th><th className="py-2">Actions</th></tr>
          </thead>
          <tbody>
            {coupons.length === 0 && <tr><td colSpan={5} className="py-4 text-xs text-muted-foreground">No coupons yet.</td></tr>}
            {coupons.map((c: any) => (
              <tr key={c.id} className="border-t border-border/30">
                <td className="py-2 font-mono">{c.code}</td>
                <td className="py-2">{c.percent_off ? `${c.percent_off}% off` : c.amount_off ? money(Number(c.amount_off)) + " off" : "—"}</td>
                <td className="py-2 text-xs text-muted-foreground">{c.times_used ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${c.active ? "bg-[color:var(--lime)]/20 text-[color:var(--lime)]" : "bg-muted text-muted-foreground"}`}>{c.active ? "active" : "off"}</span></td>
                <td className="py-2 space-x-1 whitespace-nowrap">
                  <button onClick={()=>setEditing({ ...c })} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase"><Pencil className="h-3 w-3" />Edit</button>
                  <button onClick={()=>onDelete(c.id)} className="inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-3 py-1 text-[10px] font-bold uppercase hover:bg-destructive/30"><Trash2 className="h-3 w-3" />Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={()=>setEditing(null)}>
          <div className="card-glow w-full max-w-md rounded-2xl p-6 space-y-3 bg-card" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">{editing.id ? "Edit coupon" : "New coupon"}</h3>
            <label className="block text-xs">Code<input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm font-mono uppercase" value={editing.code} onChange={(e)=>setEditing({...editing, code: e.target.value.toUpperCase()})} /></label>
            <label className="block text-xs">Description<input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.description ?? ""} onChange={(e)=>setEditing({...editing, description: e.target.value})} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">% off<input type="number" min={0} max={100} className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.percent_off ?? ""} onChange={(e)=>setEditing({...editing, percent_off: e.target.value ? Number(e.target.value) : null, amount_off: null})} /></label>
              <label className="block text-xs">Amount off<input type="number" min={0} className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.amount_off ?? ""} onChange={(e)=>setEditing({...editing, amount_off: e.target.value ? Number(e.target.value) : null, percent_off: null})} /></label>
              <label className="block text-xs">Usage limit<input type="number" min={1} className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.usage_limit ?? ""} onChange={(e)=>setEditing({...editing, usage_limit: e.target.value ? Number(e.target.value) : null})} /></label>
              <label className="block text-xs">Active<select className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.active ? "y" : "n"} onChange={(e)=>setEditing({...editing, active: e.target.value === "y"})}><option value="y">Yes</option><option value="n">No</option></select></label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={()=>setEditing(null)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">Cancel</button>
              <button onClick={async()=>{
                const payload: any = {
                  id: editing.id,
                  code: editing.code,
                  description: editing.description || null,
                  percent_off: editing.percent_off ?? null,
                  amount_off: editing.amount_off ?? null,
                  usage_limit: editing.usage_limit ?? null,
                  active: !!editing.active,
                };
                await onSave(payload);
                setEditing(null);
              }} className="btn-neon rounded-full px-4 py-2 text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
