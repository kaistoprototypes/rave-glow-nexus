import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetOrderNotificationSettings, adminUpdateOrderNotificationSettings } from "@/lib/notifications.functions";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";

export function AdminNotificationsPanel() {
  const getFn = useServerFn(adminGetOrderNotificationSettings);
  const saveFn = useServerFn(adminUpdateOrderNotificationSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<any>(null);
  const [defaults, setDefaults] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getFn();
        setS(res.settings);
        setDefaults(res.defaults);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [getFn]);

  if (loading || !s) return <div className="text-muted-foreground text-sm">Loading notification settings…</div>;

  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const setList = (k: string, text: string) => set(k, text.split("\n").map((l) => l.trim()).filter(Boolean));
  const setNumList = (k: string, text: string) =>
    set(k, text.split(/[\s,]+/).map((n) => Number(n)).filter((n) => !Number.isNaN(n) && n > 0));

  const setLocations = (text: string) => {
    const rows = text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return { city: parts[0] ?? "", state: parts[1] ?? "", country: parts[2] ?? "" };
    }).filter((r) => r.city && r.state && r.country);
    set("locations", rows);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: s });
      toast.success("Notification settings saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const reset = () => { if (defaults) setS({ ...defaults }); };

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold uppercase tracking-widest">Order popup notifications</h3>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Initial delays (sec, comma)">
            <input className="input" value={s.initial_delays.join(", ")} onChange={(e) => setNumList("initial_delays", e.target.value)} />
            <p className="hint">First popups after page load. Default: 15, 45, 60.</p>
          </Field>
          <Field label="Min interval (sec)">
            <input type="number" className="input" value={s.min_interval} onChange={(e) => set("min_interval", Number(e.target.value))} />
          </Field>
          <Field label="Max interval (sec)">
            <input type="number" className="input" value={s.max_interval} onChange={(e) => set("max_interval", Number(e.target.value))} />
          </Field>
          <Field label="“Last ordered” every Nth popup">
            <input type="number" className="input" value={s.recent_every} onChange={(e) => set("recent_every", Number(e.target.value))} />
            <p className="hint">3 = every 3rd popup shows a recent-order variant.</p>
          </Field>
          <Field label="Display time per popup (ms)">
            <input type="number" className="input" value={s.display_ms} onChange={(e) => set("display_ms", Number(e.target.value))} />
          </Field>
          <Field label="Recent minutes pool (comma)">
            <input className="input" value={s.recent_minutes_pool.join(", ")} onChange={(e) => setNumList("recent_minutes_pool", e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-glow rounded-2xl p-6">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">First names (one per line)</h4>
          <textarea className="input min-h-[180px] font-mono text-xs" value={s.first_names.join("\n")} onChange={(e) => setList("first_names", e.target.value)} />
        </div>
        <div className="card-glow rounded-2xl p-6">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Last initials (one per line)</h4>
          <textarea className="input min-h-[180px] font-mono text-xs" value={s.last_initials.join("\n")} onChange={(e) => setList("last_initials", e.target.value)} />
          <p className="hint">Period is added automatically (e.g. M.)</p>
        </div>
        <div className="card-glow rounded-2xl p-6 md:col-span-2">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Locations</h4>
          <p className="hint mb-2">One per line, format: <code>City | State | Country</code></p>
          <textarea className="input min-h-[200px] font-mono text-xs"
            value={s.locations.map((l: any) => `${l.city} | ${l.state} | ${l.country}`).join("\n")}
            onChange={(e) => setLocations(e.target.value)} />
        </div>
        <div className="card-glow rounded-2xl p-6 md:col-span-2">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Fallback product names (used if catalog is empty)</h4>
          <textarea className="input min-h-[120px] font-mono text-xs" value={s.fallback_products.join("\n")} onChange={(e) => setList("fallback_products", e.target.value)} />
          <p className="hint">Live popups normally pull real active products from the catalog. These are a backup.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save settings
        </button>
        <button onClick={reset} className="btn-outline-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2">
          <RotateCcw className="h-3 w-3" /> Reset to defaults
        </button>
      </div>

      <style>{`
        .input { width:100%; border-radius:0.5rem; background: hsl(var(--input) / 0.6); border:1px solid hsl(var(--border)); padding:0.5rem 0.75rem; font-size: 0.875rem; }
        .hint { font-size: 0.7rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
