import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders } from "@/lib/orders.functions";
import { money } from "@/lib/format";
import { LogOut, Package, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — Electric Pulse Emporium" }] }),
  component: Account,
});

function Account() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const fetchOrders = useServerFn(listMyOrders);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { nav({ to: "/login", replace: true }); return; }
      setUser(data.user);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setIsAdmin((roles ?? []).some((r: any) => r.role === "admin"));
    });
  }, [nav]);

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  if (!user) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>;

  const signOut = async () => { await supabase.auth.signOut(); toast.success("Signed out"); nav({ to: "/", replace: true }); };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <p className="text-xs uppercase tracking-widest text-[color:var(--lime)]">Account</p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-black break-all">{user.email}</h1>
        </div>
        <div className="flex gap-2">
          {isAdmin && <Link to="/admin" className="btn-outline-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5" />Admin</Link>}
          <button onClick={signOut} className="rounded-full border border-border px-5 py-2 text-xs uppercase tracking-widest hover:border-[color:var(--magenta)] inline-flex items-center gap-2"><LogOut className="h-3.5 w-3.5" />Sign out</button>
        </div>
      </header>

      <section className="card-glow rounded-2xl p-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-widest flex items-center gap-2 mb-4"><Package className="h-5 w-5 text-[color:var(--cyan)]" />Orders</h2>
        {!orders?.orders?.length && <p className="text-muted-foreground text-sm">No orders yet. <Link to="/shop" className="text-[color:var(--lime)] hover:underline">Start shopping →</Link></p>}
        <div className="space-y-2">
          {orders?.orders?.map((o: any) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/40 p-4">
              <div>
                <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0,8).toUpperCase()}</p>
                <p className="text-xs uppercase tracking-widest mt-1">
                  <span className={`rounded-full px-2 py-0.5 ${o.status === "paid" ? "bg-[color:var(--lime)]/20 text-[color:var(--lime)]" : "bg-muted text-muted-foreground"}`}>{o.status}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[color:var(--lime)]">{money(Number(o.total))}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
