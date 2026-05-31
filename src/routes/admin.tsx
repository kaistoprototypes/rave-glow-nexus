import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListProducts, adminUpdateProduct, adminBulkPrice,
  adminListOrders, adminGenerateProductCopy, adminApplyAiCopy,
} from "@/lib/admin.functions";
import { money } from "@/lib/format";
import { Loader2, Sparkles, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminNotificationsPanel } from "@/components/AdminNotificationsPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Electric Pulse Emporium" }] }),
  component: Admin,
});

function Admin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"products"|"orders"|"tools"|"notifications">("products");
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
  const bulkFn = useServerFn(adminBulkPrice);
  const ordersFn = useServerFn(adminListOrders);
  const aiGenFn = useServerFn(adminGenerateProductCopy);
  const aiApplyFn = useServerFn(adminApplyAiCopy);

  const { data: prods } = useQuery({ queryKey: ["admin-products", search], queryFn: () => listFn({ data: { search } }), enabled: ready && tab==="products" });
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: () => ordersFn(), enabled: ready && tab==="orders" });

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--magenta)]">Admin</p>
          <h1 className="font-display text-4xl md:text-5xl font-black">Control room</h1>
        </div>
        <nav className="flex gap-1 rounded-full glass p-1">
          {(["products","orders","tools","notifications"] as const).map((t) => (
            <button key={t} onClick={()=>setTab(t)} className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${tab===t ? "bg-[color:var(--lime)] text-black font-bold" : "text-foreground/70 hover:text-foreground"}`}>{t}</button>
          ))}
        </nav>
      </header>

      {tab === "products" && (
        <>
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm" />
          </div>
          <div className="card-glow rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Flags</th><th className="p-3">Status</th><th className="p-3">AI</th></tr>
              </thead>
              <tbody>
                {prods?.products?.map((p: any) => (
                  <AdminRow key={p.id} p={p} onPrice={updatePrice} onToggle={togglePatch} onAi={async () => {
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
        <div className="card-glow rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="p-3">Order</th><th className="p-3">Email</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {orders?.orders?.map((o: any) => (
                <tr key={o.id} className="border-t border-border/30">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0,8).toUpperCase()}</td>
                  <td className="p-3">{o.email}</td>
                  <td className="p-3 font-bold text-[color:var(--lime)]">{money(Number(o.total))}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs uppercase ${o.status==="paid" ? "bg-[color:var(--lime)]/20 text-[color:var(--lime)]" : "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "tools" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-glow rounded-2xl p-6">
            <h3 className="font-display text-xl font-bold uppercase tracking-widest mb-3">Bulk price adjust</h3>
            <p className="text-sm text-muted-foreground mb-4">Apply a percentage change to every product price.</p>
            <div className="flex gap-2">
              <button onClick={()=>runBulk(10)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">+10%</button>
              <button onClick={()=>runBulk(-10)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">-10%</button>
              <button onClick={()=>runBulk(-25)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">-25% Sale</button>
            </div>
          </div>
          <div className="card-glow rounded-2xl p-6">
            <h3 className="font-display text-xl font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[color:var(--lime)]" />AI assistant</h3>
            <p className="text-sm text-muted-foreground">Use the ✨ button on each product row to regenerate descriptions, design story, and SEO with Lovable AI.</p>
          </div>
        </div>
      )}

      {tab === "notifications" && <AdminNotificationsPanel />}
    </div>
  );
}

function AdminRow({ p, onPrice, onToggle, onAi }: any) {
  const [price, setPrice] = useState(String(p.price));
  const [busy, setBusy] = useState(false);
  return (
    <tr className="border-t border-border/30">
      <td className="p-3 max-w-xs">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="text-xs text-muted-foreground">{p.product_type} · {p.gender}</div>
      </td>
      <td className="p-3">
        <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} onBlur={()=>onPrice(p.id, Number(price))} className="w-20 rounded-md bg-input/60 border border-border px-2 py-1 text-sm" />
      </td>
      <td className="p-3 space-x-1">
        <Pill on={p.is_featured} onClick={()=>onToggle(p.id, { is_featured: !p.is_featured })}>Feat</Pill>
        <Pill on={p.is_best_seller} onClick={()=>onToggle(p.id, { is_best_seller: !p.is_best_seller })}>Best</Pill>
        <Pill on={p.is_new_drop} onClick={()=>onToggle(p.id, { is_new_drop: !p.is_new_drop })}>New</Pill>
      </td>
      <td className="p-3">
        <select value={p.status} onChange={(e)=>onToggle(p.id, { status: e.target.value })} className="rounded-md bg-input/60 border border-border px-2 py-1 text-xs">
          <option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option>
        </select>
      </td>
      <td className="p-3">
        <button onClick={async()=>{ setBusy(true); try { await onAi(); } finally { setBusy(false); } }} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--magenta)] px-3 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-50" disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Gen
        </button>
      </td>
    </tr>
  );
}

function Pill({ on, onClick, children }: any) {
  return <button onClick={onClick} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${on ? "bg-[color:var(--lime)] text-black" : "bg-muted text-muted-foreground"}`}>{children}</button>;
}
