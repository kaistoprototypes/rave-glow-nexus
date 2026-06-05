import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { yoycolListProductTemplates, yoycolPing } from "@/lib/yoycol.functions";
import { Loader2, Plug, Search } from "lucide-react";
import { toast } from "sonner";

export function YoycolPanel() {
  const pingFn = useServerFn(yoycolPing);
  const listFn = useServerFn(yoycolListProductTemplates);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const ping = useMutation({
    mutationFn: () => pingFn(),
    onSuccess: (r) => (r.ok ? toast.success("Yoycol connected") : toast.error(`Yoycol: ${r.msg} (${r.code})`)),
    onError: (e: any) => toast.error(e.message),
  });

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["yoycol-templates", keyword, page],
    queryFn: () => listFn({ data: { page, size: 20, keyword: keyword || undefined } }),
  });

  const records: any[] = (data?.data as any)?.records ?? (data?.data as any)?.list ?? [];

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-widest">Yoycol Print-On-Demand</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Connected via HMAC-signed OpenAPI v4. Secrets stored server-side.
            </p>
          </div>
          <button
            onClick={() => ping.mutate()}
            disabled={ping.isPending}
            className="btn-neon rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"
          >
            {ping.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3" />}
            Test connection
          </button>
        </div>
      </div>

      <div className="card-glow rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => { setPage(1); setKeyword(e.target.value); }}
              placeholder="Search product templates…"
              className="w-full rounded-full bg-input/60 border border-border pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <button onClick={() => refetch()} className="btn-outline-neon rounded-full px-4 py-2 text-xs">
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isFetching ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : records.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No product templates returned. Click Test connection to verify credentials.
          </p>
        ) : (
          <div className="grid gap-2">
            {records.map((r, i) => (
              <div key={r.id ?? r.spuCode ?? i} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 p-3 text-sm">
                <div className="min-w-0 flex items-center gap-3">
                  {r.coverImage || r.thumb ? (
                    <img src={r.coverImage ?? r.thumb} alt="" className="h-12 w-12 rounded-md object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.designName ?? r.name ?? r.title ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {(r.spuCode ?? r.spu_code ?? r.designCode ?? r.id) ?? ""}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.status ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={records.length < 20}
            className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
