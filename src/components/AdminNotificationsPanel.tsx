import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetOrderNotificationSettings,
  adminUpdateOrderNotificationSettings,
  adminListNotificationAuditLogs,
} from "@/lib/notifications.functions";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Play, History } from "lucide-react";
import { buildUniquePopup, OrderPopupCard, type OrderPopup } from "@/components/OrderNotifications";

export function AdminNotificationsPanel() {
  const getFn = useServerFn(adminGetOrderNotificationSettings);
  const saveFn = useServerFn(adminUpdateOrderNotificationSettings);
  const logsFn = useServerFn(adminListNotificationAuditLogs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<any>(null);
  const [defaults, setDefaults] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    try { const r = await logsFn(); setLogs(r.logs); } catch (e: any) { /* silent */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getFn();
        setS(res.settings);
        setDefaults(res.defaults);
        await loadLogs();
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await loadLogs();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const reset = () => { if (defaults) setS({ ...defaults }); };

  const combinations =
    (s.first_names?.length ?? 0) *
    (s.last_initials?.length ?? 0) *
    (s.locations?.length ?? 0) *
    Math.max(s.fallback_products?.length ?? 0, 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card-glow rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">Order popup notifications</h3>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Enabled
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Unique combinations available: <span className="text-[color:var(--lime)] font-bold">{combinations.toLocaleString()}</span>.
            The frontend tracks the last <strong>{s.no_repeat_window}</strong> popups and never repeats a combo inside that window.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Initial delays (sec, comma)">
              <input className="np-input" value={(s.initial_delays ?? []).join(", ")} onChange={(e) => setNumList("initial_delays", e.target.value)} />
              <p className="np-hint">First popups after page load. Default: 15, 45, 60.</p>
            </Field>
            <Field label="Min interval (sec)">
              <input type="number" className="np-input" value={s.min_interval} onChange={(e) => set("min_interval", Number(e.target.value))} />
            </Field>
            <Field label="Max interval (sec)">
              <input type="number" className="np-input" value={s.max_interval} onChange={(e) => set("max_interval", Number(e.target.value))} />
            </Field>
            <Field label="“Last ordered” every Nth popup">
              <input type="number" className="np-input" value={s.recent_every} onChange={(e) => set("recent_every", Number(e.target.value))} />
            </Field>
            <Field label="Display time (ms)">
              <input type="number" className="np-input" value={s.display_ms} onChange={(e) => set("display_ms", Number(e.target.value))} />
            </Field>
            <Field label="Animation time (ms)">
              <input type="number" className="np-input" value={s.animation_ms} onChange={(e) => set("animation_ms", Number(e.target.value))} />
              <p className="np-hint">Ignored when visitor prefers reduced motion.</p>
            </Field>
            <Field label="No-repeat window (popups)">
              <input type="number" className="np-input" value={s.no_repeat_window} onChange={(e) => set("no_repeat_window", Number(e.target.value))} />
            </Field>
            <Field label="Recent minutes pool (comma)">
              <input className="np-input" value={(s.recent_minutes_pool ?? []).join(", ")} onChange={(e) => setNumList("recent_minutes_pool", e.target.value)} />
            </Field>
          </div>
        </div>

        <LivePreview settings={s} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-glow rounded-2xl p-6">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">First names ({s.first_names?.length ?? 0})</h4>
          <textarea className="np-input min-h-[200px] font-mono text-xs" value={(s.first_names ?? []).join("\n")} onChange={(e) => setList("first_names", e.target.value)} />
        </div>
        <div className="card-glow rounded-2xl p-6">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Last initials ({s.last_initials?.length ?? 0})</h4>
          <textarea className="np-input min-h-[200px] font-mono text-xs" value={(s.last_initials ?? []).join("\n")} onChange={(e) => setList("last_initials", e.target.value)} />
          <p className="np-hint">Period added automatically (M.)</p>
        </div>
        <div className="card-glow rounded-2xl p-6 md:col-span-2">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Locations ({s.locations?.length ?? 0})</h4>
          <p className="np-hint mb-2">One per line, format: <code>City | State | Country</code></p>
          <textarea className="np-input min-h-[200px] font-mono text-xs"
            value={(s.locations ?? []).map((l: any) => `${l.city} | ${l.state} | ${l.country}`).join("\n")}
            onChange={(e) => setLocations(e.target.value)} />
        </div>
        <div className="card-glow rounded-2xl p-6 md:col-span-2">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Fallback product names</h4>
          <textarea className="np-input min-h-[120px] font-mono text-xs" value={(s.fallback_products ?? []).join("\n")} onChange={(e) => setList("fallback_products", e.target.value)} />
          <p className="np-hint">Live popups pull real active products from the catalog. These are a backup.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={save} disabled={saving} className="btn-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save settings
        </button>
        <button onClick={reset} className="btn-outline-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2">
          <RotateCcw className="h-3 w-3" /> Reset to defaults
        </button>
      </div>

      <AuditLog logs={logs} onRefresh={loadLogs} />

      <style>{`
        .np-input { width:100%; border-radius:0.5rem; background: hsl(var(--input) / 0.6); border:1px solid hsl(var(--border)); padding:0.5rem 0.75rem; font-size: 0.875rem; color: hsl(var(--foreground)); }
        .np-hint { font-size: 0.7rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem; }
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

function LivePreview({ settings }: { settings: any }) {
  const [popup, setPopup] = useState<OrderPopup | null>(null);
  const idRef = useRef(0);
  const countRef = useRef(0);
  const recentRef = useRef<Set<string>>(new Set());
  const [auto, setAuto] = useState(false);

  const next = () => {
    countRef.current += 1;
    const p = buildUniquePopup(
      settings, settings.fallback_products ?? [],
      recentRef.current, settings.no_repeat_window || 250,
      idRef, countRef.current,
    );
    setPopup(p);
  };

  // initial sample
  useEffect(() => { next(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!auto) return;
    const interval = Math.max(1500, (settings.display_ms ?? 6000) - 500);
    const t = setInterval(next, interval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, settings.display_ms]);

  return (
    <div className="card-glow rounded-2xl p-5 space-y-3 self-start sticky top-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold uppercase tracking-widest text-sm">Live preview</h4>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-rotate
        </label>
      </div>
      <div className="min-h-[110px]">
        {popup ? <OrderPopupCard popup={popup} /> : <div className="text-xs text-muted-foreground">Click sample.</div>}
      </div>
      <button onClick={next} className="btn-outline-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">
        <Play className="h-3 w-3" /> New sample
      </button>
      <p className="text-[10px] text-muted-foreground">
        Sample #{countRef.current}. Every {settings.recent_every}rd popup uses the “last ordered” variant.
      </p>
    </div>
  );
}

function AuditLog({ logs, onRefresh }: { logs: any[]; onRefresh: () => void }) {
  return (
    <div className="card-glow rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-[color:var(--lime)]" /> Change history
        </h4>
        <button onClick={onRefresh} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
      </div>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
          {logs.map((l) => (
            <li key={l.id} className="rounded-xl border border-border/40 bg-background/40 p-3 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold">{l.user_email ?? "admin"}</span>
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(l.changed_keys ?? []).map((k: string) => (
                  <span key={k} className="rounded-full bg-[color:var(--magenta)]/20 text-[color:var(--magenta)] px-2 py-0.5 text-[10px] uppercase tracking-widest">{k}</span>
                ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Diff</summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] leading-relaxed">{JSON.stringify(l.diff, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
