import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminListShopifyWebhookEvents } from "@/lib/shopify-webhooks.functions";
import { CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";

const STATUS_FILTERS = ["all", "processed", "error", "received"] as const;

export function ShopifyWebhooksPanel() {
  const fn = useServerFn(adminListShopifyWebhookEvents);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-shopify-webhooks", status],
    queryFn: () => fn({ data: { status: status === "all" ? undefined : status, limit: 200 } }),
    refetchInterval: 10_000,
  });

  const events = data?.events ?? [];
  const s = data?.summary ?? { total: 0, processed: 0, error: 0, received: 0 };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total" value={s.total} />
        <Stat label="Processed" value={s.processed ?? 0} tone="ok" />
        <Stat label="Errors" value={s.error ?? 0} tone="err" />
        <Stat label="Pending" value={s.received ?? 0} tone="warn" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full glass p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                status === f ? "bg-[color:var(--lime)] text-black font-bold" : "text-foreground/70"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          className="btn-outline-neon rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="card-glow rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Topic</th>
              <th className="p-3">Shop</th>
              <th className="p-3">Webhook ID</th>
              <th className="p-3">Received</th>
              <th className="p-3">Processed</th>
              <th className="p-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!isLoading && events.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No webhook events yet. Trigger a test from Shopify Admin → Notifications → Webhooks → Send test notification.</td></tr>
            )}
            {events.map((e: any) => (
              <tr key={e.webhook_id} className="border-t border-border/30 align-top">
                <td className="p-3"><StatusBadge status={e.status} /></td>
                <td className="p-3 font-mono text-xs">{e.topic}</td>
                <td className="p-3 text-xs text-muted-foreground">{e.shop_domain ?? "—"}</td>
                <td className="p-3 font-mono text-[10px] text-muted-foreground break-all max-w-[200px]">{e.webhook_id}</td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.received_at).toLocaleString()}</td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{e.processed_at ? new Date(e.processed_at).toLocaleString() : "—"}</td>
                <td className="p-3 text-xs text-destructive max-w-xs break-words">{e.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "err" | "warn" }) {
  const color = tone === "ok"
    ? "text-[color:var(--lime)]"
    : tone === "err"
      ? "text-destructive"
      : tone === "warn"
        ? "text-[color:var(--magenta)]"
        : "text-foreground";
  return (
    <div className="card-glow rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "processed") return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--lime)]/20 text-[color:var(--lime)] px-2 py-0.5 text-[10px] font-bold uppercase"><CheckCircle2 className="h-3 w-3" />{status}</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-[10px] font-bold uppercase"><AlertTriangle className="h-3 w-3" />{status}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase"><Clock className="h-3 w-3" />{status}</span>;
}
