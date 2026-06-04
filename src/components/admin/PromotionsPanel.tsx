import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  adminListPromotions,
  adminUpsertPromotion,
  adminDeletePromotion,
} from "@/lib/promotions.functions";

type Promo = {
  id: string;
  name: string;
  kind: "buy_2_get_1_free" | "buy_1_get_half_off" | "flat_off";
  flat_amount: number | null;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  priority: number;
};

const KIND_LABEL: Record<Promo["kind"], string> = {
  buy_2_get_1_free: "Buy 2 Get 1 Free",
  buy_1_get_half_off: "Buy 1 Get 50% Off",
  flat_off: "Flat $ off",
};

export function PromotionsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPromotions);
  const upsertFn = useServerFn(adminUpsertPromotion);
  const deleteFn = useServerFn(adminDeletePromotion);
  const { data } = useQuery({ queryKey: ["admin-promotions"], queryFn: () => listFn() });
  const promos: Promo[] = (data?.promotions ?? []) as Promo[];
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);

  const activeDates = promos
    .filter((p) => p.enabled)
    .flatMap((p) => {
      const out: Date[] = [];
      const start = new Date(p.starts_at);
      const end = new Date(p.ends_at);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
      return out;
    });

  const save = async (form: Partial<Promo>) => {
    try {
      await upsertFn({
        data: {
          id: form.id,
          name: form.name!,
          kind: form.kind!,
          flat_amount: form.kind === "flat_off" ? Number(form.flat_amount ?? 0) : null,
          starts_at: form.starts_at!,
          ends_at: form.ends_at!,
          enabled: form.enabled ?? true,
          priority: Number(form.priority ?? 0),
        },
      });
      toast.success(form.id ? "Promotion updated" : "Promotion created");
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["active-promotions"] });
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["active-promotions"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-2xl p-6 space-y-3">
        <h3 className="font-display text-xl font-bold uppercase tracking-widest">Always-on rule</h3>
        <p className="text-sm text-muted-foreground">
          <strong className="text-[color:var(--lime)]">Buy 3 Get 1 Free</strong> — auto-applied to every cart, cheapest item free, capped at $45 total discount. (Requires sign-in.)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="card-glow rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">Holiday specials</h3>
            <button
              onClick={() =>
                setEditing({
                  name: "",
                  kind: "buy_2_get_1_free",
                  starts_at: new Date().toISOString().slice(0, 10),
                  ends_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                  enabled: true,
                  priority: 0,
                })
              }
              className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"
            >
              <Plus className="h-3 w-3" /> New promo
            </button>
          </div>
          {promos.length === 0 && (
            <p className="text-xs text-muted-foreground">No promotions yet. Create one to schedule a holiday discount.</p>
          )}
          <div className="space-y-2">
            {promos.map((p) => {
              const now = Date.now();
              const isLive = p.enabled && new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() >= now;
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{p.name}</span>
                      {isLive && <span className="rounded-full bg-[color:var(--lime)] text-black text-[10px] font-bold px-2 py-0.5 uppercase">Live</span>}
                      {!p.enabled && <span className="rounded-full bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 uppercase">Off</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {KIND_LABEL[p.kind]}
                      {p.kind === "flat_off" ? ` ($${p.flat_amount})` : ""}
                      {" · "}
                      {new Date(p.starts_at).toLocaleDateString()} → {new Date(p.ends_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(p)} className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => remove(p.id)} className="rounded-full bg-destructive/20 text-destructive px-3 py-1 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-glow rounded-2xl p-4 h-fit">
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">Calendar</h4>
          <Calendar
            mode="multiple"
            selected={activeDates}
            onSelect={() => {}}
            className="pointer-events-auto"
          />
        </div>
      </div>

      {editing && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <div className="card-glow w-full max-w-md rounded-2xl p-6 space-y-3 bg-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">{editing.id ? "Edit promo" : "New promo"}</h3>
            <label className="block text-xs">Name
              <input className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="block text-xs">Kind
              <select className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Promo["kind"] })}>
                <option value="buy_2_get_1_free">Buy 2 Get 1 Free</option>
                <option value="buy_1_get_half_off">Buy 1 Get 50% Off</option>
                <option value="flat_off">Flat $ off</option>
              </select>
            </label>
            {editing.kind === "flat_off" && (
              <label className="block text-xs">Flat amount ($)
                <input type="number" min={1} max={1000} className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.flat_amount ?? 5} onChange={(e) => setEditing({ ...editing, flat_amount: Number(e.target.value) })} />
              </label>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">Starts
                <input type="date" className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={(editing.starts_at ?? "").slice(0, 10)} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
              </label>
              <label className="block text-xs">Ends
                <input type="date" className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={(editing.ends_at ?? "").slice(0, 10)} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editing.enabled ?? true} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              Enabled
            </label>
            <label className="block text-xs">Priority (higher wins)
              <input type="number" min={0} max={100} className="mt-1 w-full rounded-md bg-input/60 border border-border px-2 py-1.5 text-sm" value={editing.priority ?? 0} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-outline-neon rounded-full px-4 py-2 text-xs">Cancel</button>
              <button onClick={() => save(editing)} className="btn-neon rounded-full px-4 py-2 text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
